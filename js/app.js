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
    }

    if (data.gps) {
        if (data.gps.altitude !== undefined) {
            document.getElementById("altitude").textContent = data.gps.altitude.toFixed(2) + " m";
        }
        if (data.gps.lat !== undefined && data.gps.lon !== undefined) {
            document.getElementById("gps").textContent = 
                data.gps.lat.toFixed(4) + ", " + data.gps.lon.toFixed(4);
        }
    }

    // Additional fields
    if (data.env) {
        if (data.env.temperature !== undefined) {
            document.getElementById("temperature").textContent = data.env.temperature.toFixed(2) + " °C";
        }
        if (data.env.humidity !== undefined) {
            document.getElementById("humidity").textContent = data.env.humidity.toFixed(1) + " %";
        }
        if (data.env.pressure !== undefined) {
            document.getElementById("pressure").textContent = data.env.pressure.toFixed(2) + " hPa";
        }
    }

    if (data.phase) {
        document.getElementById("phase").textContent = data.phase;
    }

    if (data.descent_speed !== undefined) {
        document.getElementById("speed").textContent = data.descent_speed.toFixed(2) + " m/s";
    }

    if (data.timestamp !== undefined) {
        document.getElementById("timestamp").textContent = data.timestamp.toFixed(1) + " s";
    }

    if (data.gps && data.gps.satellites !== undefined) {
        document.getElementById("satellites").textContent = data.gps.satellites;
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
    connectWebSocket();
});
function sendCommand(cmd) {
    ws.send(JSON.stringify({ command: cmd }));
}