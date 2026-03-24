# CanSat Data Specification
## WebSocket Interface — v1.0

---

## Overview

The simulator (and later the real backend) pushes live flight data to any
connected client over WebSocket. The dashboard connects once and receives
one JSON packet per second for the entire flight duration.

---

## Connection

| Property | Value |
|---|---|
| URL | `ws://localhost:8765` |
| Protocol | WebSocket (RFC 6455) |
| Message format | JSON text frames |
| Update rate | 1 Hz (1 packet per second) |
| Push direction | Server → Client |
| Commands | Client → Server (see Controls section) |

### Minimal connection (JavaScript)

```javascript
const ws = new WebSocket('ws://localhost:8765');

ws.onopen = () => {
    console.log('Connected');
};

ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    // all sensor data lives in here
};

ws.onclose = () => {
    setTimeout(() => reconnect(), 3000);
};
```

---

## Packet structure

One JSON object arrives per second. All fields are always present.

```json
{
  "timestamp": 124.5,
  "phase": "descent",
  "battery": {
    "voltage": 3.820
  },
  "imu": {
    "accel_x": 0.1240,
    "accel_y": -0.0300,
    "accel_z": 9.8100,
    "gyro_x": 0.0100,
    "gyro_y": 0.0000,
    "gyro_z": 0.0200,
    "mag_x": 24.100,
    "mag_y": 5.300,
    "mag_z": -18.200,
    "inclination_x": 2.100,
    "inclination_y": -0.500,
    "heading": 274.30
  },
  "env": {
    "temperature": 18.40,
    "humidity": 62.10,
    "pressure": 1013.20,
    "gas": 45231
  },
  "gps": {
    "lat": -12.0464000,
    "lon": -77.0428000,
    "altitude": 85.30,
    "speed": 3.20,
    "fix": true,
    "satellites": 8
  },
  "uv": {
    "intensity": 0.870
  },
  "descent_speed": 2.100,
  "sim_controls": {
    "running": true,
    "paused": false,
    "phase": "descent",
    "speed": 1.0,
    "elapsed": 124.5,
    "active_events": []
  }
}
```

---

## Field reference

### Root fields

| Field | Type | Unit | Range | Description |
|---|---|---|---|---|
| `timestamp` | float | seconds | 0 → ∞ | Elapsed mission time |
| `phase` | string | — | see phases | Current flight phase |
| `descent_speed` | float | m/s | -1 → 5 | Vertical speed (positive = falling) |

---

### battery

| Field | Type | Unit | Range | Description |
|---|---|---|---|---|
| `voltage` | float | V | 3.0 – 4.2 | LiPo cell voltage |

**Display thresholds:**
- > 3.8V → good
- 3.5 – 3.8V → warning
- < 3.5V → critical

---

### imu

| Field | Type | Unit | Range | Description |
|---|---|---|---|---|
| `accel_x` | float | m/s² | -50 – 50 | Acceleration X axis |
| `accel_y` | float | m/s² | -50 – 50 | Acceleration Y axis |
| `accel_z` | float | m/s² | -50 – 50 | Acceleration Z axis (gravity ~9.81 at rest) |
| `gyro_x` | float | °/s | -500 – 500 | Angular velocity X |
| `gyro_y` | float | °/s | -500 – 500 | Angular velocity Y |
| `gyro_z` | float | °/s | -500 – 500 | Angular velocity Z |
| `mag_x` | float | µT | -100 – 100 | Magnetic field X |
| `mag_y` | float | µT | -100 – 100 | Magnetic field Y |
| `mag_z` | float | µT | -100 – 100 | Magnetic field Z |
| `inclination_x` | float | degrees | -180 – 180 | Tilt around X axis **(mandatory)** |
| `inclination_y` | float | degrees | -180 – 180 | Tilt around Y axis **(mandatory)** |
| `heading` | float | degrees | 0 – 360 | Compass heading (0 = North) |

**Inclination thresholds:**
- |inclination| < 15° → normal
- 15° – 30° → warning
- > 30° → critical (risk of tipping on landing)

---

### env

| Field | Type | Unit | Range | Description |
|---|---|---|---|---|
| `temperature` | float | °C | -20 – 50 | Ambient temperature |
| `humidity` | float | % | 0 – 100 | Relative humidity |
| `pressure` | float | hPa | 900 – 1050 | Atmospheric pressure |
| `gas` | float | Ω | 0 – 500000 | VOC gas resistance (higher = cleaner air) |

