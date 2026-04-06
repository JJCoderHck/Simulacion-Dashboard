const ws = new WebSocket('ws://localhost:8765');

const status = document.getElementById("status");

ws.onopen = () => {
    status.textContent = "● CONECTADO";
    status.style.color = "lime";
};

ws.onclose = () => {
    status.textContent = "● DESCONECTADO";
    status.style.color = "red";
};

ws.onmessage = (event) => {
    const data = JSON.parse(event.data);

    document.getElementById("altitude").textContent = data.gps.altitude.toFixed(2) + " m";
    document.getElementById("temperature").textContent = data.env.temperature.toFixed(2) + " °C";
    document.getElementById("battery").textContent = data.battery.voltage.toFixed(2) + " V";
    document.getElementById("speed").textContent = data.descent_speed.toFixed(2) + " m/s";
    document.getElementById("phase").textContent = data.phase;
    document.getElementById("gps").textContent =
        data.gps.lat.toFixed(4) + ", " + data.gps.lon.toFixed(4);
};

function sendCommand(cmd) {
    ws.send(JSON.stringify({ command: cmd }));
}