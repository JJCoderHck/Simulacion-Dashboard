# CanSat Ground Station — Simulator

Flight data simulator for CanSat competition dashboard development.

The simulator generates realistic flight data and serves it over WebSocket.
The web developer connects their own dashboard to it and builds freely.
When real hardware is ready, the simulator is replaced with the real backend —
the dashboard requires zero changes.

---

## Quick start

### 1. Install Python dependency

```bash
pip install websockets
```

### 2. Run the simulator

```bash
python simulator.py
```

You will see:
```
==================================================
  CanSat Flight Simulator
==================================================
  WebSocket : ws://localhost:8765
  Dashboard : http://localhost:8080
==================================================
```

### 3. Verify it works

Open your browser, press F12, go to the Console tab and paste:

```javascript
const ws = new WebSocket('ws://localhost:8765');
ws.onmessage = (e) => console.log(JSON.parse(e.data));
```

You will see one JSON object printed every second.

### 4. Start the flight

In the same console:

```javascript
ws.send(JSON.stringify({ command: 'start' }));
```

Watch the data change as the flight progresses through phases.

---

## Project structure

```
cansat-dashboard/
├── simulator.py     — Flight simulator (run during development)
├── backend.py       — Real hardware backend (run at competition)
├── data_spec.md     — Full data format and field documentation
└── README.md        — This file
```

The web developer creates their own dashboard files separately.
They connect to `ws://localhost:8765` from whatever HTML/JS they build.

---

## Controlling the simulator

All commands are sent as JSON over the WebSocket connection.

### From the browser console

```javascript
// Start the flight
ws.send(JSON.stringify({ command: 'start' }));

// Jump to a specific phase
ws.send(JSON.stringify({ command: 'set_phase', phase: 'descent' }));

// Speed up playback
ws.send(JSON.stringify({ command: 'set_speed', multiplier: 5 }));

// Pause
ws.send(JSON.stringify({ command: 'pause' }));

// Reset to pre-launch
ws.send(JSON.stringify({ command: 'reset' }));
```

### Injecting edge cases (for testing)

```javascript
// GPS signal lost
ws.send(JSON.stringify({ command: 'inject_event', event: 'gps_lost' }));

// Battery critically low
ws.send(JSON.stringify({ command: 'inject_event', event: 'battery_low' }));

// Extreme tilt (satellite about to tip)
ws.send(JSON.stringify({ command: 'inject_event', event: 'extreme_tilt' }));

// Landing impact spike
ws.send(JSON.stringify({ command: 'inject_event', event: 'landing_impact' }));
```

Each injected event lasts 5 seconds then clears automatically.

---

## Flight phases

The simulator models the full mission automatically:

| Phase | What happens | Duration |
|---|---|---|
| `pre_launch` | Idle on ground, GPS acquiring | Until `start` command |
| `ascent` | Drone carries CanSat to 100m | ~120 seconds |
| `freefall` | Drone releases, brief drop | ~3 seconds |
| `descent` | Parachute deployed, 80m → 5m | ~40 seconds |
| `detach` | Parachute detaches at ~5m | ~2 seconds |
| `landing` | On ground, reporting status | Indefinite |

Phases advance automatically based on elapsed time.
Use `set_phase` to jump to any phase instantly for testing.

---

## Data format

See `data_spec.md` for the complete field reference.

Quick summary — after receiving a packet:

```javascript
ws.onmessage = (event) => {
    const data = JSON.parse(event.data);

    data.battery.voltage        // 3.82 V
    data.gps.altitude           // 85.3 m
    data.gps.lat                // -12.0464
    data.gps.lon                // -77.0428
    data.gps.fix                // true / false
    data.imu.inclination_x      // 2.1 degrees
    data.imu.inclination_y      // -0.5 degrees
    data.imu.heading            // 274.3 degrees
    data.imu.accel_x            // 0.12 m/s²
    data.env.temperature        // 18.4 °C
    data.env.humidity           // 62.1 %
    data.env.pressure           // 1013.2 hPa
    data.uv.intensity           // 0.87 mW/cm²
    data.descent_speed          // 2.1 m/s
    data.phase                  // "descent"
    data.timestamp              // 124.5 seconds

    // Only present in simulator packets — not in real backend
    data.sim_controls.running   // true / false
    data.sim_controls.paused    // true / false
    data.sim_controls.elapsed   // 124.5 seconds
};
```

---

## Video and audio

Video and audio are separate from WebSocket entirely.
They come from the FPV receiver via a USB video capture card,
accessed through the browser MediaDevices API.

See `data_spec.md` for the implementation details.

During development, use the laptop webcam as a substitute.

---

## Switching to real hardware

When hardware is ready:

1. Stop `simulator.py`
2. Run `backend.py` instead
3. Refresh the browser

The dashboard requires zero changes. The `sim_controls` field
will no longer appear in packets — handle this gracefully:

```javascript
if (data.sim_controls) {
    // show simulator controls
}
```

---

## Competition checklist

- [ ] Ground Arduino plugged into USB
- [ ] `backend.py` running
- [ ] Dashboard open in browser
- [ ] USB capture card connected to RX5808
- [ ] Video source selected in dashboard
- [ ] GPS fix confirmed
- [ ] Battery voltage nominal (> 3.8V)
- [ ] All sensor values updating at 1Hz
