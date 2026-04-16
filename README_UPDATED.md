# CanSat Dashboard - Guía Completa

Un dashboard web en tiempo real para monitorear datos de un CanSat durante vuelo, completamente alineado con la especificación `data_spec.md`.

---

## 📋 Estructura del Proyecto

```
SimuladorDashboard/
├── css/
│   └── styles.css              # Estilos oscuro, responsive
├── js/
│   └── app.js                  # WebSocket, actualización UI, gráficos
├── node_modules/               # Dependencias (Chart.js)
├── .vscode/
│   └── settings.json           # Configuración del editor
├── index.html                  # Página principal
├── package.json                # Dependencias npm
├── package-lock.json           # Lock file
├── simulator.py                # 🚀 Servidor WebSocket
│── data_spec.md                # 📖 ESPECIFICACIÓN OFICIAL
└── README.md                   # Documentación original
```

---

## 🚀 Inicio Rápido

### Paso 1: Instalar dependencias
```bash
npm install
```
Esto instala **Chart.js** que se usa para los gráficos dinámicos.

### Paso 2: Ejecutar el simulador
```bash
python simulator.py
```

Deberías ver:
```
==================================================
  CanSat Flight Simulator
==================================================
  WebSocket : ws://localhost:8765
  Dashboard : http://localhost:8080
==================================================
```

### Paso 3: Abrir el dashboard
Abre tu navegador en:
- **http://localhost:8080** (servido automáticamente por el simulador)
- O usa **Live Server** en VS Code

---

## 🎯 Campos Obligatorios (Según `data_spec.md`)

Estos son los campos que **DEBEN** mostrarse en la interfaz:

| Campo | JSON Path | Unidad | Indicadores |
|-------|-----------|--------|------------|
| Batería | `battery.voltage` | V | ✅ >3.8V \| ⚠️ 3.5-3.8V \| 🔴 <3.5V |
| Inclinación X | `imu.inclination_x` | ° | ✅ <15° \| ⚠️ 15-30° \| 🔴 >30° |
| Inclinación Y | `imu.inclination_y` | ° | ✅ <15° \| ⚠️ 15-30° \| 🔴 >30° |
| Altitud | `gps.altitude` | m | Display exacto |
| Latitud | `gps.lat` | ° | Display exacto |
| Longitud | `gps.lon` | ° | Display exacto |

---

## 🔌 Conexión WebSocket

El servidor envia datos cada segundo en formato JSON.

**URL:** `ws://localhost:8765`

**Ejemplo de paquete recibido:**
```json
{
  "timestamp": 124.5,
  "phase": "descent",
  "battery": { "voltage": 3.82 },
  "imu": {
    "accel_x": 0.124, "accel_y": -0.03, "accel_z": 9.81,
    "gyro_x": 0.01, "gyro_y": 0.0, "gyro_z": 0.02,
    "mag_x": 24.1, "mag_y": 5.3, "mag_z": -18.2,
    "inclination_x": 2.1, "inclination_y": -0.5,
    "heading": 274.3
  },
  "env": {
    "temperature": 18.4, "humidity": 62.1,
    "pressure": 1013.2, "gas": 45231
  },
  "gps": {
    "lat": -12.0464, "lon": -77.0428,
    "altitude": 85.3, "speed": 3.2,
    "fix": true, "satellites": 8
  },
  "uv": { "intensity": 0.87 },
  "descent_speed": 2.1,
  "sim_controls": {
    "running": true, "paused": false,
    "phase": "descent", "speed": 1.0,
    "elapsed": 124.5, "active_events": []
  }
}
```

---

## 🎮 Comandos del Simulador

Envía comandos por WebSocket:

```javascript
// Iniciar simulación
ws.send(JSON.stringify({ command: 'start' }));

// Pausar/Reanudar
ws.send(JSON.stringify({ command: 'pause' }));

// Reiniciar
ws.send(JSON.stringify({ command: 'reset' }));

// Cambiar fase
ws.send(JSON.stringify({ command: 'set_phase', 'phase': 'descent' }));

// Cambiar velocidad
ws.send(JSON.stringify({ command: 'set_speed', 'multiplier': 5 }));

// Inyectar evento (GPS perdido, batería baja, etc.)
ws.send(JSON.stringify({ command: 'inject_event', 'event': 'gps_lost' }));
```

---

## 📡 Fases de Vuelo

