// ====================================================
// CanSat Dashboard WebSocket Handler
// ====================================================

// Global variables for WebSocket connection
let ws = null;
let altitudeChart = null;
let temperatureChart = null;
const maxDataPoints = 60; // Keep last 60 seconds of data

// ====================================================
// Initialize charts once when script loads
// ====================================================
function initializeCharts() {
    const altitudeCtx = document.getElementById('altitudeChart');
    const temperatureCtx = document.getElementById('temperatureChart');

    if (!altitudeCtx || !temperatureCtx) {
        console.error('Chart canvas elements not found');
        return;
    }

    altitudeChart = new Chart(altitudeCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Altitud (m)',
                data: [],
                borderColor: '#00ff7f',
                backgroundColor: 'rgba(0, 255, 127, 0.1)',
                tension: 0.1,
                fill: true,
                pointRadius: 2,
                pointHoverRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: true,
                    labels: {
                        color: '#e0e0e0'
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: '#e0e0e0'
                    },
                    grid: {
                        color: '#333333'
                    }
                },
                x: {
                    ticks: {
                        color: '#e0e0e0'
                    },
                    grid: {
                        color: '#333333'
                    }
                }
            }
        }
    });

    temperatureChart = new Chart(temperatureCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Temperatura (°C)',
                data: [],
                borderColor: '#ff4444',
                backgroundColor: 'rgba(255, 68, 68, 0.1)',
                tension: 0.1,
                fill: true,
                pointRadius: 2,
                pointHoverRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: true,
                    labels: {
                        color: '#e0e0e0'
                    }
                }
            },
            scales: {
                y: {
                    ticks: {
                        color: '#e0e0e0'
                    },
                    grid: {
                        color: '#333333'
                    }
                },
                x: {
                    ticks: {
                        color: '#e0e0e0'
                    },
                    grid: {
                        color: '#333333'
                    }
                }
            }
        }
    });
}

// ====================================================
// Add data point to chart with max limit
// ====================================================
function addChartData(chart, label, value) {
    if (!chart) return;
    
    chart.data.labels.push(label);
    chart.data.datasets[0].data.push(value);

    // Keep only the last maxDataPoints
    if (chart.data.labels.length > maxDataPoints) {
        chart.data.labels.shift();
        chart.data.datasets[0].data.shift();
    }

    chart.update('none'); // Update without animation for smoothness
}

// ====================================================
// Connect to WebSocket
// ====================================================
function connectWebSocket() {
    const status = document.getElementById("status");

    try {
        ws = new WebSocket('ws://127.0.0.1:8765');

        ws.onopen = () => {
            console.log('✓ WebSocket Connected');
            status.textContent = "● CONECTADO";
            status.style.color = "#00ff7f";
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                updateDashboard(data);
            } catch (error) {
                console.error('Error parsing message:', error);
            }
        };

        ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            status.textContent = "● ERROR";
            status.style.color = "#ff6666";
        };

        ws.onclose = () => {
            console.log('WebSocket disconnected, retrying...');
            status.textContent = "● DESCONECTADO";
            status.style.color = "#ff4444";
            
            // Attempt to reconnect after 3 seconds
            setTimeout(connectWebSocket, 3000);
        };
    } catch (error) {
        console.error('Failed to create WebSocket:', error);
        setTimeout(connectWebSocket, 3000);
    }
}

