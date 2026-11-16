# Survive in Space (Sobrevive en el espacio)

Juego web educativo por rondas, en inglés y orientado a niños, donde el jugador comanda la nave **Ares** rumbo a Marte. En cada ronda lee un reporte, toma una decisión, juega un minijuego y ve cómo su elección afecta tres recursos de la nave: **Energy**, **Life Support** y **Shielding**.

> Este documento se basa únicamente en el código fuente analizado. Lo que está incompleto, es un placeholder o es inconsistente se indica explícitamente en la sección [Estado del proyecto y observaciones](#estado-del-proyecto-y-observaciones).

---

## Tabla de contenido

1. [Descripción general y propósito](#1-descripción-general-y-propósito)
2. [Stack tecnológico y dependencias](#2-stack-tecnológico-y-dependencias)
3. [Arquitectura y estructura de carpetas](#3-arquitectura-y-estructura-de-carpetas)
4. [Configuración e instalación](#4-configuración-e-instalación)
5. [Base de datos y almacenamiento](#5-base-de-datos-y-almacenamiento)
6. [Módulos, lógica principal y funciones clave](#6-módulos-lógica-principal-y-funciones-clave)
7. [Contenido de las rondas](#7-contenido-de-las-rondas)
8. [Flujo de uso](#8-flujo-de-uso)
9. [Pruebas y calidad de código](#9-pruebas-y-calidad-de-código)
10. [Cómo extender el juego](#10-cómo-extender-el-juego)
11. [Estado del proyecto y observaciones](#estado-del-proyecto-y-observaciones)

---

## 1. Descripción general y propósito

**Qué es.** Un juego de decisiones con minijuegos, 100 % del lado del cliente (sin backend propio). Cada decisión cuesta algo: si cualquiera de los tres recursos llega a 0, la misión fracasa.

**Qué enseña.** Cada ronda se inspira en situaciones reales de misiones espaciales y cierra con una nota "Based on a true story" / "Space Science Note":

| Ronda | Tema | Idea científica |
|---|---|---|
| 1 | Tormenta solar (SEP) | Radiación solar que confunde al *star tracker* |
| 2 | Reconocimiento del terreno de Marte | Navegación autónoma de rovers y retraso de comunicaciones |
| 3 | Conjunción solar | Planificación de tareas cuando Marte y la Tierra quedan incomunicados |
| 4 | Regreso a casa | Agua como escudo contra radiación vs. peso del cohete |

**Datos reales de la NASA.** La Ronda 1 consulta la API pública **DONKI** (eventos SEP) y agrega una página al reporte con el último evento real. Si la API falla, el juego continúa con valores por defecto.

**Flujo principal (resumen).**

```
index.html (portada)  →  Play  →  intro en carta  →  alerta roja  →  game.html (cabina)
game.html: por cada ronda → carta de reporte/historia → decisión → minijuego → resumen con efectos
         → si algún recurso ≤ 0: "Mission failed"; si no, siguiente ronda → "Mission Complete"
```

---

## 2. Stack tecnológico y dependencias

| Área | Tecnología |
|---|---|
| Lenguaje | JavaScript (módulos ES, sin TypeScript; tipos documentados con JSDoc) |
| UI | DOM nativo (sin framework) construido con helpers propios (`el`, `svg`, `mount`); Canvas 2D en minijuegos |
| Estilos | CSS plano, un archivo por componente |
| Audio | Web Audio API (los sonidos se sintetizan, no hay archivos de audio) |
| Empaquetado | esbuild (bundle `iife` con sourcemaps) |
| Pruebas | Runner integrado de Node (`node --test`) con `node:assert/strict` |
| Lint | ESLint (flat config) |
| Fuentes | Google Fonts: Fredoka, Pixelify Sans, Press Start 2P |
| API externa | NASA DONKI (SEP) — `ccmc.gsfc.nasa.gov` y, como respaldo, `api.nasa.gov` |

**`package.json`** (`survive-in-space`, versión `0.2.0`, `"private": true`, `"type": "module"`). No tiene dependencias de ejecución; solo de desarrollo:

| Paquete | Versión declarada |
|---|---|
| `esbuild` | `^0.28.2` |
| `eslint` | `^10.15.0` |
| `@eslint/js` | `^10.0.1` |
| `globals` | `^17.14.0` |

**Requisito de Node.js:** ESLint 10 declara `^20.19.0 || ^22.13.0 || >=24`; esbuild requiere `>=18`. Usa por tanto una versión de Node que cumpla lo más restrictivo (≥ 20.19 recomendado).

**Scripts npm**

| Script | Comando real | Función |
|---|---|---|
| `build` | `esbuild src/pages/start-page.js src/pages/game-page.js --bundle --format=iife --sourcemap --outdir=dist --entry-names=[name]` | Genera `dist/start-page.js` y `dist/game-page.js` (+ `.map`) |
| `dev` | mismo comando + `--servedir=.` | Servidor local (puerto por defecto de esbuild: 8000) |
| `test` | `node --test "tests/**/*.test.js"` | Ejecuta las pruebas |
| `lint` | `eslint .` | Revisa el código |

---

## 3. Arquitectura y estructura de carpetas

```
juego-espacial/
├── index.html                  Portada: estrellas, nave, botón Play, intro y luces de alerta
├── game.html                   Cabina: HUD (ronda + 3 medidores), escenario (#stage) y astronauta
├── package.json / package-lock.json
├── eslint.config.js            Config ESLint (src → navegador; tests y config → Node)
├── .editorconfig / .gitignore  UTF-8, LF, 2 espacios / ignora node_modules/
├── README.md                   Este documento
│
├── assets/                     Imágenes referenciadas por HTML/CSS (ver observaciones):
│                               nave-pixel.png, astronauta.png, cabina.png, fondo-estrellas.png
│
├── css/
│   ├── base.css                Variables (colores, fuentes), reset, botón .btn, botón de sonido
│   ├── start.css               Portada: estrellas animadas, nave, despegue, intro, fundido
│   ├── letter.css              "Carta" de pergamino, decisiones, chips de efectos, pantallas finales
│   ├── alert.css               Alerta roja (viñeta, lámparas, banner, chip) vía body.is-alert
│   ├── game.css                Cabina: fondo, HUD, medidores, astronauta y sus animaciones
│   ├── minigames.css           Estilo "consola" de minijuegos (Data check, Shield Zap, Rocket Boost…)
│   └── mars-recon.css          Estilos del minijuego de Marte (todo bajo el selector .mars-recon)
│
├── dist/                       Salida compilada de esbuild (la cargan los HTML)
│   ├── start-page.js(.map)
│   └── game-page.js(.map)
│
├── src/
│   ├── config.js               Ajustes globales: GAME, PAGES, RESOURCES, STORAGE_KEYS, TIMING, DONKI
│   ├── pages/
│   │   ├── start-page.js       Punto de entrada de index.html
│   │   └── game-page.js        Punto de entrada de game.html (bucle de rondas)
│   ├── core/                   Lógica pura, sin DOM
│   │   ├── resources.js        clamp, applyEffects, findDepleted, formatPercent…
│   │   └── game-state.js       createGameState, recordOutcome (estado inmutable)
│   ├── data/                   Contenido y textos
│   │   ├── intro.js            Páginas de la introducción
│   │   ├── game-over.js        Mensajes de derrota por recurso agotado
│   │   └── rounds/             round-01.js … round-04.js e index.js (arreglo ROUNDS)
│   ├── game/
│   │   ├── round-flow.js       playRound(): reporte → decisión → minijuego → resumen
│   │   └── live-data.js        Convierte el resumen de DONKI en una página de la carta
│   ├── services/
│   │   ├── donki.js            Cliente de la API DONKI (fuentes, ventanas, caché, normalización)
│   │   └── storage.js          Acceso seguro a localStorage (string y JSON)
│   ├── audio/sound.js          Efectos con Web Audio + estado silenciado persistente
│   ├── ui/                     Componentes de interfaz
│   │   ├── dom.js              el(), svg(), mount(), sleep(), prefersReducedMotion(), focusTitle()
│   │   ├── letter.js           Carta con efecto de escritura, notas, paginación y teclado
│   │   ├── choice-screen.js    Pantalla de decisión (atajos 1, 2, 3…)
│   │   ├── effects.js          Chips con cambios de recursos
│   │   ├── hud.js              Actualiza ronda, progreso y medidores
│   │   ├── end-screen.js       Pantalla final con botones
│   │   ├── alert.js            setAlert() / isAlertOn()
│   │   ├── astronaut.js        Reacciones "happy" / "hit"
│   │   └── sound-toggle.js     Botón "Sound: on/off"
│   └── minigames/
│       ├── index.js            Registro y despachador runMinigame(type, container, config)
│       ├── types.js            MINIGAME_TYPES (lista de tipos válidos)
│       ├── flight.js           "Power Grid" (tipo manualFlight)
│       ├── flight-model.js     Modelo de simulación de vuelo (ver observaciones)
│       ├── data-check.js       Vista de "Data check" (tipo dataCheck)
│       ├── data-check-model.js Lógica de "Data check"
│       ├── static-noise.js     Estática de TV en canvas
│       ├── shield-zap.js       "Shield Zap" (tipo shieldZap)
│       ├── rocket-boost.js     "Rocket Boost" (tipo rocketBoost)
│       ├── solar-conjunction.js "Offline Kit" y "Habitat Drill" (tipos offlineKit, habitatDrill)
│       ├── mars-recon-model.js Lógica de la Ronda 2 (mapa, Dijkstra, radar, evaluación)
│       └── mars-recon.js       Vista Canvas + controles de la Ronda 2 (3 rutas)
│
└── tests/
    ├── helpers.js              seededRandom(), memoryCache()
    ├── resources.test.js
    ├── donki.test.js
    ├── data-check-model.test.js
    ├── flight-model.test.js
    └── rounds-data.test.js
```

### Principios de diseño observables en el código

- **Lógica separada de la vista.** `core/`, `*-model.js` y `donki.js` no tocan el DOM.
- **Contenido separado del código.** Textos, opciones y porcentajes viven en `src/data/` y `src/config.js`.
- **Sin `innerHTML`.** Los nodos se crean con `createElement`/`textContent` (`ui/dom.js`), de modo que datos externos (p. ej. la API) no se interpretan como HTML.
- **Estado inmutable.** `recordOutcome` y `applyEffects` devuelven objetos nuevos.
- **Flujo lineal con `async/await`.** Cada pantalla devuelve una `Promise` que se cumple cuando el jugador termina con ella.
- **Accesibilidad.** Regiones `aria-live`, `role="progressbar"`, foco en títulos (`focusTitle`), atajos de teclado y respeto a `prefers-reduced-motion`.

---

## 4. Configuración e instalación

### Variables de entorno

**El proyecto no usa variables de entorno** (no hay `.env` ni lectura de `process.env`). Toda la configuración está en `src/config.js`:

| Constante | Contenido |
|---|---|
| `GAME` | `playerName: 'D. Diaz'`, `totalRounds: 4`, `totalDays: 300` |
| `PAGES` | `start: 'index.html'`, `game: 'game.html'` |
| `RESOURCES` | `max: 100`, `lowThreshold: 25`, inicio `70/70/70`, etiquetas |
| `STORAGE_KEYS` | `survive-in-space:sound`, `survive-in-space:sep-cache` |
| `TIMING` | `liftOffMs 1400`, `fadeOutMs 850`, `typeMsPerChar 22`, `liveDataWaitMs 3500`, `minigameEndMs 1500` |
| `DONKI` | `timeoutMs 5000`, `lookbackDays [30, 365, 1825]`, `cacheTtlMs` = 6 h, lista de `sources` |

> **Clave de API:** la fuente `api-nasa-gov` usa `api_key: 'DEMO_KEY'` (clave pública de pruebas de la NASA, con límite bajo), escrita directamente en `src/config.js`. Un comentario del propio archivo recomienda pedir una clave gratuita en <https://api.nasa.gov> antes de publicar el juego. No hay otros secretos.

### Pasos para ejecutarlo en local

**Solo jugar (sin Node):** abrir `index.html` con doble clic. Los HTML cargan `dist/*.js`, ya compilado.

> Requiere los archivos de `assets/` y acceso a internet para las fuentes de Google y (opcionalmente) la API de la NASA.

**Para desarrollar:**

```bash
# 1. Instalar dependencias de desarrollo
npm install

# 2. Servidor de desarrollo con recompilación automática (esbuild --servedir)
npm run dev          # normalmente en http://localhost:8000

# 3. Compilar los bundles a dist/ (obligatorio tras cambiar algo en src/)
npm run build

# 4. Pruebas y lint
npm test
npm run lint
```

Importante: `index.html` y `game.html` apuntan a `dist/start-page.js` y `dist/game-page.js`. Si editas `src/` y no ejecutas `npm run build` (o no usas `npm run dev`), el navegador seguirá viendo la versión anterior.

---

## 5. Base de datos y almacenamiento

**No hay base de datos ni backend.** El estado de la partida vive en memoria durante la sesión y solo se persisten dos claves en `localStorage` (con acceso protegido por `try/catch` en `services/storage.js`, porque puede fallar en modo privado):

| Clave | Contenido | Quién la escribe |
|---|---|---|
| `survive-in-space:sound` | `"on"` / `"off"` (preferencia de sonido) | `audio/sound.js` (`toggle`) |
| `survive-in-space:sep-cache` | JSON `{ savedAt, result }` con la última respuesta de DONKI (válida 6 h) | `services/donki.js` (`defaultCache.save`) |

### Estructuras de datos en memoria

```js
// Recursos (0–100)
Resources = { energy, lifeSupport, shielding }

// Estado de juego
GameState = { resources: Resources, history: HistoryEntry[] }
HistoryEntry = { roundId, choiceId, result: 'win'|'lose', outcomeId }

// Ronda (src/data/rounds/*.js) — ver typedef en round-01.js
Round = {
  id, number, title, speaker, alert,
  report:   { liveData: boolean, pages: LetterPage[] },
  decision: { pages, title, prompt, options: [{ id, label, minigame: {type, intro, config?}, outcomes: {win, lose?} }] },
  outcomes: { [outcomeId]: { tone: 'good'|'mixed'|'bad', text, effects: Partial<Resources> } },
  fact:     { title, text }
}

// Evento SEP normalizado (donki.js)
SepEvent = { id, time: Date|null, instruments: string[], linkedEvents: string[] }
SepResult = { status: 'live'|'cached'|'unavailable', events, windowDays, sourceId }
```

---

## 6. Módulos, lógica principal y funciones clave

### 6.1 Punto de entrada de la portada — `src/pages/start-page.js`

1. Conecta el botón de sonido y el botón **Play** (también se activa con Enter/Espacio).
2. `start()`: inicializa audio, reproduce `liftOff`, añade `body.is-lifting-off` (los textos desaparecen y la nave sube) y tras `TIMING.liftOffMs` llama a `showIntro()`.
3. `showIntro()`: abre una carta con `buildIntroPages(GAME.playerName)` (4 páginas, saltable con ×). Al llegar a la última página activa la alerta roja (`setAlert(true)` + `sound.alarm()`).
4. Al terminar la carta añade `body.is-leaving` (fundido a negro) y redirige a `game.html` tras `TIMING.fadeOutMs`.
5. En `pageshow` con `event.persisted` recarga la página (si el usuario vuelve con "atrás").

### 6.2 Punto de entrada del juego — `src/pages/game-page.js`

- Crea HUD, astronauta y botón de sonido.
- Lanza **una sola vez** la consulta a DONKI (`getLatestSepEvents().then(summarizeStorm)`) sin bloquear el juego; ante cualquier error usa un resumen "unavailable".
- `runGame()`: crea el estado inicial y recorre `ROUNDS` con `playRound(...)`. Tras cada ronda llama a `findDepleted(state.resources)`; si algún recurso es ≤ 0 muestra **"Mission failed"** con el mensaje de `GAME_OVER_TEXT` y ofrece "Try again" / "Back to start".
- Si se superan todas las rondas muestra **"Mission Complete - Welcome Home!"** (o un mensaje de "ronda en construcción" si `lastRound.number < GAME.totalRounds`).

### 6.3 Flujo de una ronda — `src/game/round-flow.js`

`playRound({ round, state, ui, getStormSummary })`:

1. Actualiza HUD (`renderRound`, `renderResources`) y aplica `setAlert(round.alert)` (+ `sound.alarm()` si es alerta).
2. Si `report.liveData` es `true`, espera el resumen de DONKI con un `Promise.race` limitado a `TIMING.liveDataWaitMs` (3,5 s).
3. Abre **una sola carta** con: páginas del reporte + (página de datos NASA) + páginas de la decisión. Botón final: "Decide".
4. `askChoice(...)` muestra las opciones; devuelve el `id` elegido.
5. Muestra una carta con `option.minigame.intro` ("Start") y ejecuta `runMinigame(type, stage, { ...config, level })`.
6. Resuelve el `outcomeId` con `option.outcomes[result]` (si no existe, usa el primer valor de `outcomes`), llama a `recordOutcome` para aplicar efectos, apaga la alerta, reproduce sonido y reacción del astronauta (`tone === 'bad'` → `lose` + `hit`; en otro caso `calm` + `happy`).
7. Muestra la carta final con el texto del resultado, los *chips* de cambios reales y la nota científica.

### 6.4 Recursos y estado — `src/core/`

| Función | Descripción |
|---|---|
| `clamp(value, max)` | Limita a `[0, max]` |
| `createResources(start)` | Copia los valores iniciales |
| `applyEffects(resources, effects, max)` | Devuelve `{ resources, applied }`; `applied` es el cambio real tras el recorte |
| `findDepleted(resources)` | Primer recurso ≤ 0 (orden: energy, lifeSupport, shielding) o `null` |
| `formatPercent(delta)` | `"+5%"` o `"−15%"` (con signo menos real `\u2212`) |
| `createGameState()` | Estado inicial (70/70/70, historial vacío) |
| `recordOutcome(state, entry, effects)` | Estado nuevo + historial + `applied` |

### 6.5 Cliente DONKI — `src/services/donki.js`

`getLatestSepEvents(options)`:

1. Lee la caché (6 h). Si existe, devuelve `status: 'cached'`.
2. Para cada fuente (`ccmc` → `api-nasa-gov`) y cada ventana (30 → 365 → 1825 días) hace `fetch` con `AbortController` (timeout 5 s) a `.../SEP` con `startDate`/`endDate` (`yyyy-MM-dd`).
3. Si una ventana trae eventos, los normaliza (`normalizeResponse`: ordena de más reciente a más antiguo), guarda caché y devuelve `status: 'live'`.
4. Si una fuente responde pero no hay eventos ni en la ventana mayor, devuelve `live` con lista vacía.
5. Si la fuente falla (red, CORS, HTTP ≠ 2xx), prueba la siguiente; si todas fallan, `status: 'unavailable'`.

`summarizeStorm(result)` devuelve `{ latest, count, windowDays, level, hasLiveData }`. **Regla del juego (no científica):** `level` = `strong` si el evento tiene ≥ 2 erupciones ligadas, `medium` si 1 (o si no hay datos), `mild` si 0.

**Respuesta esperada de la API** (lista JSON): `[{ sepID, eventTime, instruments: [{displayName}], linkedEvents: [{activityID}], ... }]`. Una lista vacía `[]` no es un error.

`game/live-data.js › buildLiveDataPage(summary)` genera la página "Real NASA data" (fecha, instrumento, erupciones ligadas, cuántas tormentas registró la NASA en la ventana, y nivel de fuerza) o un texto alternativo si no hay datos.

### 6.6 Interfaz — `src/ui/`

- **`dom.js`**: `el(tag, attrs, ...children)` (soporta `class`, `dataset`, `on`, atributos booleanos), `svg(...)`, `mount(container, ...nodes)`, `sleep(ms)`, `prefersReducedMotion()`, `focusTitle(root)`.
- **`letter.js › openLetter({ container, pages, speaker, finalLabel, skippable, onShow })`**: carta con efecto de escritura (22 ms por carácter, pausas en `.!?` y `,`), tick de sonido, notas ("Quick science"), contenido extra (`page.extra()`), puntos de paginación y texto para lectores de pantalla. Avanza con clic, Enter, Espacio o →; el primer pulso durante la escritura la completa. Con `prefers-reduced-motion` muestra el texto al instante.
- **`choice-screen.js › askChoice(...)`**: lista de opciones; atajos de teclado `1`, `2`, `3`…
- **`hud.js`**: `renderResources` (valor, ancho de barra, `aria-valuenow`, clase `is-low` si ≤ 25) y `renderRound` (texto "Round X of N" y barra de progreso `(round-1)/total`).
- **`effects.js`**: chips "Energy −25%", etc. (solo los recursos con cambio ≠ 0; "No changes" si no hay).
- **`end-screen.js`**, **`alert.js`**, **`astronaut.js`**, **`sound-toggle.js`**: pantallas finales, alerta global, reacciones del astronauta y botón de sonido.

### 6.7 Sonido — `src/audio/sound.js`

Sintetiza tonos y ruido filtrado con Web Audio (volúmenes bajos). API: `init`, `isMuted`, `toggle`, `tick`, `page`, `choose`, `liftOff`, `alarm`, `calm`, `thrust`, `glitch`, `warning`, `good`, `bad`, `win`, `lose`. Reanuda el `AudioContext` en el primer `pointerdown`/`keydown` (política de autoplay).

### 6.8 Minijuegos — `src/minigames/`

Contrato común: `(container, config) => Promise<{ result: 'win'|'lose', stats }>`. El registro está en `index.js`, que además **lanza un error al cargar** si algún tipo de `MINIGAME_TYPES` no está registrado.

| Tipo | Ronda / opción | Descripción y reglas |
|---|---|---|
| `manualFlight` (*Power Grid*) | R1 · "Leave the shelter" | 4 sistemas (Solar Panels, Flight Computer, Star Tracker, Thrusters), inicial `[ON, OFF, ON, OFF]`. 4 interruptores, cada uno invierte dos sistemas contiguos (0-1, 1-2, 2-3, 3-0). 4 movimientos para dejar todo en ON; si se agotan → `lose`. |
| `dataCheck` | R1 · "Stay inside" | 8 tarjetas: compara la flecha del *star tracker* (con estática) contra la de los sensores de respaldo. "Keep" si coinciden, "Clear" si difieren (teclas `1`/`2`). Un error repite la tarjeta y suma a `mistakes`; **no existe condición de derrota**, siempre termina en `win`. Generador con ≥ 3 falsas y ≥ 3 buenas; las falsas difieren ≥ 90°. |
| `marsRoverDrive` / `marsRoutePlanner` / `marsRadarScan` | R2 · A / B / C | Ver [6.9](#69-ronda-2--mars-recon). |
| `offlineKit` | R3 · "Pack an Offline Kit" | 5 archivos con tamaño y 6 unidades de almacenamiento. Hay que guardar los tres marcados como necesarios (*Safety checklist* 2, *Base manual* 2, *Mission log* 2); los distractores son *Rover photo album* (3) y *Crew movie* (4). Se alterna guardar/quitar; "Test Offline Kit" decide `win`/`lose`. |
| `habitatDrill` | R3 · "Run the Habitat Drill" | 3 alarmas en secuencia (aire → filtro, frío → calentador, batería → pausar laboratorio de ciencia), cada una con una pista del manual. 2 errores acumulados → `lose`; 3 aciertos → `win`. |
| `shieldZap` | R4 · "Heavy Water Shield" | 18 s para destruir 6 rayos (aparece uno cada 2 s, vive 3 s). Clic/toque o Enter/Espacio. Botón "Skip" cuenta como fallo. |
| `rocketBoost` | R4 · "Fly Light and Fast" | Una aguja oscila (velocidad 65); hay que pulsar BLAST OFF dentro de la zona verde (38–62) 3 veces; 3 fallos → `lose`. |

`static-noise.js › startStatic(canvas, opts)` dibuja ruido de TV en un canvas pequeño y devuelve una función para detenerlo.

### 6.9 Ronda 2 — Mars Recon

**Modelo** (`mars-recon-model.js`, sin DOM):

- Mapa fijo de 19 × 11 casillas (`#` obstáculo, `.` paso), construido con `createMarsMap()`. Casilla "rocosa" cuando `(x*7 + y*11) % 9 === 0`: cuesta 3 de batería; el resto cuesta 1.
- Hábitat en `[1, 1]`. Sitios científicos: **ALPHA** `[5,3]`, **BETA** `[12,3]`, **GAMMA** `[16,8]`.
- `shortestPath(start, destination)`: Dijkstra con costos de terreno (cola implementada con `sort`). `calculateTour(order)` calcula hábitat → sitios → hábitat. `minimumTour()` evalúa las 6 permutaciones.
- `INITIAL_BATTERY = minimumTour().cost + 38` (`batteryBuffer`).
- Radar: 4 sectores (A 40° *regolith*, B 125° *rock*, C 220° *dune*, D 310° *slope*), tolerancia ±15°, máximo 8 escaneos.

| Función | Ruta | Descripción |
|---|---|---|
| `createMarsSession(route)` | todas | Sesión inicial (`status: 'running'`) |
| `moveMarsRover(session, dx, dy)` | A | Mueve una casilla; descuenta batería; devuelve `reserveWarning` si la batería no alcanza para volver; gana al volver al hábitat con los 3 sitios escaneados; pierde si se agota la batería fuera del hábitat |
| `scanMarsSite(session)` | A | Escanea el sitio bajo el rover |
| `toggleMarsWaypoint`, `evaluateMarsPlan`, `startMarsExpedition`, `stepMarsExpedition` | B | Planificación, estimación de costo (incluye regreso), ejecución paso a paso |
| `aimMarsRadar`, `scanMarsSector`, `classifyMarsSector`, `getCorrectMarsSectors` | C | Orientar antena, escanear, clasificar; gana con 4 clasificaciones correctas |
| `endMarsSession(session)` | todas | Termina como `lose` (`reason: 'ended-early'`) |
| `evaluateMarsMission(session)` | todas | Devuelve `{ route, success, partial, status, mapQuality, ... }` |

**Vista** (`mars-recon.js`): `runMarsRecon(container, { route })` dibuja en un `<canvas>` de 960 × 590 el terreno (rutas A/B) o el radar (ruta C), más una barra lateral con batería, progreso, controles y botón *"End & review (counts as a miss)"*. Exporta `runMarsRoverDrive`, `runMarsRoutePlanner` y `runMarsRadarScan`.

- **A — Manual:** WASD o flechas, Espacio para escanear; botones táctiles con repetición al mantener pulsado (145 ms).
- **B — Planificador:** se eligen los 3 sitios en orden, se muestra la ruta punteada y el costo estimado; "EXECUTE PLAN" anima la expedición con `requestAnimationFrame` (75 ms por paso).
- **C — Radar:** deslizador de rumbo 0–359°, selector de sector, "SCAN SECTOR" y clasificación (`regolith`, `rock`, `dune`, `slope`).

Al terminar, `result` = `evaluation.status` (`'win'`/`'lose'`); `stats` incluye la evaluación completa, la ruta y `reason`.

---

## 7. Contenido de las rondas

Efectos en puntos porcentuales sobre `energy` / `lifeSupport` / `shielding`. El juego empieza con 70 / 70 / 70.

**Ronda 1 — Solar Storm** (alerta activa; datos reales NASA)

| Opción → minijuego | Resultado | Tono | Energy | Life Support | Shielding |
|---|---|---|---|---|---|
| Leave the shelter → `manualFlight` | `leave-win` | mixed | −25 | −15 | +5 |
| | `leave-lose` | bad | −30 | −20 | −10 |
| Stay inside → `dataCheck` | `stay-win` | good | −5 | +10 | +5 |

**Ronda 2 — Mars Terrain Reconnaissance** (narrador: AURA)

| Opción → minijuego | Resultado | Tono | Energy | Life Support | Shielding |
|---|---|---|---|---|---|
| A — Rocky Shortcut → `marsRoverDrive` | `rover-win` | good | −5 | 0 | 0 |
| | `rover-lose` | mixed | −12 | −3 | 0 |
| B — Surveyed Corridor → `marsRoutePlanner` | `planner-win` | good | −3 | 0 | 0 |
| | `planner-lose` | mixed | −10 | −2 | 0 |
| C — Remote Mapping → `marsRadarScan` | `radar-win` | good | −4 | 0 | 0 |
| | `radar-lose` | mixed | −8 | 0 | −3 |

**Ronda 3 — Solar Conjunction**

| Opción → minijuego | Resultado | Tono | Energy | Life Support | Shielding |
|---|---|---|---|---|---|
| Pack an Offline Kit → `offlineKit` | `kit-win` | good | −4 | 0 | 0 |
| | `kit-lose` | mixed | −8 | 0 | 0 |
| Run the Habitat Drill → `habitatDrill` | `drill-win` | good | −3 | 0 | 0 |
| | `drill-lose` | mixed | −7 | −5 | 0 |

**Ronda 4 — Return Home** (alerta activa)

| Opción → minijuego | Resultado | Tono | Energy | Life Support | Shielding |
|---|---|---|---|---|---|
| Keep the Heavy Water Shield → `shieldZap` | `shield-win` | good | −20 | 0 | +15 |
| | `shield-lose` | mixed | −30 | −10 | +10 |
| Fly Light and Fast → `rocketBoost` | `boost-win` | good | −5 | 0 | −10 |
| | `boost-lose` | bad | −25 | −15 | −10 |

---

## 8. Flujo de uso

1. **Portada (`index.html`).** El jugador ve el título, la nave y el botón **▶ Play** (o pulsa Enter/Espacio). Puede activar/desactivar el sonido.
2. **Despegue e intro.** Los textos desaparecen, la nave sube y aparece una carta de 4 páginas (puede saltarse con ×). En la última página se enciende la alerta roja.
3. **Cabina (`game.html`).** Fundido a negro y carga del juego. Se muestra el HUD con *Round 1 of 4* y los tres medidores al 70 %.
4. **Ronda.**
   1. Se lee el reporte y la historia (en la Ronda 1 incluye una página con datos reales de la NASA).
   2. Se elige una opción (clic o teclas `1`/`2`/`3`).
   3. Se lee la introducción del minijuego y se juega.
   4. Aparece el resumen: texto, chips con los cambios reales de recursos y una nota "Based on a true story" / "Space Science Note". Los medidores se actualizan; el astronauta reacciona.
5. **Evaluación.** Si algún recurso llegó a 0 → pantalla **Mission failed** con *Try again* y *Back to start*. Si no, continúa con la siguiente ronda.
6. **Final.** Tras la Ronda 4 → **Mission Complete - Welcome Home!** con *Play again* y *Back to start*.

---

## 9. Pruebas y calidad de código

```bash
npm test      # node --test "tests/**/*.test.js"
npm run lint  # eslint .
```

| Archivo | Qué verifica |
|---|---|
| `resources.test.js` | `applyEffects` (sin mutar, recorte a 0–100, cambio real), `findDepleted`, `formatPercent`, `clamp`, `createResources`, `recordOutcome` |
| `donki.test.js` | Construcción de URL, normalización, ampliación de ventana, *fallback* entre fuentes, estado `unavailable`, caché, niveles de tormenta |
| `data-check-model.test.js` | Generación de tarjetas (semillas 1–200), separación angular, `isCorrect`, `submitAnswer` |
| `flight-model.test.js` | Modelo de vuelo (`flight-model.js`): costo de propulsión, derrota por energía, radiación creciente, dificultades |
| `rounds-data.test.js` | Estructura válida de las 4 rondas, tipos de minijuego registrados, numeración 1–4, efectos de R1 y R4, y que los textos de R4 no contengan emojis, `%` ni nombres de agencias |

`tests/helpers.js` aporta `seededRandom(seed)` (generador determinista) y `memoryCache()`.

**Lint** (`eslint.config.js`): ignora `dist/` y `node_modules/`; en `src/**` usa `ecmaVersion 2023`, globales de navegador y las reglas `no-unused-vars` (permite argumentos con prefijo `_`), `eqeqeq` y `prefer-const`.

**Sin pruebas automáticas:** `mars-recon-model.js`, `solar-conjunction.js`, `shield-zap.js`, `rocket-boost.js` ni los componentes de `ui/`.

---

## 10. Cómo extender el juego

### Agregar o modificar una ronda

1. Copia `src/data/rounds/round-01.js` (contiene el `typedef` de `Round`) y ajusta textos, opciones, minijuegos y efectos.
2. Impórtala y agrégala a `ROUNDS` en `src/data/rounds/index.js`.
3. Cada opción debe definir al menos `outcomes.win`, y todo `outcomeId` referenciado debe existir en `round.outcomes`.
4. Si cambias el número de rondas, actualiza `GAME.totalRounds` en `src/config.js` (el HUD y el cierre del juego lo usan; `rounds-data.test.js` actualmente espera exactamente 4).
5. `npm run build` y `npm test`.

### Agregar un minijuego

1. Crea la vista (y, si aplica, un `*-model.js` con la lógica) con la firma `(container, config) => Promise<{ result, stats }>`.
2. Añade el nombre en `src/minigames/types.js` y regístralo en `src/minigames/index.js`.
3. Úsalo en una opción: `minigame: { type: 'miJuego', intro: '...' }`.

---

## Estado del proyecto y observaciones

Hallazgos detectados al revisar el código (no son funcionalidades nuevas; son puntos a tener en cuenta):

1. **Número de rondas y días inconsistentes.** El código define **4 rondas** (`GAME.totalRounds`), pero `game.html` trae el texto de ejemplo "Round 1 of 10" (se reemplaza al iniciar), y el `README` anterior hablaba de 10 rondas. Además `GAME.totalDays = 300` **no se usa en ningún módulo**; el "300 days" de la introducción está escrito a mano en `intro.js`, mientras que la Ronda 2 dice "DAY 980", el comentario de `mars-recon` dice "980 DAYS: MISSION MARS" y el canvas muestra "SOL 264".
2. **`flight-model.js` no está conectado a la interfaz.** Es un modelo de simulación (marcador, radiación, energía) con pruebas, pero la opción "Leave the shelter" usa `flight.js` (*Power Grid*), que no lo importa. Las descripciones de la Ronda 1 ("keep the ship straight… radiation alarm") describen la simulación, no el puzzle actual.
3. **La dificultad por datos NASA no se aplica.** `round-flow.js` pasa `level` (`mild`/`medium`/`strong`) a cada minijuego, pero ningún minijuego lo utiliza. Hoy solo cambia el texto mostrado en la página "Real NASA data".
4. **`dataCheck` no puede perderse.** La opción "stay" solo declara `outcomes.win`; el minijuego solo resuelve `win`.
5. **Minijuegos de la Ronda 3 sin cierre uniforme.** `offlineKit` y `habitatDrill` no reproducen sonido de victoria/derrota ni esperan `TIMING.minigameEndMs`, a diferencia del resto.
6. **Ronda 2 puede quedar sin salida automática.** En la ruta C no hay derrota automática al agotar los 8 escaneos (se puede reclasificar sin penalización); el jugador debe pulsar "End & review". Algo similar ocurre en la ruta B si el plan no es válido. Además, `evaluateMarsMission` calcula `partial`/`mapQuality`, pero `round-02.js` solo mapea resultados `win` / `lose`.
7. **Pista del radar.** La interfaz muestra el rumbo aproximado de cada sector ("signal near X°"), lo que simplifica la dificultad de la ruta C.
8. **Nombres de opciones vs. minijuegos (R2).** Las etiquetas "Rocky Shortcut / Surveyed Corridor / Remote Mapping" no coinciden literalmente con los títulos internos de las rutas ("Manual rover driving", "Autonomous route planning", "Remote terrain mapping").
9. **Assets no incluidos en el análisis.** El código referencia `assets/nave-pixel.png`, `assets/astronauta.png`, `assets/cabina.png` y `assets/fondo-estrellas.png`, pero los archivos de imagen no formaban parte del material revisado, por lo que no se pudo verificar su existencia. El `README` anterior mencionaba `assets/nave.png`, nombre que ya no coincide con `index.html`.
10. **Dependencia de red.** Las fuentes de Google y la API DONKI requieren internet; sin ella el juego sigue funcionando (fuentes del sistema de respaldo y tormenta de fuerza "medium").
11. **Clave `DEMO_KEY` en el cliente.** Es una clave pública de pruebas con límite bajo; conviene reemplazarla antes de publicar.
12. **Idioma.** La interfaz y los textos del juego están en inglés; los comentarios del código están mayoritariamente en español (los de `mars-recon*` están en inglés).
