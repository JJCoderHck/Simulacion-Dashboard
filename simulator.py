"""
CanSat Flight Simulator
=======================
Simulates the full CanSat flight data pipeline over WebSocket.
Replaces this with backend.py once real hardware is ready.

Usage:
    pip install websockets
    python simulator.py

Then open: http://localhost:8080
"""

import asyncio
import websockets
import json
import math
import random
import time
import http.server
import threading
import os

# ─────────────────────────────────────────
# Configuration
# ─────────────────────────────────────────
WS_PORT = 8765
HTTP_PORT = 8080
UPDATE_RATE = 1.0  # seconds between packets (real time)

# Competition location — Lima, Peru (change to your actual site)
BASE_LAT = -12.0464
BASE_LON = -77.0428
GROUND_TEMP = 20.0
GROUND_PRESSURE = 1013.25

# ─────────────────────────────────────────
# Simulator state
# ─────────────────────────────────────────
state = {
    "running": False,
    "paused": False,
    "phase": "pre_launch",
    "elapsed": 0.0,
    "speed": 1.0,
    "events": [],  # injected events queue
}

# Phase durations in seconds (at 1x speed)
PHASES = {
    "pre_launch": None,       # manual trigger only
    "ascent": 120,            # 0 → 100m in 120s (~0.83 m/s)
    "freefall": 3,            # brief drop after drone releases
    "descent": 40,            # 80m → 0m at ~2 m/s
    "detach": 2,              # parachute detaches at ~5m
    "landing": None,          # indefinite
}

PHASE_ORDER = ["pre_launch", "ascent", "freefall", "descent", "detach", "landing"]

phase_start_time = 0.0
phase_elapsed = 0.0

# ─────────────────────────────────────────
# Physics helpers
# ─────────────────────────────────────────
def noise(sigma):
    return random.gauss(0, sigma)

def altitude_from_pressure(pressure):
    """Barometric formula: altitude in meters from pressure in hPa"""
    return 44330 * (1 - (pressure / GROUND_PRESSURE) ** (1 / 5.255))

def pressure_from_altitude(alt):
    """Inverse barometric formula"""
    return GROUND_PRESSURE * ((1 - alt / 44330) ** 5.255)

def get_altitude():
    p = state["phase"]
    t = phase_elapsed

    if p == "pre_launch":
        return 0.0
    elif p == "ascent":
        duration = PHASES["ascent"]
        return min(100.0, (t / duration) * 100.0)
    elif p == "freefall":
        return 100.0 - (t * 5.0)  # fast drop
    elif p == "descent":
        duration = PHASES["descent"]
        start_alt = 80.0
        return max(5.0, start_alt - (t / duration) * start_alt)
    elif p == "detach":
        return max(0.0, 5.0 - (t * 2.5))
    elif p == "landing":
        return 0.0
    return 0.0

def get_descent_speed():
    p = state["phase"]
    if p == "ascent":
        return -0.83  # rising
    elif p == "freefall":
        return 5.0    # fast fall
    elif p == "descent":
        return 2.0 + noise(0.1)
    elif p == "detach":
        return 2.5 + noise(0.2)
    elif p == "landing":
        return 0.0
    return 0.0

def get_acceleration():
    p = state["phase"]
    t = phase_elapsed
    base_z = 9.81

    if p == "freefall" and t < 0.5:
        # Release spike
        spike = 15.0 * math.exp(-t * 10)
        return noise(0.05), noise(0.05), base_z + spike
    elif p == "detach" and t < 0.3:
        # Parachute detach jerk
        spike = 8.0 * math.exp(-t * 15)
        return noise(0.1), noise(0.1), base_z + spike
    elif p == "landing" and phase_elapsed < 0.5:
        # Landing impact
        impact = 25.0 * math.exp(-phase_elapsed * 20)
        return noise(0.3), noise(0.3), base_z + impact
    elif p == "descent":
        # Pendulum oscillation under parachute
        osc = 0.8 * math.sin(phase_elapsed * 0.8)
        return osc + noise(0.05), noise(0.05), base_z + noise(0.1)
    else:
        return noise(0.02), noise(0.02), base_z + noise(0.05)

def get_gyro():
    p = state["phase"]
    if p == "descent":
        # Slow rotation under parachute
        return (
            0.3 * math.sin(phase_elapsed * 0.5) + noise(0.02),
            0.2 * math.cos(phase_elapsed * 0.4) + noise(0.02),
            0.1 * math.sin(phase_elapsed * 0.3) + noise(0.01),
        )
    elif p in ["freefall", "detach"]:
        return noise(0.5), noise(0.5), noise(0.3)
    elif p == "landing":
        return noise(0.01), noise(0.01), noise(0.01)
    else:
        return noise(0.01), noise(0.01), noise(0.01)