| Fase | Descripción |
|------|-------------|
| `pre_launch` | En tierra, esperando lanzamiento |
| `ascent` | Drone transportando CanSat a 100m |
| `freefall` | Drone libera CanSat |
| `descent` | Paracaídas desplegado, descendiendo |
| `detach` | Paracaídas se desacopla a ~5m |
| `landing` | CanSat en tierra, reportando |

---

## 📊 Características Implementadas

✅ **Conexión WebSocket robust** con reconexión automática cada 3 segundos  
✅ **Gráficos dinámicos** de altitud y temperatura en tiempo real  
✅ **Indicadores de color** según estados críticos (batería, inclinación)  
✅ **Controles del simulador** (Start, Pause, Reset)  
✅ **Tema oscuro optimizado** para legibilidad  
✅ **Responsive design** para dispositivos de cualquier tamaño  
✅ **Campos mandatorios** claramente marcados con borde azul  
✅ **Manejo de errores** robusto en el WebSocket  

---

## 🔧 Configuración

### Cambiar ubicación de vuelo
En `simulator.py`:
```python
BASE_LAT = -12.0464  # Latitud (Lima, Perú)
BASE_LON = -77.0428  # Longitud
```

### Cambiar puertos
En `simulator.py`:
```python
WS_PORT = 8765   # WebSocket
HTTP_PORT = 8080  # HTTP (Dashboard)
```

### Velocidad de actualización
En `simulator.py`:
```python
UPDATE_RATE = 1.0  # 1 paquete por segundo
```

---

## 🆘 Solucionar Problemas

### Dashboard dice "DESCONECTADO"
1. ✅ Verifica que `python simulator.py` esté ejecutándose
2. ✅ Abre DevTools (`F12`) → Consola y revisa errores
3. ✅ Prueba reconectar: `Ctrl+F5` (fuerza recarga)
4. ✅ Abre una nueva pestaña en `http://localhost:8080`

### Los gráficos no aparecen
1. ✅ Verifica que Chart.js se cargó (DevTools → Network → busca "chart")
2. ✅ Verifica que hay datos llegando (DevTools → Consola, busca mensajes del websocket)
3. ✅ Recarga la página

### Error "404" en el navegador
1. ✅ Asegúrate de ejecutar `python simulator.py` en la carpeta raíz
2. ✅ Verifica que `index.html` existe en la raíz
3. ✅ Intenta `http://localhost:8080` en lugar de `127.0.0.1`

### "npm: comando no encontido"
1. ✅ Instala Node.js desde https://nodejs.org
2. ✅ Reinicia tu terminal
3. ✅ Ejecuta `npm install` de nuevo

---

## 📖 Archivos Clave

| Archivo | Propósito |
|---------|-----------|
| `data_spec.md` | 📖 **LEE ESTO PRIMERO** - Especificación oficial de datos |
| `index.html` | Estructura HTML del dashboard |
| `js/app.js` | Lógica WebSocket, actualización UI, gráficos |
| `css/styles.css` | Estilos responsivos y tema oscuro |
| `simulator.py` | 🚀 Servidor WebSocket que genera datos |

---

## 🔄 Mover a Backend Real

Cuando tengas el backend real:

1. Detén `simulator.py` (Ctrl+C)
2. Ejecuta `python backend.py` en su lugar
3. Recarga el dashboard en el navegador
4. **No necesitas cambiar nada en el código del dashboard** ✨

El dashboard es agnóstico - solo espera datos por WebSocket en el formato de `data_spec.md`.

---

## 💾 Commit a Git

Una vez todo funcione:
```bash
git add .
git commit -m "Dashboard completamente funcional con gráficos y campos obligatorios"
git push
```

---

## 📝 Notas Técnicas

- **Chart.js** se carga desde CDN en el HTML
- Los gráficos muestran los últimos **60 segundos** de datos
- **Reconexión automática** cada 3 segundos si se desconecta
- Los campos requeridos tienen **borde azul** en la UI
- Los indicadores de color se aplican según los thresholds en `data_spec.md`

---

## 🏆 Checklist Pre-Competencia

- [x] Dashboard se conecta al WebSocket
- [x] Todos los campos obligatorios se muestran
- [x] Los indicadores de color funcionan (batería, inclinación)
- [x] Los gráficos se actualizan en tiempo real
- [x] Los botones de control funcionan
- [x] Reconexión automática funciona
- [x] El dashboard responde en dispositivos móviles
- [x] No hay errores en la consola

---

## 📄 Licencia

Proyecto educativo para competencia CanSat.

© 2026 CanSat Dashboard
