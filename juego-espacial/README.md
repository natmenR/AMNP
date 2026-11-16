# Survive in Space

Juego educativo por rondas para niños: la nave **Ares** viaja a Marte y hay que sobrevivir 300 días (10 rondas, una misión por ronda). Cada ronda tiene un reporte, una decisión, un minijuego y un resumen con el efecto en **Energy**, **Life Support** y **Shielding**.

Ahora está lista la **Ronda 1: tormenta solar (SEP)**, con datos reales de la NASA.

## Cómo abrirlo

- **Solo jugar:** abre `index.html` con doble clic. El código ya está compilado en `dist/`.
- **Para programar:**
  ```bash
  npm install
  npm run dev     # servidor local con recompilación automática (http://localhost:8000)
  npm run build   # genera dist/ (hazlo antes de entregar o subir el juego)
  npm test        # pruebas automáticas de la lógica
  npm run lint    # revisa la calidad del código
  ```

> Si cambias algo dentro de `src/`, ejecuta `npm run build` para que `index.html` vea el cambio.

## Estructura

```
index.html / game.html      Páginas (portada y cabina)
css/                        Estilos por componente (base, start, letter, alert, game, minigames)
assets/                     Imágenes (nave.png, astronauta.png, cabina.png, fondo-estrellas.png)
src/
  config.js                 Todos los números y ajustes (recursos iniciales, tiempos, API)
  pages/                    Puntos de entrada: start-page.js y game-page.js
  core/                     Lógica pura, sin DOM: recursos y estado del juego
  data/                     TEXTOS y contenido: intro.js, rounds/round-01.js, game-over.js
  game/                     round-flow.js (el flujo de una ronda) y live-data.js
  services/                 donki.js (API de la NASA) y storage.js (localStorage seguro)
  minigames/                *-model.js (lógica) + vistas (flight.js, data-check.js) + registro
  ui/                       Componentes: carta con escritura, HUD, decisiones, chips, alerta
  audio/sound.js            Efectos de sonido (Web Audio, sin archivos)
tests/                      Pruebas con el runner integrado de Node
dist/                       Código compilado (lo genera esbuild)
```

Principios que sigue el código:

- **Separar lógica y pantalla.** La lógica (`core/`, `*-model.js`, `donki.js`) no toca el DOM, así se prueba sin navegador.
- **Contenido separado del código.** Para cambiar un texto o un porcentaje solo tocas `src/data/` o `src/config.js`.
- **Sin `innerHTML` con datos externos.** `ui/dom.js` construye elementos con `textContent`, así lo que llegue de la API nunca se interpreta como HTML.
- **Fallos controlados.** Si la API de la NASA falla, el juego sigue con valores por defecto.
- **Estado inmutable.** `recordOutcome` devuelve un estado nuevo en vez de modificar el anterior.
- **Accesibilidad.** Textos para lectores de pantalla, controles con teclado (1/2 para decidir, ← → en el vuelo) y respeto a `prefers-reduced-motion`.

## Cómo agregar la Ronda 2

1. Copia `src/data/rounds/round-01.js` a `round-02.js` y cambia los textos, opciones, minijuegos y efectos.
2. Impórtala y agrégala al arreglo en `src/data/rounds/index.js`.
3. `npm run build`. Las pruebas de `tests/rounds-data.test.js` revisan que la estructura sea válida.

## Cómo agregar un minijuego

1. Crea `src/minigames/mi-juego-model.js` (lógica) y `mi-juego.js` (vista) con la forma `(container, config) => Promise<{ result: 'win'|'lose', stats }>`.
2. Agrega su nombre en `src/minigames/types.js` y regístralo en `src/minigames/index.js`.
3. Úsalo en una ronda: `minigame: { type: 'miJuego', intro: '...' }`.

## La API de la NASA (DONKI)

DONKI es la base de datos pública de clima espacial de la NASA. El endpoint **SEP** devuelve una lista JSON de tormentas de partículas solares.

```bash
# Lo que ya probaste en la terminal:
curl 'https://ccmc.gsfc.nasa.gov/DONKI-API/get/SEP?catalog=M2M_CATALOG&version=Latest'
```

Cosas importantes:

1. **Sin fechas solo mira los últimos 30 días.** Cuando no hubo tormentas recientes responde `[]` (una lista vacía). Eso no es un error. Con `startDate` y `endDate` (formato `yyyy-MM-dd`) pides un rango más amplio:
   ```
   .../get/SEP?startDate=2024-05-01&endDate=2024-05-31&catalog=M2M_CATALOG&version=Latest
   ```
2. **En JavaScript se usa con `fetch`:**
   ```js
   const response = await fetch(url);
   const events = await response.json(); // [{ sepID, eventTime, instruments, linkedEvents, ... }]
   ```
3. **Qué hace el juego** (`src/services/donki.js`):
   - Pide el rango de 30 días; si viene vacío, amplía a 1 año y luego a 5 años.
   - Si la primera fuente falla, prueba `api.nasa.gov` (usa `DEMO_KEY`; para publicar el juego pide tu clave gratis en https://api.nasa.gov y cámbiala en `config.js`).
   - Guarda el resultado 6 horas para no repetir peticiones.
   - Muestra el evento real más reciente en el reporte de la Ronda 1 y ajusta la dificultad del minijuego de vuelo según cuántas erupciones solares están ligadas a ese evento (regla del juego, no una medida científica).
   - Si no hay conexión, el juego sigue con una tormenta de fuerza media.
4. **CORS:** el navegador solo deja leer la respuesta si el servidor de la NASA lo permite. Si algún día deja de funcionar desde tu página, la solución estándar es hacer la petición desde un pequeño servidor propio (proxy). El juego ya está preparado para seguir sin los datos mientras tanto.

## Cambiar la nave

Reemplaza `assets/nave.png` por tu imagen (mismo nombre). El juego la muestra en la portada y como marcador del minijuego de vuelo; funciona mejor si apunta hacia arriba y tiene fondo transparente.