def get_inclination():
    p = state["phase"]
    if p == "descent":
        # Gentle swinging
        ix = 5.0 * math.sin(phase_elapsed * 0.6) + noise(0.1)
        iy = 3.0 * math.cos(phase_elapsed * 0.5) + noise(0.1)
        return ix, iy
    elif p == "landing":
        # Final resting angle — slightly tilted
        return 3.2 + noise(0.05), -1.8 + noise(0.05)
    elif p == "freefall":
        return noise(2.0), noise(2.0)
    else:
        return noise(0.1), noise(0.1)

def get_magnetometer():
    # Lima magnetic field approximation
    base_x, base_y, base_z = 24.1, 5.3, -18.2
    return (
        base_x + noise(0.5),
        base_y + noise(0.5),
        base_z + noise(0.5),
    )

def get_heading():
    # Slowly drifting heading
    base = 274.3
    drift = phase_elapsed * 0.05
    return (base + drift + noise(0.5)) % 360

def get_gps(altitude):
    p = state["phase"]
    # GPS fix lost briefly at landing impact
    if p == "landing" and phase_elapsed < 2.0:
        fix = False
        sats = random.randint(3, 5)
    elif p == "pre_launch" and state["elapsed"] < 10.0:
        fix = False
        sats = random.randint(0, 4)
    else:
        fix = True
        sats = random.randint(7, 12)

    # Slight GPS drift
    lat = BASE_LAT + noise(0.000005)
    lon = BASE_LON + noise(0.000005)

    return {
        "lat": round(lat, 7),
        "lon": round(lon, 7),
        "altitude": round(altitude + noise(0.3), 2),
        "speed": round(get_descent_speed() + noise(0.05), 2),
        "fix": fix,
        "satellites": sats,
    }

def get_environment(altitude):
    # Temperature: lapse rate ~6.5°C per 1000m
    temp = GROUND_TEMP - (altitude * 0.0065) + noise(0.1)
    # Humidity increases slightly with altitude
    humidity = 62.0 + (altitude * 0.02) + noise(0.3)
    # Pressure from altitude
    pressure = pressure_from_altitude(altitude) + noise(0.1)
    # Gas resistance — VOC (decreases with altitude, less pollution)
    gas = max(10000, 45000 - altitude * 100 + noise(500))

    return {
        "temperature": round(temp, 2),
        "humidity": round(min(100, humidity), 2),
        "pressure": round(pressure, 2),
        "gas": round(gas, 0),
    }

def get_battery():
    # Slowly drains from 4.2V → ~3.7V over full mission
    total_elapsed = state["elapsed"]
    drain = total_elapsed * 0.0008
    voltage = max(3.5, 4.2 - drain + noise(0.005))

    # Check injected event
    if "battery_low" in state["events"]:
        voltage = 3.51 + noise(0.01)

    return round(voltage, 3)

def get_uv(altitude):
    # UV increases with altitude (less atmosphere to filter)
    base_uv = 0.5
    altitude_boost = altitude * 0.003
    uv = base_uv + altitude_boost + noise(0.02)

    # No UV at night / ground
    if state["phase"] == "pre_launch":
        uv = 0.3 + noise(0.01)

    return round(max(0, uv), 3)

# ─────────────────────────────────────────
# Packet builder
# ─────────────────────────────────────────
def build_packet():
    altitude = get_altitude() + noise(0.2)
    altitude = max(0, altitude)

    accel_x, accel_y, accel_z = get_acceleration()
    gyro_x, gyro_y, gyro_z = get_gyro()
    mag_x, mag_y, mag_z = get_magnetometer()
    inc_x, inc_y = get_inclination()

    # Inject extreme tilt event
    if "extreme_tilt" in state["events"]:
        inc_x = 45.0 + noise(1.0)
        inc_y = -38.0 + noise(1.0)

    # Inject GPS loss event
    gps_data = get_gps(altitude)
    if "gps_lost" in state["events"]:
        gps_data["fix"] = False
        gps_data["satellites"] = 0

    return {
        "timestamp": round(state["elapsed"], 2),
        "phase": state["phase"],
        "battery": {
            "voltage": get_battery()
        },
        "imu": {
            "accel_x": round(accel_x, 4),
            "accel_y": round(accel_y, 4),
            "accel_z": round(accel_z, 4),
            "gyro_x": round(gyro_x, 4),
            "gyro_y": round(gyro_y, 4),
            "gyro_z": round(gyro_z, 4),
            "mag_x": round(mag_x, 3),
            "mag_y": round(mag_y, 3),
            "mag_z": round(mag_z, 3),
            "inclination_x": round(inc_x, 3),
            "inclination_y": round(inc_y, 3),
            "heading": round(get_heading(), 2),
        },
        "env": get_environment(altitude),
        "gps": gps_data,
        "uv": {
            "intensity": get_uv(altitude)
        },
        "descent_speed": round(get_descent_speed(), 3),
    }