// ====================================================
// Update dashboard with received data
// ====================================================
function updateDashboard(data) {
    // Mandatory fields (per data_spec.md)
    if (data.battery && data.battery.voltage) {
        const voltage = data.battery.voltage.toFixed(2);
        document.getElementById("battery").textContent = voltage + " V";
        
        // Color code battery based on thresholds
        const batteryEl = document.getElementById("battery");
        if (data.battery.voltage > 3.8) {
            batteryEl.style.color = "#00ff7f";
        } else if (data.battery.voltage >= 3.5) {
            batteryEl.style.color = "#ffaa00";
        } else {
            batteryEl.style.color = "#ff4444";
        }
    }

    if (data.imu && data.imu.inclination_x !== undefined) {
        const incX = data.imu.inclination_x.toFixed(2);
        document.getElementById("inclinationX").textContent = incX + "°";
        
        // Color code inclination
        const incXEl = document.getElementById("inclinationX");
        const absIncX = Math.abs(data.imu.inclination_x);
        if (absIncX < 15) {
            incXEl.style.color = "#00ff7f";
        } else if (absIncX < 30) {
            incXEl.style.color = "#ffaa00";
        } else {
            incXEl.style.color = "#ff4444";
        }
        
        // Update bar
        const barX = document.getElementById("bar-inclX");
        if (barX) {
            let width = 50 + (data.imu.inclination_x / 180 * 50); // -180 to 180 maps to 0 to 100%
            width = Math.max(0, Math.min(100, width));
            barX.style.width = width + "%";
        }
    }

    if (data.imu && data.imu.inclination_y !== undefined) {
        const incY = data.imu.inclination_y.toFixed(2);
        document.getElementById("inclinationY").textContent = incY + "°";
        
        // Color code inclination
        const incYEl = document.getElementById("inclinationY");
        const absIncY = Math.abs(data.imu.inclination_y);
        if (absIncY < 15) {
            incYEl.style.color = "#00ff7f";
        } else if (absIncY < 30) {
            incYEl.style.color = "#ffaa00";
        } else {
            incYEl.style.color = "#ff4444";
        }
        
        // Update bar
        const barY = document.getElementById("bar-inclY");
        if (barY) {
            let width = 50 + (data.imu.inclination_y / 180 * 50);
            width = Math.max(0, Math.min(100, width));
            barY.style.width = width + "%";
        }
    }

    if (data.gps) {
        if (data.gps.altitude !== undefined) {
            const altStr = data.gps.altitude.toFixed(2);
            document.getElementById("altitude").textContent = altStr + " m";
            const mapAlt = document.getElementById("map-alt");
            if(mapAlt) mapAlt.textContent = altStr;
        }
        if (data.gps.lat !== undefined && data.gps.lon !== undefined) {
            const gpsStr = data.gps.lat.toFixed(4) + ", " + data.gps.lon.toFixed(4);
            const gpsEl = document.getElementById("gps");
            if (gpsEl) gpsEl.textContent = gpsStr;
            const mapGps = document.getElementById("map-gps");
            if (mapGps) mapGps.textContent = gpsStr;
        }
    }

    // Additional fields
    if (data.env) {
        if (data.env.temperature !== undefined) {
            const tempEl = document.getElementById("temperature");
            if (tempEl) tempEl.textContent = data.env.temperature.toFixed(2) + " °C";
        }
        if (data.env.humidity !== undefined) {
            const humEl = document.getElementById("humidity");
            if (humEl) humEl.textContent = data.env.humidity.toFixed(1) + " %";
        }
        if (data.env.pressure !== undefined) {
            const pressEl = document.getElementById("pressure");
            if (pressEl) pressEl.textContent = data.env.pressure.toFixed(2) + " hPa";
        }
    }

    if (data.phase) {
        const phaseEl = document.getElementById("phase");
        if (phaseEl) phaseEl.textContent = data.phase;
    }

    if (data.descent_speed !== undefined) {
        const speedEl = document.getElementById("speed");
        if (speedEl) speedEl.textContent = data.descent_speed.toFixed(2) + " m/s";
    }

    if (data.timestamp !== undefined) {
        const tsStr = data.timestamp.toFixed(1);
        const timestampEl = document.getElementById("timestamp");
        if (timestampEl) timestampEl.textContent = tsStr + " s";
        
        const camTimestamp = document.getElementById("cam-timestamp");
        if (camTimestamp) {
            const secs = Math.floor(data.timestamp);
            const m = Math.floor(secs / 60).toString().padStart(2, '0');
            const s = (secs % 60).toString().padStart(2, '0');
            camTimestamp.textContent = `00:${m}:${s}`;
        }
    }

    if (data.gps && data.gps.satellites !== undefined) {
        const satEl = document.getElementById("satellites");
        if (satEl) satEl.textContent = data.gps.satellites;
    }

    // Terminal
    const term = document.getElementById("telemetry-terminal");
    if (term) {
        const rawStr = JSON.stringify(data);
        term.innerHTML += "> " + rawStr + "<br>";
        term.scrollTop = term.scrollHeight;
    }

    // Update charts
    const timeLabel = data.timestamp ? data.timestamp.toFixed(1) + "s" : new Date().toLocaleTimeString();
    
    if (data.gps && data.gps.altitude !== undefined) {
        addChartData(altitudeChart, timeLabel, data.gps.altitude);
    }

    if (data.env && data.env.temperature !== undefined) {
        addChartData(temperatureChart, timeLabel, data.env.temperature);
    }
}