---

### gps

| Field | Type | Unit | Range | Description |
|---|---|---|---|---|
| `lat` | float | degrees | -90 – 90 | Latitude **(mandatory)** |
| `lon` | float | degrees | -180 – 180 | Longitude **(mandatory)** |
| `altitude` | float | m | 0 – 200 | Altitude above sea level **(mandatory)** |
| `speed` | float | m/s | 0 – 20 | Ground speed |
| `fix` | boolean | — | true / false | GPS fix acquired |
| `satellites` | int | — | 0 – 12 | Satellites in view |

---

### uv

| Field | Type | Unit | Range | Description |
|---|---|---|---|---|
| `intensity` | float | mW/cm² | 0 – 5 | UV radiation intensity |

---

### sim_controls

**Only present in simulator packets. Not present in real backend.
Always check before using:**

```javascript
if (data.sim_controls) {
    // render simulator control panel
}
```

| Field | Type | Description |
|---|---|---|
| `running` | boolean | Simulation actively running |
| `paused` | boolean | Simulation paused |
| `phase` | string | Current phase name |
| `speed` | float | Playback speed multiplier |
| `elapsed` | float | Total elapsed simulation time in seconds |
| `active_events` | array | List of currently active injected events |

---

## Flight phases

| Value | Description | Typical duration |
|---|---|---|
| `pre_launch` | On ground, awaiting launch | Until manual start |
| `ascent` | Drone carrying CanSat to 100m | ~120 seconds |
| `freefall` | Drone releases CanSat | ~3 seconds |
| `descent` | Parachute deployed, descending | ~40 seconds |
| `detach` | Parachute detaches at ~5m altitude | ~2 seconds |
| `landing` | CanSat on ground, reporting status | Indefinite |

---

## Simulator control commands

Send JSON from the browser to control the simulator.

```javascript
ws.send(JSON.stringify({ command: 'start' }));
```

### Available commands

| Command | Extra field | Description |
|---|---|---|
| `start` | — | Begin simulation, advance to ascent |
| `pause` | — | Toggle pause / resume |
| `reset` | — | Return to pre_launch, clear all state |
| `set_phase` | `"phase": "descent"` | Jump to any phase immediately |
| `set_speed` | `"multiplier": 5` | Set playback speed (1, 2, 5, 10) |
| `inject_event` | `"event": "gps_lost"` | Inject a temporary edge case for 5 seconds |

### Injectable events

| Event | Effect | Duration |
|---|---|---|
| `gps_lost` | GPS fix = false, satellites = 0 | 5 seconds |
| `battery_low` | Voltage drops to ~3.51V | 5 seconds |
| `extreme_tilt` | Inclination X=45°, Y=-38° | 5 seconds |
| `landing_impact` | Large acceleration spike on all axes | 5 seconds |

---

## Video and audio

Video and audio do not come through WebSocket.
They come from the FPV receiver via USB video capture card,
accessed through the browser MediaDevices API.

```javascript
// List available devices (requires camera permission)
const devices = await navigator.mediaDevices.enumerateDevices();
const videoDevices = devices.filter(d => d.kind === 'videoinput');

// Connect to selected capture card
const stream = await navigator.mediaDevices.getUserMedia({
    video: { deviceId: { exact: selectedDeviceId } },
    audio: true,
});

videoElement.srcObject = stream;
videoElement.muted = false;
```

**During development:** use laptop webcam as substitute.
**At competition:** select the USB capture card device.

---

## Mandatory competition data

These fields must always be visible on the dashboard:

| Field | JSON path | Unit |
|---|---|---|
| Battery voltage | `battery.voltage` | V |
| Inclination X | `imu.inclination_x` | degrees |
| Inclination Y | `imu.inclination_y` | degrees |
| GPS latitude | `gps.lat` | degrees |
| GPS longitude | `gps.lon` | degrees |
| GPS altitude | `gps.altitude` | m |

---

## Switching from simulator to real backend

1. Stop `simulator.py`
2. Run `backend.py` instead
3. Refresh the browser

The dashboard requires zero changes.
`sim_controls` will no longer be present — handle gracefully as shown above.