# ─────────────────────────────────────────
# Phase management
# ─────────────────────────────────────────
def advance_phase():
    global phase_elapsed, phase_start_time
    current_index = PHASE_ORDER.index(state["phase"])
    if current_index < len(PHASE_ORDER) - 1:
        state["phase"] = PHASE_ORDER[current_index + 1]
        phase_elapsed = 0.0
        phase_start_time = time.time()
        print(f"[SIM] Phase → {state['phase']}")

def set_phase(phase_name):
    global phase_elapsed, phase_start_time
    if phase_name in PHASE_ORDER:
        state["phase"] = phase_name
        phase_elapsed = 0.0
        phase_start_time = time.time()
        print(f"[SIM] Phase set to: {phase_name}")

# ─────────────────────────────────────────
# Command handler
# ─────────────────────────────────────────
def handle_command(raw):
    global phase_elapsed
    try:
        cmd = json.loads(raw)
        command = cmd.get("command")

        if command == "start":
            state["running"] = True
            state["paused"] = False
            if state["phase"] == "pre_launch":
                advance_phase()
            print("[SIM] Started")

        elif command == "pause":
            state["paused"] = not state["paused"]
            print(f"[SIM] {'Paused' if state['paused'] else 'Resumed'}")

        elif command == "reset":
            state["running"] = False
            state["paused"] = False
            state["elapsed"] = 0.0
            state["events"] = []
            set_phase("pre_launch")
            print("[SIM] Reset")

        elif command == "set_phase":
            set_phase(cmd.get("phase", "pre_launch"))

        elif command == "set_speed":
            state["speed"] = float(cmd.get("multiplier", 1.0))
            print(f"[SIM] Speed: {state['speed']}x")

        elif command == "inject_event":
            event = cmd.get("event")
            if event not in state["events"]:
                state["events"].append(event)
            # Auto-clear events after 5 seconds
            async def clear_event():
                await asyncio.sleep(5)
                if event in state["events"]:
                    state["events"].remove(event)
            asyncio.create_task(clear_event())
            print(f"[SIM] Event injected: {event}")

    except Exception as e:
        print(f"[SIM] Command error: {e}")

# ─────────────────────────────────────────
# WebSocket handler
# ─────────────────────────────────────────
connected_clients = set()

async def ws_handler(websocket):
    global phase_elapsed
    connected_clients.add(websocket)
    print(f"[WS] Client connected. Total: {len(connected_clients)}")

    try:
        async for message in websocket:
            handle_command(message)
    except websockets.exceptions.ConnectionClosed:
        pass
    finally:
        connected_clients.discard(websocket)
        print(f"[WS] Client disconnected. Total: {len(connected_clients)}")

async def broadcast_loop():
    global phase_elapsed
    last_time = time.time()

    while True:
        await asyncio.sleep(UPDATE_RATE / max(state["speed"], 0.1))

        now = time.time()
        dt = (now - last_time) * state["speed"]
        last_time = now

        if state["running"] and not state["paused"]:
            state["elapsed"] += dt
            phase_elapsed += dt

            # Auto-advance phases
            phase_duration = PHASES.get(state["phase"])
            if phase_duration and phase_elapsed >= phase_duration:
                advance_phase()

        # Always send packets (even when paused — so dashboard stays alive)
        if connected_clients:
            packet = build_packet()
            packet["sim_controls"] = {
                "running": state["running"],
                "paused": state["paused"],
                "phase": state["phase"],
                "speed": state["speed"],
                "elapsed": round(state["elapsed"], 1),
                "active_events": state["events"],
            }
            message = json.dumps(packet)
            await asyncio.gather(
                *[client.send(message) for client in connected_clients],
                return_exceptions=True
            )

# ─────────────────────────────────────────
# HTTP server (serves dashboard files)
# ─────────────────────────────────────────
class SilentHTTPHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        pass  # suppress request logs

    def do_GET(self):
        # Serve landing.html at root
        if self.path == "/" or self.path == "":
            self.path = "/landing.html"
        return super().do_GET()

def run_http_server():
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    server = http.server.HTTPServer(("0.0.0.0", HTTP_PORT), SilentHTTPHandler)
    server.serve_forever()

# ─────────────────────────────────────────
# Main
# ─────────────────────────────────────────
async def main():
    print("=" * 50)
    print("  CanSat Flight Simulator")
    print("=" * 50)
    print(f"  WebSocket : ws://localhost:{WS_PORT}")
    print(f"  Dashboard : http://localhost:{HTTP_PORT}")
    print("=" * 50)
    print("  Open the dashboard URL in your browser")
    print("=" * 50)

    # Start HTTP server in background thread
    http_thread = threading.Thread(target=run_http_server, daemon=True)
    http_thread.start()

    # Start WebSocket server + broadcast loop
    async with websockets.serve(ws_handler, "0.0.0.0", WS_PORT):
        await broadcast_loop()

if __name__ == "__main__":
    asyncio.run(main())