// ====================================================
// Send command to simulator
// ====================================================
function sendCommand(cmd) {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
        console.warn('WebSocket not connected');
        return;
    }

    const command = { command: cmd };
    ws.send(JSON.stringify(command));
    console.log('Command sent:', cmd);
}

// ====================================================
// Initialize on page load
// ====================================================
document.addEventListener('DOMContentLoaded', () => {
    console.log('Dashboard loading...');
    initializeCharts();
    initOrbitalMap();
    initCameraSimulation();
    connectWebSocket();
});

// ====================================================
// Camera Live Feed Simulation
// ====================================================
let cameraCanvas, cameraCtx;
let camSimTime = 0;

function initCameraSimulation() {
    cameraCanvas = document.getElementById('cameraFeedCanvas');
    if (!cameraCanvas) return;
    
    cameraCtx = cameraCanvas.getContext('2d');
    
    function resize() {
        const parent = cameraCanvas.parentElement;
        cameraCanvas.width = parent.clientWidth;
        cameraCanvas.height = parent.clientHeight;
    }
    
    window.addEventListener('resize', resize);
    resize();
    
    requestAnimationFrame(renderCamera);
}

function renderCamera() {
    if (!cameraCtx || !cameraCanvas.width) {
        requestAnimationFrame(renderCamera);
        return;
    }
    
    const w = cameraCanvas.width;
    const h = cameraCanvas.height;
    const cx = w / 2;
    const cy = h / 2;
    
    // 1. Background (Sensor base)
    cameraCtx.fillStyle = '#0a0a0c';
    cameraCtx.fillRect(0, 0, w, h);
    
    // 2. Simulated Moving Ground (Descent / Wind drift)
    cameraCtx.strokeStyle = 'rgba(90, 122, 153, 0.15)';
    cameraCtx.lineWidth = 1;
    
    const gridSize = 60;
    // Calculate movement based on simulated time
    const driftX = (Math.sin(camSimTime * 0.005) * 50) % gridSize;
    const descentY = (camSimTime * 0.8) % gridSize; 
    
    cameraCtx.beginPath();
    for (let x = -gridSize; x < w + gridSize; x += gridSize) {
        cameraCtx.moveTo(x - driftX, 0);
        cameraCtx.lineTo(x - driftX, h);
    }
    for (let y = -gridSize; y < h + gridSize; y += gridSize) {
        cameraCtx.moveTo(0, y + descentY);
        cameraCtx.lineTo(w, y + descentY);
    }
    cameraCtx.stroke();
    
    // 3. Ground anomalies / Distant shapes
    cameraCtx.fillStyle = 'rgba(90, 122, 153, 0.05)';
    cameraCtx.strokeStyle = 'rgba(90, 122, 153, 0.15)';
    
    for (let i = 0; i < 6; i++) {
        // Pseudo-random moving shapes based on simTime
        const shapeX = ((Math.sin(i * 99 + camSimTime * 0.002) + 1) / 2) * w;
        const shapeY = (h + (i * 200) - (camSimTime * 0.8)) % (h + 100);
        const size = 40 + (i * 15);
        cameraCtx.fillRect(shapeX, shapeY - 50, size, size);
        cameraCtx.strokeRect(shapeX, shapeY - 50, size, size);
    }
    
    // 4. Interface HUD (Heads-up Display)
    cameraCtx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    cameraCtx.lineWidth = 1.5;
    
    // Focus crosshair
    cameraCtx.beginPath();
    cameraCtx.moveTo(cx - 30, cy);
    cameraCtx.lineTo(cx + 30, cy);
    cameraCtx.moveTo(cx, cy - 30);
    cameraCtx.lineTo(cx, cy + 30);
    cameraCtx.stroke();
    
    // Targeting Brackets
    const br = 60;
    const bs = 15;
    cameraCtx.beginPath();
    // Top Left
    cameraCtx.moveTo(cx - br, cy - br + bs); cameraCtx.lineTo(cx - br, cy - br); cameraCtx.lineTo(cx - br + bs, cy - br);
    // Top Right
    cameraCtx.moveTo(cx + br - bs, cy - br); cameraCtx.lineTo(cx + br, cy - br); cameraCtx.lineTo(cx + br, cy - br + bs);
    // Bottom Left
    cameraCtx.moveTo(cx - br, cy + br - bs); cameraCtx.lineTo(cx - br, cy + br); cameraCtx.lineTo(cx - br + bs, cy + br);
    // Bottom Right
    cameraCtx.moveTo(cx + br - bs, cy + br); cameraCtx.lineTo(cx + br, cy + br); cameraCtx.lineTo(cx + br, cy + br - bs);
    cameraCtx.stroke();
    
    // 5. Artificial pitch/roll ladder swaying with wind
    cameraCtx.strokeStyle = 'rgba(0, 255, 127, 0.4)';
    const pitchOffset = Math.sin(camSimTime * 0.01) * 30;
    const rollAngle = Math.cos(camSimTime * 0.005) * 0.1;
    
    cameraCtx.save();
    cameraCtx.translate(cx, cy);
    cameraCtx.rotate(rollAngle);
    
    for(let i = -3; i <= 3; i++) {
        if(i === 0) continue;
        let pY = pitchOffset + (i * 40);
        cameraCtx.beginPath();
        cameraCtx.moveTo(-40, pY); cameraCtx.lineTo(-15, pY);
        cameraCtx.moveTo(15, pY); cameraCtx.lineTo(40, pY);
        cameraCtx.stroke();
        
        cameraCtx.fillStyle = 'rgba(0, 255, 127, 0.6)';
        cameraCtx.font = '10px Courier New';
        cameraCtx.fillText(Math.abs(i * 10), 45, pY + 3);
    }
    cameraCtx.restore();
    
    // 6. Camera Glitch / Scanline effect
    cameraCtx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    cameraCtx.fillRect(0, (camSimTime * 3) % h, w, 15);
    
    // Subtle static
    cameraCtx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    for(let i = 0; i < 40; i++) {
        cameraCtx.fillRect(Math.random() * w, Math.random() * h, 1.5, 1.5);
    }
    
    // 7. REC Blinker Overlay
    if (Math.floor(camSimTime / 30) % 2 === 0) {
        cameraCtx.fillStyle = '#ff4444';
        cameraCtx.beginPath();
        cameraCtx.arc(30, 30, 6, 0, Math.PI * 2);
        cameraCtx.fill();
        cameraCtx.font = 'bold 12px Roboto';
        cameraCtx.fillText('REC', 45, 34);
    }
    
    // Technical Texts
    cameraCtx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    cameraCtx.font = '11px Courier New';
    cameraCtx.fillText('CAM/SYS: ONLINE', 25, 60);
    cameraCtx.fillText('MOD: IR/NIGHT', 25, 75);
    cameraCtx.fillText('Z: 2.5x', 25, 90);
    
    camSimTime++;
    requestAnimationFrame(renderCamera);
}

// ====================================================
// Local Map Simulation (Lima, Peru)
// ====================================================
let orbitalCanvas, orbitalCtx;
let simTime = 0;

function initOrbitalMap() {
    orbitalCanvas = document.getElementById('orbitalMapCanvas');
    if (!orbitalCanvas) return;
    
    orbitalCtx = orbitalCanvas.getContext('2d');
    
    function resize() {
        const parent = orbitalCanvas.parentElement;
        orbitalCanvas.width = parent.clientWidth;
        orbitalCanvas.height = parent.clientHeight;
    }
    
    window.addEventListener('resize', resize);
    resize();
    
    requestAnimationFrame(renderOrbital);
}

function renderOrbital() {
    if (!orbitalCtx || !orbitalCanvas.width) {
        requestAnimationFrame(renderOrbital);
        return;
    }
    
    const w = orbitalCanvas.width;
    const h = orbitalCanvas.height;
    const cx = w / 2;
    const cy = h / 2;
    
    // Limpiar canvas con fondo oscuro
    orbitalCtx.fillStyle = '#1c2128';
    orbitalCtx.fillRect(0, 0, w, h);
    
    // Dibujar cuadrícula de mapa
    orbitalCtx.strokeStyle = 'rgba(48, 54, 61, 0.4)';
    orbitalCtx.lineWidth = 1;
    for(let i = 0; i < w; i += 50) { 
        orbitalCtx.beginPath(); 
        orbitalCtx.moveTo(i, 0); 
        orbitalCtx.lineTo(i, h); 
        orbitalCtx.stroke(); 
    }
    for(let i = 0; i < h; i += 50) { 
        orbitalCtx.beginPath(); 
        orbitalCtx.moveTo(0, i); 
        orbitalCtx.lineTo(w, i); 
        orbitalCtx.stroke(); 
    }

    // Dibujar línea de costa simulada (Lima, Perú)
    orbitalCtx.strokeStyle = 'rgba(90, 122, 153, 0.8)';
    orbitalCtx.lineWidth = 3;
    orbitalCtx.beginPath();
    // La costa en Lima tiene un ángulo de noroeste a sureste
    orbitalCtx.moveTo(0, h * 0.1);
    orbitalCtx.quadraticCurveTo(w * 0.3, h * 0.5, w * 0.4, h);
    orbitalCtx.stroke();

    // Rellenar el lado del océano (Océano Pacífico)
    orbitalCtx.fillStyle = 'rgba(90, 122, 153, 0.1)';
    orbitalCtx.lineTo(0, h);
    orbitalCtx.lineTo(0, 0);
    orbitalCtx.fill();

    // Textos base del mapa
    orbitalCtx.fillStyle = 'rgba(139, 148, 158, 0.6)';
    orbitalCtx.font = 'bold 14px Roboto';
    orbitalCtx.fillText('Océano Pacífico', 20, cy);
    orbitalCtx.fillText('Lima, Perú', w * 0.6, h * 0.2);

    // Dibujar la posición base (Estación terrena)
    const baseLat = -12.0464; // Lima
    const baseLon = -77.0428;
    const baseX = w * 0.65;
    const baseY = h * 0.45;
    
    orbitalCtx.beginPath();
    orbitalCtx.arc(baseX, baseY, 6, 0, Math.PI * 2);
    orbitalCtx.fillStyle = '#ffaa00';
    orbitalCtx.fill();
    
    orbitalCtx.fillStyle = '#ffaa00';
    orbitalCtx.font = '10px Roboto';
    orbitalCtx.fillText('Estación Terrena', baseX + 10, baseY + 4);

    // Animar la caída o vuelo del CanSat (trayectoria simulada desde un punto)
    // El CanSat derivando
    const satLatOffset = Math.sin(simTime * 0.0005) * 80;
    const satLonOffset = Math.cos(simTime * 0.0003) * 60;
    
    const satX = baseX - 50 + satLatOffset;
    const satY = baseY - 80 + satLonOffset;
    
    // Dibujar el área de cobertura / radio de transmisión
    orbitalCtx.beginPath();
    orbitalCtx.arc(satX, satY, 60, 0, Math.PI * 2);
    orbitalCtx.fillStyle = 'rgba(0, 255, 127, 0.05)';
    orbitalCtx.fill();
    orbitalCtx.strokeStyle = 'rgba(0, 255, 127, 0.2)';
    orbitalCtx.lineWidth = 1;
    orbitalCtx.setLineDash([5, 5]);
    orbitalCtx.stroke();
    orbitalCtx.setLineDash([]);
    
    // Dibujar el punto del CanSat
    orbitalCtx.beginPath();
    orbitalCtx.arc(satX, satY, 6 + Math.sin(simTime * 0.01) * 3, 0, Math.PI * 2);
    orbitalCtx.fillStyle = '#00ff7f';
    orbitalCtx.fill();
    
    // Línea de conexión telemetría (Base -> Satélite)
    orbitalCtx.beginPath();
    orbitalCtx.moveTo(baseX, baseY);
    orbitalCtx.lineTo(satX, satY);
    orbitalCtx.strokeStyle = 'rgba(0, 255, 127, 0.3)';
    orbitalCtx.lineCap = 'round';
    orbitalCtx.stroke();
    
    // Etiqueta del Satélite
    orbitalCtx.fillStyle = '#ffffff';
    orbitalCtx.font = 'bold 12px Roboto';
    orbitalCtx.fillText('🛰 CanSat', satX + 12, satY - 8);
    
    // Simular telemetría en el mapa guiada por el desplazamiento
    orbitalCtx.fillStyle = '#a8b8cc';
    orbitalCtx.font = '10px Courier New';
    const dynLat = (baseLat + (satY - baseY) * 0.0003).toFixed(4);
    const dynLon = (baseLon + (satX - baseX) * 0.0003).toFixed(4);
    orbitalCtx.fillText(`LAT: ${dynLat}`, satX + 12, satY + 6);
    orbitalCtx.fillText(`LON: ${dynLon}`, satX + 12, satY + 18);
    
    simTime += 16; // Incremento aprox para 60 FPS
    requestAnimationFrame(renderOrbital);
}

function sendCommand(cmd) {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ command: cmd }));
}