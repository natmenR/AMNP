# Survive in Space

Survive in Space is a round-based educational web game in English for children. The player commands the **Ares** spacecraft on its way to Mars. In each round, the player reads a report, makes a decision, plays a minigame, and sees how that choice affects three spacecraft resources: **Energy**, **Life Support**, and **Shielding**.

> This document is based solely on the source code reviewed. The [Project status and observations](#11-project-status-and-observations) section identifies incomplete features, placeholders, and inconsistencies.

---

## Table of contents

1. [Overview and purpose](#1-overview-and-purpose)
2. [Technology stack and dependencies](#2-technology-stack-and-dependencies)
3. [Architecture and folder structure](#3-architecture-and-folder-structure)
4. [Configuration and installation](#4-configuration-and-installation)
5. [Database and storage](#5-database-and-storage)
6. [Modules, core logic, and key functions](#6-modules-core-logic-and-key-functions)
7. [Round content](#7-round-content)
8. [Gameplay flow](#8-gameplay-flow)
9. [Testing and code quality](#9-testing-and-code-quality)
10. [How to extend the game](#10-how-to-extend-the-game)
11. [Project status and observations](#11-project-status-and-observations)

---

## 1. Overview and purpose

**What it is.** A decision-based game with minigames that runs entirely on the client without its own backend. Every decision has a cost. If any of the three resources reaches zero, the mission fails.

**What it teaches.** Each round draws on real scenarios from space missions and ends with a “Based on a true story” or “Space Science Note” section.

| Round | Topic | Scientific concept |
|---|---|---|
| 1 | Solar storm (SEP) | Solar radiation can interfere with a star tracker |
| 2 | Mars terrain reconnaissance | Autonomous rover navigation and communication delays |
| 3 | Solar conjunction | Planning tasks when communications between Mars and Earth are interrupted |
| 4 | Return home | The trade-off between using water as radiation shielding and increasing rocket mass |

**Real NASA data.** Round 1 queries NASA's public **DONKI** API for solar energetic particle (SEP) events and adds a page about the most recent event to the report. If the API fails, the game continues with default values.

**Main flow**

~~~
index.html (start screen) → Play → introductory letter → red alert → game.html (cockpit)
Each round → report and story → decision → minigame → outcome and resource changes
Any resource ≤ 0 → “Mission failed”
All four rounds cleared → “Mission Complete”
~~~

---

## 2. Technology stack and dependencies

| Area | Technology |
|---|---|
| Language | JavaScript with ES modules and types documented in JSDoc. The project uses no TypeScript. |
| UI | Native DOM built with custom helpers (`el`, `svg`, `mount`), plus Canvas 2D for minigames |
| Styles | Plain CSS, with one file per component |
| Audio | Web Audio API with synthesized sounds and no audio files |
| Bundling | esbuild (`iife` bundles with source maps) |
| Tests | Native Node.js test runner (`node --test`) with `node:assert/strict` |
| Linting | ESLint with flat configuration |
| Fonts | Google Fonts (Fredoka, Pixelify Sans, Press Start 2P) |
| External API | NASA DONKI (SEP) via `ccmc.gsfc.nasa.gov`, with `api.nasa.gov` as the fallback |

The package is named `survive-in-space`, version `0.2.0`. Its `package.json` sets `"private": true` and `"type": "module"`. All dependencies are development dependencies.

| Package | Declared version |
|---|---|
| `esbuild` | `^0.28.2` |
| `eslint` | `^10.15.0` |
| `@eslint/js` | `^10.0.1` |
| `globals` | `^17.14.0` |

**Node.js requirement.** ESLint 10 declares `^20.19.0 || ^22.13.0 || >=24`, and esbuild requires `>=18`. Choose a Node.js release that meets ESLint's more restrictive range.

| npm script | Command | Purpose |
|---|---|---|
| `build` | `esbuild src/pages/start-page.js src/pages/game-page.js --bundle --format=iife --sourcemap --outdir=dist --entry-names=[name]` | Generates `dist/start-page.js` and `dist/game-page.js` and their source maps |
| `dev` | Same command plus `--servedir=.` | Runs the local development server, normally on port 8000 |
| `test` | `node --test "tests/**/*.test.js"` | Runs the tests |
| `lint` | `eslint .` | Checks the code |

---

## 3. Architecture and folder structure

~~~
juego-espacial/
├── index.html                  Start screen with stars, spacecraft, Play button, intro, and alert lights
├── game.html                   Cockpit with HUD (round and three gauges), stage (#stage), and astronaut
├── package.json / package-lock.json
├── eslint.config.js            ESLint configuration (browser globals for src, Node globals for tests and config)
├── .editorconfig / .gitignore  UTF-8, LF, two spaces / excludes node_modules/
├── README.md                   This document
│
├── assets/                     Images referenced in HTML/CSS (see project observations)
│                               nave-pixel.png, astronauta.png, cabina.png, fondo-estrellas.png
│
├── css/
│   ├── base.css                Variables for colors and fonts, reset, .btn styling, and sound button
│   ├── start.css               Start screen, animated stars, spacecraft, liftoff, intro, and fade
│   ├── letter.css              Parchment-style letter, decisions, resource badges, and end screens
│   ├── alert.css               Red alert vignette, lights, banner, and badge via body.is-alert
│   ├── game.css                Cockpit background, HUD, gauges, astronaut, and animations
│   ├── minigames.css           Console styling for Data check, Shield Zap, Rocket Boost, and other minigames
│   └── mars-recon.css          Mars minigame styles scoped to .mars-recon
│
├── dist/                       Compiled esbuild output loaded by the HTML pages
│   ├── start-page.js(.map)
│   └── game-page.js(.map)
├── src/
│   ├── config.js               Global settings: GAME, PAGES, RESOURCES, STORAGE_KEYS, TIMING, DONKI
│   ├── pages/
│   │   ├── start-page.js       Entry point for index.html
│   │   └── game-page.js        Entry point for game.html (round loop)
│   ├── core/                   Pure logic, independent of the DOM
│   │   ├── resources.js        clamp, applyEffects, findDepleted, formatPercent, and related functions
│   │   └── game-state.js       createGameState and recordOutcome (immutable state)
│   ├── data/                   Content and text
│   │   ├── intro.js            Introduction pages
│   │   ├── game-over.js        Failure messages for depleted resources
│   │   └── rounds/             round-01.js through round-04.js and index.js (ROUNDS array)
│   ├── game/
│   │   ├── round-flow.js       playRound(): report → decision → minigame → outcome
│   │   └── live-data.js        Turns the DONKI summary into a letter page
│   ├── services/
│   │   ├── donki.js            DONKI API client (sources, lookback windows, cache, normalization)
│   │   └── storage.js          Safe localStorage access for strings and JSON
│   ├── audio/sound.js          Web Audio effects and a persistent mute setting
│   ├── ui/                     Interface components
│   │   ├── dom.js              el(), svg(), mount(), sleep(), prefersReducedMotion(), focusTitle()
│   │   ├── letter.js           Letter with typing animation, notes, page controls, and keyboard support
│   │   ├── choice-screen.js    Decision screen (shortcuts 1, 2, 3, …)
│   │   ├── effects.js          Badges showing resource changes
│   │   ├── hud.js              Updates the round, progress, and gauges
│   │   ├── end-screen.js       End screen with buttons
│   │   ├── alert.js            setAlert() / isAlertOn()
│   │   ├── astronaut.js        “happy” / “hit” reactions
│   │   └── sound-toggle.js     “Sound: on/off” button
│   └── minigames/
│       ├── index.js            Registry and runMinigame(type, container, config) dispatcher
│       ├── types.js            MINIGAME_TYPES (list of valid types)
│       ├── flight.js           Power Grid (manualFlight type)
│       ├── flight-model.js     Flight simulation model (see project observations)
│       ├── data-check.js       Data check view (dataCheck type)
│       ├── data-check-model.js Data check logic
│       ├── static-noise.js     TV static drawn on canvas
│       ├── shield-zap.js       Shield Zap (shieldZap type)
│       ├── rocket-boost.js     Rocket Boost (rocketBoost type)
│       ├── solar-conjunction.js Offline Kit and Habitat Drill (offlineKit, habitatDrill)
│       ├── mars-recon-model.js Round 2 logic (map, Dijkstra's algorithm, radar, evaluation)
│       └── mars-recon.js       Round 2 canvas view and controls (three routes)
│
└── tests/
    ├── helpers.js              seededRandom(), memoryCache()
    ├── resources.test.js
    ├── donki.test.js
    ├── data-check-model.test.js
    ├── flight-model.test.js
    └── rounds-data.test.js
~~~

### Design principles visible in the code

- **Logic independent of the view.** `core/`, `*-model.js`, and `donki.js` operate independently of the DOM.
- **Content stored separately.** Text, options, and percentages live in `src/data/` and `src/config.js`.
- **DOM construction with `createElement` and `textContent`.** The helpers in `ui/dom.js` avoid `innerHTML`, so external data such as API responses are rendered as text.
- **Immutable state.** `recordOutcome` and `applyEffects` return new objects.
- **Linear flow with `async/await`.** Each screen returns a `Promise` that resolves when the player finishes interacting with it.
- **Accessibility.** The UI uses `aria-live` regions, `role="progressbar"`, title focus via `focusTitle`, keyboard shortcuts, and support for `prefers-reduced-motion`.

---

## 4. Configuration and installation

### Environment variables

The project has no environment variables, `.env` file, or access to `process.env`. All settings live in `src/config.js`.

| Constant | Contents |
|---|---|
| `GAME` | `playerName: 'D. Diaz'`, `totalRounds: 4`, `totalDays: 300` |
| `PAGES` | `start: 'index.html'`, `game: 'game.html'` |
| `RESOURCES` | `max: 100`, `lowThreshold: 25`, starting values of 70/70/70, and labels |
| `STORAGE_KEYS` | `survive-in-space:sound`, `survive-in-space:sep-cache` |
| `TIMING` | `liftOffMs 1400`, `fadeOutMs 850`, `typeMsPerChar 22`, `liveDataWaitMs 3500`, `minigameEndMs 1500` |
| `DONKI` | `timeoutMs 5000`, `lookbackDays [30, 365, 1825]`, `cacheTtlMs` of 6 hours, and a list of `sources` |

> **API key.** The `api-nasa-gov` source uses `api_key: 'DEMO_KEY'`, NASA's public test key with a low rate limit. The key is set directly in `src/config.js`. A comment in that file recommends requesting a free key from <https://api.nasa.gov> before publishing the game. The project contains no other secrets.

### Run the game locally

**To play without Node.js**, double-click `index.html`. The HTML pages load the precompiled `dist/*.js` bundles. The game needs the files in `assets/`. Internet access is needed for Google Fonts and optional NASA data.

**For development**

~~~bash
# 1. Install development dependencies
npm install

# 2. Run the development server with automatic rebuilding (esbuild --servedir)
npm run dev          # Usually opens at http://localhost:8000

# 3. Build the bundles in dist/ after editing src/
npm run build

# 4. Run tests and lint checks
npm test
npm run lint
~~~

`index.html` and `game.html` load `dist/start-page.js` and `dist/game-page.js`. After editing `src/`, run `npm run build` or use `npm run dev` to see the new version in the browser.

---

## 5. Database and storage

The game has no database or backend. Game state stays in memory for the session. The only two stored values use `localStorage`, with `try/catch` handling in `services/storage.js` because access may fail in private browsing.

| Key | Contents | Written by |
|---|---|---|
| `survive-in-space:sound` | `"on"` or `"off"` (sound preference) | `audio/sound.js` (`toggle`) |
| `survive-in-space:sep-cache` | JSON `{ savedAt, result }` with the latest DONKI response, valid for six hours | `services/donki.js` (`defaultCache.save`) |

### In-memory data structures

~~~js
// Resources (0–100)
Resources = { energy, lifeSupport, shielding }

// Game state
GameState = { resources: Resources, history: HistoryEntry[] }
HistoryEntry = { roundId, choiceId, result: 'win'|'lose', outcomeId }

// Round (src/data/rounds/*.js). See the typedef in round-01.js.
Round = {
  id, number, title, speaker, alert,
  report:   { liveData: boolean, pages: LetterPage[] },
  decision: { pages, title, prompt, options: [{ id, label, minigame: {type, intro, config?}, outcomes: {win, lose?} }] },
  outcomes: { [outcomeId]: { tone: 'good'|'mixed'|'bad', text, effects: Partial<Resources> } },
  fact:     { title, text }
}

// Normalized SEP event (donki.js)
SepEvent = { id, time: Date|null, instruments: string[], linkedEvents: string[] }
SepResult = { status: 'live'|'cached'|'unavailable', events, windowDays, sourceId }
~~~

---

## 6. Modules, core logic, and key functions

### 6.1 Start screen entry point (`src/pages/start-page.js`)

1. Wires up the sound toggle and the **Play** button. Enter or Space also activates **Play**.
2. `start()` initializes audio, plays `liftOff`, and adds `body.is-lifting-off` to hide the text and move the spacecraft upward. It calls `showIntro()` after `TIMING.liftOffMs`.
3. `showIntro()` opens a four-page letter from `buildIntroPages(GAME.playerName)`. The player can skip it with ×. The final page turns on the red alert with `setAlert(true)` and `sound.alarm()`.
4. When the letter closes, the script adds `body.is-leaving` to fade to black and redirects to `game.html` after `TIMING.fadeOutMs`.
5. On a `pageshow` event with `event.persisted`, the script reloads the page when the user returns with the browser's Back button.

### 6.2 Game entry point (`src/pages/game-page.js`)

- Creates the HUD, astronaut, and sound toggle.
- Queries DONKI once with `getLatestSepEvents().then(summarizeStorm)` while gameplay proceeds. If the query fails, it uses an `unavailable` summary.
- `runGame()` creates the initial state and loops over `ROUNDS` with `playRound(...)`. After each round it calls `findDepleted(state.resources)`. If any resource is ≤ 0, it displays **“Mission failed”** with a message from `GAME_OVER_TEXT` and the buttons **“Try again”** and **“Back to start.”**
- After all rounds are cleared, it displays **“Mission Complete - Welcome Home!”** It displays an under-construction message if `lastRound.number < GAME.totalRounds`.

### 6.3 Round flow (`src/game/round-flow.js`)

`playRound({ round, state, ui, getStormSummary })` runs the following steps.

1. Updates the HUD with `renderRound` and `renderResources`, applies `setAlert(round.alert)`, and plays `sound.alarm()` when the alert is on.
2. If `report.liveData` is `true`, waits for the DONKI summary using `Promise.race` with a timeout of `TIMING.liveDataWaitMs` (3.5 seconds).
3. Opens a single letter containing the report pages, an optional NASA data page, and the decision pages. The final button reads **“Decide.”**
4. `askChoice(...)` displays the options and returns the selected `id`.
5. Opens a letter with `option.minigame.intro` and a **“Start”** button, then runs `runMinigame(type, stage, { ...config, level })`.
6. Resolves `outcomeId` with `option.outcomes[result]`, falling back to the first value in `outcomes` when the mapping is absent. It calls `recordOutcome` to apply the effects and turns off the alert. For `tone === 'bad'`, it plays `lose` and triggers the astronaut's `hit` reaction. For other tones, it uses `calm` and `happy`.
7. Displays the outcome letter with the result text, badges showing the actual resource changes, and the science note.

### 6.4 Resources and state (`src/core/`)

| Function | Description |
|---|---|
| `clamp(value, max)` | Restricts a value to `[0, max]` |
| `createResources(start)` | Copies the starting values |
| `applyEffects(resources, effects, max)` | Returns `{ resources, applied }`, where `applied` records the actual change after clamping |
| `findDepleted(resources)` | Returns the first resource at ≤ 0 in the order `energy`, `lifeSupport`, `shielding`, or `null` |
| `formatPercent(delta)` | Returns values such as `"+5%"` or `"−15%"`, using the Unicode minus sign `\u2212` |
| `createGameState()` | Creates the initial state (70/70/70 and an empty history) |
| `recordOutcome(state, entry, effects)` | Produces the new state and history, along with `applied` changes |

### 6.5 DONKI client (`src/services/donki.js`)

`getLatestSepEvents(options)` works as follows.

1. Checks the six-hour cache. When a valid entry exists, it returns `status: 'cached'`.
2. For each source (`ccmc`, then `api-nasa-gov`) and lookback window (30, 365, then 1825 days), it calls `fetch` on `.../SEP` with `startDate` and `endDate` in `yyyy-MM-dd` format. `AbortController` enforces a five-second timeout.
3. If a window contains events, `normalizeResponse` orders the normalized events from newest to oldest. The client caches the result and returns `status: 'live'`.
4. If a source responds with no events even in the largest window, it returns `live` with an empty list.
5. On a network error, CORS error, or non-2xx HTTP status, it tries the next source. If every source fails, it returns `status: 'unavailable'`.

`summarizeStorm(result)` returns `{ latest, count, windowDays, level, hasLiveData }`. The game uses its own severity rule. The level is `strong` for two or more linked eruptions, `medium` for one eruption or when data is unavailable, and `mild` for zero linked eruptions.

**Expected API response** (JSON array)  
`[{ sepID, eventTime, instruments: [{displayName}], linkedEvents: [{activityID}], ... }]`. An empty array (`[]`) is a valid response.

`buildLiveDataPage(summary)` in `game/live-data.js` generates the **“Real NASA data”** page with the date, instrument, linked eruptions, number of storms NASA recorded in the lookback window, and severity level. It displays fallback text when data is unavailable.

### 6.6 Interface (`src/ui/`)

- **`dom.js`** provides `el(tag, attrs, ...children)` with support for `class`, `dataset`, `on`, and Boolean attributes, plus `svg(...)`, `mount(container, ...nodes)`, `sleep(ms)`, `prefersReducedMotion()`, and `focusTitle(root)`.
- **`letter.js`** provides `openLetter({ container, pages, speaker, finalLabel, skippable, onShow })`. The letter uses a typing animation (22 ms per character with pauses at `.!?` and `,`), ticking sounds, “Quick science” notes, optional `page.extra()` content, pagination dots, and screen-reader text. Click, Enter, Space, or the Right Arrow advances the letter. The first input during typing reveals the rest of the text. With `prefers-reduced-motion`, text appears immediately.
- **`choice-screen.js`** provides `askChoice(...)`, which lists the options and supports shortcuts `1`, `2`, `3`, and so on.
- **`hud.js`** provides `renderResources` (value, bar width, `aria-valuenow`, and `is-low` at ≤ 25) and `renderRound` (“Round X of N” and a progress bar at `(round-1)/total`).
- **`effects.js`** displays badges such as “Energy −25%” for resources that change and shows “No changes” when none change.
- **`end-screen.js`**, **`alert.js`**, **`astronaut.js`**, and **`sound-toggle.js`** handle end screens, the global alert, astronaut reactions, and the sound toggle, respectively.

### 6.7 Sound (`src/audio/sound.js`)

The module synthesizes tones and filtered noise at low volume through the Web Audio API. It exposes `init`, `isMuted`, `toggle`, `tick`, `page`, `choose`, `liftOff`, `alarm`, `calm`, `thrust`, `glitch`, `warning`, `good`, `bad`, `win`, and `lose`. It resumes the `AudioContext` on the first `pointerdown` or `keydown` to comply with browser autoplay policies.

### 6.8 Minigames (`src/minigames/`)

Minigames share the signature `(container, config) => Promise<{ result: 'win'|'lose', stats }>`. The registry lives in `index.js`, which throws an error on load if any type in `MINIGAME_TYPES` is missing from the registry.

| Type | Round and option | Description and rules |
|---|---|---|
| `manualFlight` (*Power Grid*) | Round 1 · “Leave the shelter” | Four systems (Solar Panels, Flight Computer, Star Tracker, Thrusters) start at `[ON, OFF, ON, OFF]`. Four switches each toggle two adjacent systems (0–1, 1–2, 2–3, 3–0). Turn every system ON within four moves or receive `lose`. |
| `dataCheck` | Round 1 · “Stay inside” | Compare the arrow from the star tracker, shown with static, to the arrow from the backup sensors on eight cards. Choose “Keep” if they match and “Clear” if they differ (keys `1` and `2`). A mistake repeats the card and increments `mistakes`. The minigame always ends in `win`. The generator creates at least three false cards and at least three valid cards. The arrows on false cards differ by at least 90°. |
| `marsRoverDrive` / `marsRoutePlanner` / `marsRadarScan` | Round 2 · A / B / C | See [Section 6.9](#69-round-2--mars-recon). |
| `offlineKit` | Round 3 · “Pack an Offline Kit” | Five files compete for six storage units. Save the three required files (*Safety checklist* 2, *Base manual* 2, *Mission log* 2). The distractors are *Rover photo album* (3) and *Crew movie* (4). Toggle files to save or remove them. “Test Offline Kit” returns `win` or `lose`. |
| `habitatDrill` | Round 3 · “Run the Habitat Drill” | Respond to three alarms in sequence (air → filter, cold → heater, battery → pause the science lab). Each alarm has a clue from the manual. Two mistakes produce `lose`. Three correct responses produce `win`. |
| `shieldZap` | Round 4 · “Heavy Water Shield” | Destroy six rays within 18 seconds. A ray appears every two seconds and lasts three seconds. Click, tap, or press Enter or Space. “Skip” counts as a loss. |
| `rocketBoost` | Round 4 · “Fly Light and Fast” | A needle moves back and forth at speed 65. Press BLAST OFF while it is in the green zone (38–62) three times. Three misses produce `lose`. |

`startStatic(canvas, opts)` in `static-noise.js` draws TV static on a small canvas and returns a function that stops it.

### 6.9 Round 2 — Mars Recon

**Model (`mars-recon-model.js`).** The model runs independently of the DOM.

- `createMarsMap()` builds a fixed 19 × 11 grid (`#` for obstacles, `.` for traversable tiles). Tiles where `(x*7 + y*11) % 9 === 0` are rocky and cost three battery units. Other traversable tiles cost one.
- The habitat is at `[1, 1]`. Science sites are **ALPHA** `[5,3]`, **BETA** `[12,3]`, and **GAMMA** `[16,8]`.
- `shortestPath(start, destination)` uses Dijkstra's algorithm with terrain costs and a queue maintained with `sort`. `calculateTour(order)` calculates a route from the habitat through the science sites and back to the habitat. `minimumTour()` evaluates all six permutations.
- `INITIAL_BATTERY = minimumTour().cost + 38` (`batteryBuffer`).
- The radar has four sectors (A at 40° for *regolith*, B at 125° for *rock*, C at 220° for *dune*, and D at 310° for *slope*), a tolerance of ±15°, and a limit of eight scans.

| Function | Route | Description |
|---|---|---|
| `createMarsSession(route)` | All | Creates the initial session with `status: 'running'` |
| `moveMarsRover(session, dx, dy)` | A | Moves the rover one tile and deducts battery power. Returns `reserveWarning` if the remaining battery is insufficient for the return trip. The player wins by returning to the habitat after scanning all three sites and loses by running out of battery outside the habitat. |
| `scanMarsSite(session)` | A | Scans the site under the rover |
| `toggleMarsWaypoint`, `evaluateMarsPlan`, `startMarsExpedition`, `stepMarsExpedition` | B | Handle route planning, cost estimates including the return trip, and step-by-step execution |
| `aimMarsRadar`, `scanMarsSector`, `classifyMarsSector`, `getCorrectMarsSectors` | C | Handle antenna heading, scanning, and classification. Four correct classifications win the minigame. |
| `endMarsSession(session)` | All | Ends the session with `lose` and `reason: 'ended-early'` |
| `evaluateMarsMission(session)` | All | Returns `{ route, success, partial, status, mapQuality, ... }` |

**View (`mars-recon.js`).** `runMarsRecon(container, { route })` draws the terrain for routes A and B or the radar for route C on a 960 × 590 `<canvas>`. The sidebar shows battery power, progress, controls, and the **“End & review (counts as a miss)”** button. The module exports `runMarsRoverDrive`, `runMarsRoutePlanner`, and `runMarsRadarScan`.

- **A — Manual driving.** Use WASD or the arrow keys to move and Space to scan. Holding an on-screen button repeats the action every 145 ms.
- **B — Route planner.** Select the three sites in order. The planner displays the dotted route and estimated cost. **“EXECUTE PLAN”** animates the expedition with `requestAnimationFrame` at 75 ms per step.
- **C — Radar.** Use the 0–359° heading slider, sector selector, and **“SCAN SECTOR”** button, then classify the terrain as `regolith`, `rock`, `dune`, or `slope`.

At the end, `result` equals `evaluation.status` (`'win'` or `'lose'`). `stats` includes the full evaluation, the route, and `reason`.

---

## 7. Round content

The tables show changes in percentage points for `energy`, `lifeSupport`, and `shielding`. Each resource starts at 70.

**Round 1 — Solar Storm** (alert on, real NASA data)

| Option → Minigame | Outcome | Tone | Energy | Life Support | Shielding |
|---|---|---|---|---|---|
| Leave the shelter → `manualFlight` | `leave-win` | mixed | −25 | −15 | +5 |
| | `leave-lose` | bad | −30 | −20 | −10 |
| Stay inside → `dataCheck` | `stay-win` | good | −5 | +10 | +5 |

**Round 2 — Mars Terrain Reconnaissance** (narrated by AURA)

| Option → Minigame | Outcome | Tone | Energy | Life Support | Shielding |
|---|---|---|---|---|---|
| A — Rocky Shortcut → `marsRoverDrive` | `rover-win` | good | −5 | 0 | 0 |
| | `rover-lose` | mixed | −12 | −3 | 0 |
| B — Surveyed Corridor → `marsRoutePlanner` | `planner-win` | good | −3 | 0 | 0 |
| | `planner-lose` | mixed | −10 | −2 | 0 |
| C — Remote Mapping → `marsRadarScan` | `radar-win` | good | −4 | 0 | 0 |
| | `radar-lose` | mixed | −8 | 0 | −3 |

**Round 3 — Solar Conjunction**

| Option → Minigame | Outcome | Tone | Energy | Life Support | Shielding |
|---|---|---|---|---|---|
| Pack an Offline Kit → `offlineKit` | `kit-win` | good | −4 | 0 | 0 |
| | `kit-lose` | mixed | −8 | 0 | 0 |
| Run the Habitat Drill → `habitatDrill` | `drill-win` | good | −3 | 0 | 0 |
| | `drill-lose` | mixed | −7 | −5 | 0 |

**Round 4 — Return Home** (alert on)

| Option → Minigame | Outcome | Tone | Energy | Life Support | Shielding |
|---|---|---|---|---|---|
| Keep the Heavy Water Shield → `shieldZap` | `shield-win` | good | −20 | 0 | +15 |
| | `shield-lose` | mixed | −30 | −10 | +10 |
| Fly Light and Fast → `rocketBoost` | `boost-win` | good | −5 | 0 | −10 |
| | `boost-lose` | bad | −25 | −15 | −10 |

---

## 8. Gameplay flow

1. **Start screen (`index.html`).** The player sees the title, the spacecraft, and the **▶ Play** button. Enter or Space also starts the game. The player can toggle sound.
2. **Liftoff and introduction.** The text disappears, the spacecraft rises, and a four-page letter appears. The player can skip it with ×. The red alert turns on at the last page.
3. **Cockpit (`game.html`).** The screen fades to black before loading the game. The HUD displays *Round 1 of 4* and the three gauges at 70%.
4. **Round.**
   1. Read the report and story. Round 1 can include a page with real NASA data.
   2. Click an option or use keys `1`, `2`, or `3`.
   3. Read the minigame introduction and play.
   4. Review the result text, badges showing the actual resource changes, and a “Based on a true story” or “Space Science Note” section. The gauges update and the astronaut reacts.
5. **Resource check.** If any resource has reached zero, the **Mission failed** screen appears with **Try again** and **Back to start**. Otherwise, the player proceeds to the next round.
6. **Ending.** After Round 4, the game displays **Mission Complete - Welcome Home!** with **Play again** and **Back to start**.

---

## 9. Testing and code quality

~~~bash
npm test      # node --test "tests/**/*.test.js"
npm run lint  # eslint .
~~~

| File | Coverage |
|---|---|
| `resources.test.js` | `applyEffects` (immutability, clamping to 0–100, and actual changes), `findDepleted`, `formatPercent`, `clamp`, `createResources`, and `recordOutcome` |
| `donki.test.js` | URL construction, normalization, expanding the lookback window, fallback between sources, `unavailable` status, caching, and storm levels |
| `data-check-model.test.js` | Card generation using seeds 1–200, angular separation, `isCorrect`, and `submitAnswer` |
| `flight-model.test.js` | Flight simulation in `flight-model.js`, including thrust cost, failure from depleted energy, increasing radiation, and difficulty settings |
| `rounds-data.test.js` | Valid structure for the four rounds, registered minigame types, numbering 1–4, effects for Rounds 1 and 4, and the absence of emoji, `%`, and agency names in Round 4 text |

`tests/helpers.js` provides `seededRandom(seed)`, a deterministic random number generator, and `memoryCache()`.

**Linting.** `eslint.config.js` excludes `dist/` and `node_modules/`. It configures `src/**` with `ecmaVersion 2023`, browser globals, and the rules `no-unused-vars` (allowing arguments prefixed with `_`), `eqeqeq`, and `prefer-const`.

**Modules without automated tests.** `mars-recon-model.js`, `solar-conjunction.js`, `shield-zap.js`, `rocket-boost.js`, and the components in `ui/`.

---

## 10. How to extend the game

### Add or modify a round

1. Copy `src/data/rounds/round-01.js`, which contains the `Round` typedef, and adjust the text, options, minigames, and effects.
2. Import the round and add it to `ROUNDS` in `src/data/rounds/index.js`.
3. Define at least `outcomes.win` for every option and ensure that every referenced `outcomeId` exists in `round.outcomes`.
4. If the round count changes, update `GAME.totalRounds` in `src/config.js`. The HUD and game ending both use it, and `rounds-data.test.js` currently expects exactly four rounds.
5. Run `npm run build` and `npm test`.

### Add a minigame

1. Create the view and, where appropriate, a `*-model.js` file for the logic. Use the signature `(container, config) => Promise<{ result, stats }>`.
2. Add the type name to `src/minigames/types.js` and register it in `src/minigames/index.js`.
3. Reference it in an option, for example `minigame: { type: 'myGame', intro: '...' }`.

---

## 11. Project status and observations

1. **Inconsistent round counts and mission dates.** The code defines **four rounds** in `GAME.totalRounds`. `game.html` contains the placeholder “Round 1 of 10,” which the game replaces on startup. The previous README also mentioned 10 rounds. `GAME.totalDays = 300` is unused. The “300 days” in the introduction is hardcoded in `intro.js`. Round 2 says “DAY 980,” a comment in `mars-recon` says “980 DAYS: MISSION MARS,” and the canvas displays “SOL 264.”
2. **The flight simulation model is disconnected from the interface.** `flight-model.js` models score, radiation, and energy and has automated tests. “Leave the shelter” opens *Power Grid* in `flight.js`, which does not import the model. The Round 1 descriptions mentioning keeping the ship straight and a radiation alarm still describe the flight simulation.
3. **NASA data only affects the report text.** `round-flow.js` passes `level` (`mild`, `medium`, or `strong`) to each minigame. The minigames currently ignore it, so it only changes the text on the “Real NASA data” page.
4. **`dataCheck` always ends in a win.** The `stay` option only declares `outcomes.win`, and the minigame only resolves to `win`.
5. **Round 3 minigames handle the ending differently.** `offlineKit` and `habitatDrill` omit the win or loss sound and the `TIMING.minigameEndMs` delay used by the other minigames.
6. **Round 2 may require the player to end the minigame manually.** Route C has no automatic loss when the player uses all eight scans. Players can reclassify sectors without penalty and must use “End & review” to end the session if they have not won. Route B behaves similarly when the plan is invalid. `evaluateMarsMission` calculates `partial` and `mapQuality`, while `round-02.js` only maps `win` and `lose`.
7. **Radar hint.** The UI shows each sector's approximate heading (“signal near X°”), which makes route C easier.
8. **Round 2 option labels and internal titles differ.** The options are “Rocky Shortcut,” “Surveyed Corridor,” and “Remote Mapping.” Their internal titles are “Manual rover driving,” “Autonomous route planning,” and “Remote terrain mapping.”
9. **Image assets were outside the scope of the source review.** The code references `assets/nave-pixel.png`, `assets/astronauta.png`, `assets/cabina.png`, and `assets/fondo-estrellas.png`. The reviewed material did not include the images, so their existence remains unverified. The previous README named `assets/nave.png`, whereas `index.html` references `assets/nave-pixel.png`.
10. **Network dependencies.** Google Fonts and the DONKI API require internet access. The game can run offline using system fonts and the default `medium` storm level.
11. **Public test key in the client.** `DEMO_KEY` has a low rate limit. The source recommends replacing it before publishing.
12. **Language.** The UI and game text are in English. Most code comments are in Spanish, with English comments in the `mars-recon*` files.# Survive in Space

Survive in Space is a round-based educational web game in English for children. The player commands the **Ares** spacecraft on its way to Mars. In each round, the player reads a report, makes a decision, plays a minigame, and sees how that choice affects three spacecraft resources: **Energy**, **Life Support**, and **Shielding**.

> This document is based solely on the source code reviewed. The [Project status and observations](#11-project-status-and-observations) section identifies incomplete features, placeholders, and inconsistencies.

---

## Table of contents

1. [Overview and purpose](#1-overview-and-purpose)
2. [Technology stack and dependencies](#2-technology-stack-and-dependencies)
3. [Architecture and folder structure](#3-architecture-and-folder-structure)
4. [Configuration and installation](#4-configuration-and-installation)
5. [Database and storage](#5-database-and-storage)
6. [Modules, core logic, and key functions](#6-modules-core-logic-and-key-functions)
7. [Round content](#7-round-content)
8. [Gameplay flow](#8-gameplay-flow)
9. [Testing and code quality](#9-testing-and-code-quality)
10. [How to extend the game](#10-how-to-extend-the-game)
11. [Project status and observations](#11-project-status-and-observations)

---

## 1. Overview and purpose

**What it is.** A decision-based game with minigames that runs entirely on the client without its own backend. Every decision has a cost. If any of the three resources reaches zero, the mission fails.

**What it teaches.** Each round draws on real scenarios from space missions and ends with a “Based on a true story” or “Space Science Note” section.

| Round | Topic | Scientific concept |
|---|---|---|
| 1 | Solar storm (SEP) | Solar radiation can interfere with a star tracker |
| 2 | Mars terrain reconnaissance | Autonomous rover navigation and communication delays |
| 3 | Solar conjunction | Planning tasks when communications between Mars and Earth are interrupted |
| 4 | Return home | The trade-off between using water as radiation shielding and increasing rocket mass |

**Real NASA data.** Round 1 queries NASA's public **DONKI** API for solar energetic particle (SEP) events and adds a page about the most recent event to the report. If the API fails, the game continues with default values.

**Main flow**

~~~
index.html (start screen) → Play → introductory letter → red alert → game.html (cockpit)
Each round → report and story → decision → minigame → outcome and resource changes
Any resource ≤ 0 → “Mission failed”
All four rounds cleared → “Mission Complete”
~~~

---

## 2. Technology stack and dependencies

| Area | Technology |
|---|---|
| Language | JavaScript with ES modules and types documented in JSDoc. The project uses no TypeScript. |
| UI | Native DOM built with custom helpers (`el`, `svg`, `mount`), plus Canvas 2D for minigames |
| Styles | Plain CSS, with one file per component |
| Audio | Web Audio API with synthesized sounds and no audio files |
| Bundling | esbuild (`iife` bundles with source maps) |
| Tests | Native Node.js test runner (`node --test`) with `node:assert/strict` |
| Linting | ESLint with flat configuration |
| Fonts | Google Fonts (Fredoka, Pixelify Sans, Press Start 2P) |
| External API | NASA DONKI (SEP) via `ccmc.gsfc.nasa.gov`, with `api.nasa.gov` as the fallback |

The package is named `survive-in-space`, version `0.2.0`. Its `package.json` sets `"private": true` and `"type": "module"`. All dependencies are development dependencies.

| Package | Declared version |
|---|---|
| `esbuild` | `^0.28.2` |
| `eslint` | `^10.15.0` |
| `@eslint/js` | `^10.0.1` |
| `globals` | `^17.14.0` |

**Node.js requirement.** ESLint 10 declares `^20.19.0 || ^22.13.0 || >=24`, and esbuild requires `>=18`. Choose a Node.js release that meets ESLint's more restrictive range.

| npm script | Command | Purpose |
|---|---|---|
| `build` | `esbuild src/pages/start-page.js src/pages/game-page.js --bundle --format=iife --sourcemap --outdir=dist --entry-names=[name]` | Generates `dist/start-page.js` and `dist/game-page.js` and their source maps |
| `dev` | Same command plus `--servedir=.` | Runs the local development server, normally on port 8000 |
| `test` | `node --test "tests/**/*.test.js"` | Runs the tests |
| `lint` | `eslint .` | Checks the code |

---

## 3. Architecture and folder structure

~~~
juego-espacial/
├── index.html                  Start screen with stars, spacecraft, Play button, intro, and alert lights
├── game.html                   Cockpit with HUD (round and three gauges), stage (#stage), and astronaut
├── package.json / package-lock.json
├── eslint.config.js            ESLint configuration (browser globals for src, Node globals for tests and config)
├── .editorconfig / .gitignore  UTF-8, LF, two spaces / excludes node_modules/
├── README.md                   This document
│
├── assets/                     Images referenced in HTML/CSS (see project observations)
│                               nave-pixel.png, astronauta.png, cabina.png, fondo-estrellas.png
│
├── css/
│   ├── base.css                Variables for colors and fonts, reset, .btn styling, and sound button
│   ├── start.css               Start screen, animated stars, spacecraft, liftoff, intro, and fade
│   ├── letter.css              Parchment-style letter, decisions, resource badges, and end screens
│   ├── alert.css               Red alert vignette, lights, banner, and badge via body.is-alert
│   ├── game.css                Cockpit background, HUD, gauges, astronaut, and animations
│   ├── minigames.css           Console styling for Data check, Shield Zap, Rocket Boost, and other minigames
│   └── mars-recon.css          Mars minigame styles scoped to .mars-recon
│
├── dist/                       Compiled esbuild output loaded by the HTML pages
│   ├── start-page.js(.map)
│   └── game-page.js(.map)
├── src/
│   ├── config.js               Global settings: GAME, PAGES, RESOURCES, STORAGE_KEYS, TIMING, DONKI
│   ├── pages/
│   │   ├── start-page.js       Entry point for index.html
│   │   └── game-page.js        Entry point for game.html (round loop)
│   ├── core/                   Pure logic, independent of the DOM
│   │   ├── resources.js        clamp, applyEffects, findDepleted, formatPercent, and related functions
│   │   └── game-state.js       createGameState and recordOutcome (immutable state)
│   ├── data/                   Content and text
│   │   ├── intro.js            Introduction pages
│   │   ├── game-over.js        Failure messages for depleted resources
│   │   └── rounds/             round-01.js through round-04.js and index.js (ROUNDS array)
│   ├── game/
│   │   ├── round-flow.js       playRound(): report → decision → minigame → outcome
│   │   └── live-data.js        Turns the DONKI summary into a letter page
│   ├── services/
│   │   ├── donki.js            DONKI API client (sources, lookback windows, cache, normalization)
│   │   └── storage.js          Safe localStorage access for strings and JSON
│   ├── audio/sound.js          Web Audio effects and a persistent mute setting
│   ├── ui/                     Interface components
│   │   ├── dom.js              el(), svg(), mount(), sleep(), prefersReducedMotion(), focusTitle()
│   │   ├── letter.js           Letter with typing animation, notes, page controls, and keyboard support
│   │   ├── choice-screen.js    Decision screen (shortcuts 1, 2, 3, …)
│   │   ├── effects.js          Badges showing resource changes
│   │   ├── hud.js              Updates the round, progress, and gauges
│   │   ├── end-screen.js       End screen with buttons
│   │   ├── alert.js            setAlert() / isAlertOn()
│   │   ├── astronaut.js        “happy” / “hit” reactions
│   │   └── sound-toggle.js     “Sound: on/off” button
│   └── minigames/
│       ├── index.js            Registry and runMinigame(type, container, config) dispatcher
│       ├── types.js            MINIGAME_TYPES (list of valid types)
│       ├── flight.js           Power Grid (manualFlight type)
│       ├── flight-model.js     Flight simulation model (see project observations)
│       ├── data-check.js       Data check view (dataCheck type)
│       ├── data-check-model.js Data check logic
│       ├── static-noise.js     TV static drawn on canvas
│       ├── shield-zap.js       Shield Zap (shieldZap type)
│       ├── rocket-boost.js     Rocket Boost (rocketBoost type)
│       ├── solar-conjunction.js Offline Kit and Habitat Drill (offlineKit, habitatDrill)
│       ├── mars-recon-model.js Round 2 logic (map, Dijkstra's algorithm, radar, evaluation)
│       └── mars-recon.js       Round 2 canvas view and controls (three routes)
│
└── tests/
    ├── helpers.js              seededRandom(), memoryCache()
    ├── resources.test.js
    ├── donki.test.js
    ├── data-check-model.test.js
    ├── flight-model.test.js
    └── rounds-data.test.js
~~~

### Design principles visible in the code

- **Logic independent of the view.** `core/`, `*-model.js`, and `donki.js` operate independently of the DOM.
- **Content stored separately.** Text, options, and percentages live in `src/data/` and `src/config.js`.
- **DOM construction with `createElement` and `textContent`.** The helpers in `ui/dom.js` avoid `innerHTML`, so external data such as API responses are rendered as text.
- **Immutable state.** `recordOutcome` and `applyEffects` return new objects.
- **Linear flow with `async/await`.** Each screen returns a `Promise` that resolves when the player finishes interacting with it.
- **Accessibility.** The UI uses `aria-live` regions, `role="progressbar"`, title focus via `focusTitle`, keyboard shortcuts, and support for `prefers-reduced-motion`.

---

## 4. Configuration and installation

### Environment variables

The project has no environment variables, `.env` file, or access to `process.env`. All settings live in `src/config.js`.

| Constant | Contents |
|---|---|
| `GAME` | `playerName: 'D. Diaz'`, `totalRounds: 4`, `totalDays: 300` |
| `PAGES` | `start: 'index.html'`, `game: 'game.html'` |
| `RESOURCES` | `max: 100`, `lowThreshold: 25`, starting values of 70/70/70, and labels |
| `STORAGE_KEYS` | `survive-in-space:sound`, `survive-in-space:sep-cache` |
| `TIMING` | `liftOffMs 1400`, `fadeOutMs 850`, `typeMsPerChar 22`, `liveDataWaitMs 3500`, `minigameEndMs 1500` |
| `DONKI` | `timeoutMs 5000`, `lookbackDays [30, 365, 1825]`, `cacheTtlMs` of 6 hours, and a list of `sources` |

> **API key.** The `api-nasa-gov` source uses `api_key: 'DEMO_KEY'`, NASA's public test key with a low rate limit. The key is set directly in `src/config.js`. A comment in that file recommends requesting a free key from <https://api.nasa.gov> before publishing the game. The project contains no other secrets.

### Run the game locally

**To play without Node.js**, double-click `index.html`. The HTML pages load the precompiled `dist/*.js` bundles. The game needs the files in `assets/`. Internet access is needed for Google Fonts and optional NASA data.

**For development**

~~~bash
# 1. Install development dependencies
npm install

# 2. Run the development server with automatic rebuilding (esbuild --servedir)
npm run dev          # Usually opens at http://localhost:8000

# 3. Build the bundles in dist/ after editing src/
npm run build

# 4. Run tests and lint checks
npm test
npm run lint
~~~

`index.html` and `game.html` load `dist/start-page.js` and `dist/game-page.js`. After editing `src/`, run `npm run build` or use `npm run dev` to see the new version in the browser.

---

## 5. Database and storage

The game has no database or backend. Game state stays in memory for the session. The only two stored values use `localStorage`, with `try/catch` handling in `services/storage.js` because access may fail in private browsing.

| Key | Contents | Written by |
|---|---|---|
| `survive-in-space:sound` | `"on"` or `"off"` (sound preference) | `audio/sound.js` (`toggle`) |
| `survive-in-space:sep-cache` | JSON `{ savedAt, result }` with the latest DONKI response, valid for six hours | `services/donki.js` (`defaultCache.save`) |

### In-memory data structures

~~~js
// Resources (0–100)
Resources = { energy, lifeSupport, shielding }

// Game state
GameState = { resources: Resources, history: HistoryEntry[] }
HistoryEntry = { roundId, choiceId, result: 'win'|'lose', outcomeId }

// Round (src/data/rounds/*.js). See the typedef in round-01.js.
Round = {
  id, number, title, speaker, alert,
  report:   { liveData: boolean, pages: LetterPage[] },
  decision: { pages, title, prompt, options: [{ id, label, minigame: {type, intro, config?}, outcomes: {win, lose?} }] },
  outcomes: { [outcomeId]: { tone: 'good'|'mixed'|'bad', text, effects: Partial<Resources> } },
  fact:     { title, text }
}

// Normalized SEP event (donki.js)
SepEvent = { id, time: Date|null, instruments: string[], linkedEvents: string[] }
SepResult = { status: 'live'|'cached'|'unavailable', events, windowDays, sourceId }
~~~

---

## 6. Modules, core logic, and key functions

### 6.1 Start screen entry point (`src/pages/start-page.js`)

1. Wires up the sound toggle and the **Play** button. Enter or Space also activates **Play**.
2. `start()` initializes audio, plays `liftOff`, and adds `body.is-lifting-off` to hide the text and move the spacecraft upward. It calls `showIntro()` after `TIMING.liftOffMs`.
3. `showIntro()` opens a four-page letter from `buildIntroPages(GAME.playerName)`. The player can skip it with ×. The final page turns on the red alert with `setAlert(true)` and `sound.alarm()`.
4. When the letter closes, the script adds `body.is-leaving` to fade to black and redirects to `game.html` after `TIMING.fadeOutMs`.
5. On a `pageshow` event with `event.persisted`, the script reloads the page when the user returns with the browser's Back button.

### 6.2 Game entry point (`src/pages/game-page.js`)

- Creates the HUD, astronaut, and sound toggle.
- Queries DONKI once with `getLatestSepEvents().then(summarizeStorm)` while gameplay proceeds. If the query fails, it uses an `unavailable` summary.
- `runGame()` creates the initial state and loops over `ROUNDS` with `playRound(...)`. After each round it calls `findDepleted(state.resources)`. If any resource is ≤ 0, it displays **“Mission failed”** with a message from `GAME_OVER_TEXT` and the buttons **“Try again”** and **“Back to start.”**
- After all rounds are cleared, it displays **“Mission Complete - Welcome Home!”** It displays an under-construction message if `lastRound.number < GAME.totalRounds`.

### 6.3 Round flow (`src/game/round-flow.js`)

`playRound({ round, state, ui, getStormSummary })` runs the following steps.

1. Updates the HUD with `renderRound` and `renderResources`, applies `setAlert(round.alert)`, and plays `sound.alarm()` when the alert is on.
2. If `report.liveData` is `true`, waits for the DONKI summary using `Promise.race` with a timeout of `TIMING.liveDataWaitMs` (3.5 seconds).
3. Opens a single letter containing the report pages, an optional NASA data page, and the decision pages. The final button reads **“Decide.”**
4. `askChoice(...)` displays the options and returns the selected `id`.
5. Opens a letter with `option.minigame.intro` and a **“Start”** button, then runs `runMinigame(type, stage, { ...config, level })`.
6. Resolves `outcomeId` with `option.outcomes[result]`, falling back to the first value in `outcomes` when the mapping is absent. It calls `recordOutcome` to apply the effects and turns off the alert. For `tone === 'bad'`, it plays `lose` and triggers the astronaut's `hit` reaction. For other tones, it uses `calm` and `happy`.
7. Displays the outcome letter with the result text, badges showing the actual resource changes, and the science note.

### 6.4 Resources and state (`src/core/`)

| Function | Description |
|---|---|
| `clamp(value, max)` | Restricts a value to `[0, max]` |
| `createResources(start)` | Copies the starting values |
| `applyEffects(resources, effects, max)` | Returns `{ resources, applied }`, where `applied` records the actual change after clamping |
| `findDepleted(resources)` | Returns the first resource at ≤ 0 in the order `energy`, `lifeSupport`, `shielding`, or `null` |
| `formatPercent(delta)` | Returns values such as `"+5%"` or `"−15%"`, using the Unicode minus sign `\u2212` |
| `createGameState()` | Creates the initial state (70/70/70 and an empty history) |
| `recordOutcome(state, entry, effects)` | Produces the new state and history, along with `applied` changes |

### 6.5 DONKI client (`src/services/donki.js`)

`getLatestSepEvents(options)` works as follows.

1. Checks the six-hour cache. When a valid entry exists, it returns `status: 'cached'`.
2. For each source (`ccmc`, then `api-nasa-gov`) and lookback window (30, 365, then 1825 days), it calls `fetch` on `.../SEP` with `startDate` and `endDate` in `yyyy-MM-dd` format. `AbortController` enforces a five-second timeout.
3. If a window contains events, `normalizeResponse` orders the normalized events from newest to oldest. The client caches the result and returns `status: 'live'`.
4. If a source responds with no events even in the largest window, it returns `live` with an empty list.
5. On a network error, CORS error, or non-2xx HTTP status, it tries the next source. If every source fails, it returns `status: 'unavailable'`.

`summarizeStorm(result)` returns `{ latest, count, windowDays, level, hasLiveData }`. The game uses its own severity rule. The level is `strong` for two or more linked eruptions, `medium` for one eruption or when data is unavailable, and `mild` for zero linked eruptions.

**Expected API response** (JSON array)  
`[{ sepID, eventTime, instruments: [{displayName}], linkedEvents: [{activityID}], ... }]`. An empty array (`[]`) is a valid response.

`buildLiveDataPage(summary)` in `game/live-data.js` generates the **“Real NASA data”** page with the date, instrument, linked eruptions, number of storms NASA recorded in the lookback window, and severity level. It displays fallback text when data is unavailable.

### 6.6 Interface (`src/ui/`)

- **`dom.js`** provides `el(tag, attrs, ...children)` with support for `class`, `dataset`, `on`, and Boolean attributes, plus `svg(...)`, `mount(container, ...nodes)`, `sleep(ms)`, `prefersReducedMotion()`, and `focusTitle(root)`.
- **`letter.js`** provides `openLetter({ container, pages, speaker, finalLabel, skippable, onShow })`. The letter uses a typing animation (22 ms per character with pauses at `.!?` and `,`), ticking sounds, “Quick science” notes, optional `page.extra()` content, pagination dots, and screen-reader text. Click, Enter, Space, or the Right Arrow advances the letter. The first input during typing reveals the rest of the text. With `prefers-reduced-motion`, text appears immediately.
- **`choice-screen.js`** provides `askChoice(...)`, which lists the options and supports shortcuts `1`, `2`, `3`, and so on.
- **`hud.js`** provides `renderResources` (value, bar width, `aria-valuenow`, and `is-low` at ≤ 25) and `renderRound` (“Round X of N” and a progress bar at `(round-1)/total`).
- **`effects.js`** displays badges such as “Energy −25%” for resources that change and shows “No changes” when none change.
- **`end-screen.js`**, **`alert.js`**, **`astronaut.js`**, and **`sound-toggle.js`** handle end screens, the global alert, astronaut reactions, and the sound toggle, respectively.

### 6.7 Sound (`src/audio/sound.js`)

The module synthesizes tones and filtered noise at low volume through the Web Audio API. It exposes `init`, `isMuted`, `toggle`, `tick`, `page`, `choose`, `liftOff`, `alarm`, `calm`, `thrust`, `glitch`, `warning`, `good`, `bad`, `win`, and `lose`. It resumes the `AudioContext` on the first `pointerdown` or `keydown` to comply with browser autoplay policies.

### 6.8 Minigames (`src/minigames/`)

Minigames share the signature `(container, config) => Promise<{ result: 'win'|'lose', stats }>`. The registry lives in `index.js`, which throws an error on load if any type in `MINIGAME_TYPES` is missing from the registry.

| Type | Round and option | Description and rules |
|---|---|---|
| `manualFlight` (*Power Grid*) | Round 1 · “Leave the shelter” | Four systems (Solar Panels, Flight Computer, Star Tracker, Thrusters) start at `[ON, OFF, ON, OFF]`. Four switches each toggle two adjacent systems (0–1, 1–2, 2–3, 3–0). Turn every system ON within four moves or receive `lose`. |
| `dataCheck` | Round 1 · “Stay inside” | Compare the arrow from the star tracker, shown with static, to the arrow from the backup sensors on eight cards. Choose “Keep” if they match and “Clear” if they differ (keys `1` and `2`). A mistake repeats the card and increments `mistakes`. The minigame always ends in `win`. The generator creates at least three false cards and at least three valid cards. The arrows on false cards differ by at least 90°. |
| `marsRoverDrive` / `marsRoutePlanner` / `marsRadarScan` | Round 2 · A / B / C | See [Section 6.9](#69-round-2--mars-recon). |
| `offlineKit` | Round 3 · “Pack an Offline Kit” | Five files compete for six storage units. Save the three required files (*Safety checklist* 2, *Base manual* 2, *Mission log* 2). The distractors are *Rover photo album* (3) and *Crew movie* (4). Toggle files to save or remove them. “Test Offline Kit” returns `win` or `lose`. |
| `habitatDrill` | Round 3 · “Run the Habitat Drill” | Respond to three alarms in sequence (air → filter, cold → heater, battery → pause the science lab). Each alarm has a clue from the manual. Two mistakes produce `lose`. Three correct responses produce `win`. |
| `shieldZap` | Round 4 · “Heavy Water Shield” | Destroy six rays within 18 seconds. A ray appears every two seconds and lasts three seconds. Click, tap, or press Enter or Space. “Skip” counts as a loss. |
| `rocketBoost` | Round 4 · “Fly Light and Fast” | A needle moves back and forth at speed 65. Press BLAST OFF while it is in the green zone (38–62) three times. Three misses produce `lose`. |

`startStatic(canvas, opts)` in `static-noise.js` draws TV static on a small canvas and returns a function that stops it.

### 6.9 Round 2 — Mars Recon

**Model (`mars-recon-model.js`).** The model runs independently of the DOM.

- `createMarsMap()` builds a fixed 19 × 11 grid (`#` for obstacles, `.` for traversable tiles). Tiles where `(x*7 + y*11) % 9 === 0` are rocky and cost three battery units. Other traversable tiles cost one.
- The habitat is at `[1, 1]`. Science sites are **ALPHA** `[5,3]`, **BETA** `[12,3]`, and **GAMMA** `[16,8]`.
- `shortestPath(start, destination)` uses Dijkstra's algorithm with terrain costs and a queue maintained with `sort`. `calculateTour(order)` calculates a route from the habitat through the science sites and back to the habitat. `minimumTour()` evaluates all six permutations.
- `INITIAL_BATTERY = minimumTour().cost + 38` (`batteryBuffer`).
- The radar has four sectors (A at 40° for *regolith*, B at 125° for *rock*, C at 220° for *dune*, and D at 310° for *slope*), a tolerance of ±15°, and a limit of eight scans.

| Function | Route | Description |
|---|---|---|
| `createMarsSession(route)` | All | Creates the initial session with `status: 'running'` |
| `moveMarsRover(session, dx, dy)` | A | Moves the rover one tile and deducts battery power. Returns `reserveWarning` if the remaining battery is insufficient for the return trip. The player wins by returning to the habitat after scanning all three sites and loses by running out of battery outside the habitat. |
| `scanMarsSite(session)` | A | Scans the site under the rover |
| `toggleMarsWaypoint`, `evaluateMarsPlan`, `startMarsExpedition`, `stepMarsExpedition` | B | Handle route planning, cost estimates including the return trip, and step-by-step execution |
| `aimMarsRadar`, `scanMarsSector`, `classifyMarsSector`, `getCorrectMarsSectors` | C | Handle antenna heading, scanning, and classification. Four correct classifications win the minigame. |
| `endMarsSession(session)` | All | Ends the session with `lose` and `reason: 'ended-early'` |
| `evaluateMarsMission(session)` | All | Returns `{ route, success, partial, status, mapQuality, ... }` |

**View (`mars-recon.js`).** `runMarsRecon(container, { route })` draws the terrain for routes A and B or the radar for route C on a 960 × 590 `<canvas>`. The sidebar shows battery power, progress, controls, and the **“End & review (counts as a miss)”** button. The module exports `runMarsRoverDrive`, `runMarsRoutePlanner`, and `runMarsRadarScan`.

- **A — Manual driving.** Use WASD or the arrow keys to move and Space to scan. Holding an on-screen button repeats the action every 145 ms.
- **B — Route planner.** Select the three sites in order. The planner displays the dotted route and estimated cost. **“EXECUTE PLAN”** animates the expedition with `requestAnimationFrame` at 75 ms per step.
- **C — Radar.** Use the 0–359° heading slider, sector selector, and **“SCAN SECTOR”** button, then classify the terrain as `regolith`, `rock`, `dune`, or `slope`.

At the end, `result` equals `evaluation.status` (`'win'` or `'lose'`). `stats` includes the full evaluation, the route, and `reason`.

---

## 7. Round content

The tables show changes in percentage points for `energy`, `lifeSupport`, and `shielding`. Each resource starts at 70.

**Round 1 — Solar Storm** (alert on, real NASA data)

| Option → Minigame | Outcome | Tone | Energy | Life Support | Shielding |
|---|---|---|---|---|---|
| Leave the shelter → `manualFlight` | `leave-win` | mixed | −25 | −15 | +5 |
| | `leave-lose` | bad | −30 | −20 | −10 |
| Stay inside → `dataCheck` | `stay-win` | good | −5 | +10 | +5 |

**Round 2 — Mars Terrain Reconnaissance** (narrated by AURA)

| Option → Minigame | Outcome | Tone | Energy | Life Support | Shielding |
|---|---|---|---|---|---|
| A — Rocky Shortcut → `marsRoverDrive` | `rover-win` | good | −5 | 0 | 0 |
| | `rover-lose` | mixed | −12 | −3 | 0 |
| B — Surveyed Corridor → `marsRoutePlanner` | `planner-win` | good | −3 | 0 | 0 |
| | `planner-lose` | mixed | −10 | −2 | 0 |
| C — Remote Mapping → `marsRadarScan` | `radar-win` | good | −4 | 0 | 0 |
| | `radar-lose` | mixed | −8 | 0 | −3 |

**Round 3 — Solar Conjunction**

| Option → Minigame | Outcome | Tone | Energy | Life Support | Shielding |
|---|---|---|---|---|---|
| Pack an Offline Kit → `offlineKit` | `kit-win` | good | −4 | 0 | 0 |
| | `kit-lose` | mixed | −8 | 0 | 0 |
| Run the Habitat Drill → `habitatDrill` | `drill-win` | good | −3 | 0 | 0 |
| | `drill-lose` | mixed | −7 | −5 | 0 |

**Round 4 — Return Home** (alert on)

| Option → Minigame | Outcome | Tone | Energy | Life Support | Shielding |
|---|---|---|---|---|---|
| Keep the Heavy Water Shield → `shieldZap` | `shield-win` | good | −20 | 0 | +15 |
| | `shield-lose` | mixed | −30 | −10 | +10 |
| Fly Light and Fast → `rocketBoost` | `boost-win` | good | −5 | 0 | −10 |
| | `boost-lose` | bad | −25 | −15 | −10 |

---

## 8. Gameplay flow

1. **Start screen (`index.html`).** The player sees the title, the spacecraft, and the **▶ Play** button. Enter or Space also starts the game. The player can toggle sound.
2. **Liftoff and introduction.** The text disappears, the spacecraft rises, and a four-page letter appears. The player can skip it with ×. The red alert turns on at the last page.
3. **Cockpit (`game.html`).** The screen fades to black before loading the game. The HUD displays *Round 1 of 4* and the three gauges at 70%.
4. **Round.**
   1. Read the report and story. Round 1 can include a page with real NASA data.
   2. Click an option or use keys `1`, `2`, or `3`.
   3. Read the minigame introduction and play.
   4. Review the result text, badges showing the actual resource changes, and a “Based on a true story” or “Space Science Note” section. The gauges update and the astronaut reacts.
5. **Resource check.** If any resource has reached zero, the **Mission failed** screen appears with **Try again** and **Back to start**. Otherwise, the player proceeds to the next round.
6. **Ending.** After Round 4, the game displays **Mission Complete - Welcome Home!** with **Play again** and **Back to start**.

---

## 9. Testing and code quality

~~~bash
npm test      # node --test "tests/**/*.test.js"
npm run lint  # eslint .
~~~

| File | Coverage |
|---|---|
| `resources.test.js` | `applyEffects` (immutability, clamping to 0–100, and actual changes), `findDepleted`, `formatPercent`, `clamp`, `createResources`, and `recordOutcome` |
| `donki.test.js` | URL construction, normalization, expanding the lookback window, fallback between sources, `unavailable` status, caching, and storm levels |
| `data-check-model.test.js` | Card generation using seeds 1–200, angular separation, `isCorrect`, and `submitAnswer` |
| `flight-model.test.js` | Flight simulation in `flight-model.js`, including thrust cost, failure from depleted energy, increasing radiation, and difficulty settings |
| `rounds-data.test.js` | Valid structure for the four rounds, registered minigame types, numbering 1–4, effects for Rounds 1 and 4, and the absence of emoji, `%`, and agency names in Round 4 text |

`tests/helpers.js` provides `seededRandom(seed)`, a deterministic random number generator, and `memoryCache()`.

**Linting.** `eslint.config.js` excludes `dist/` and `node_modules/`. It configures `src/**` with `ecmaVersion 2023`, browser globals, and the rules `no-unused-vars` (allowing arguments prefixed with `_`), `eqeqeq`, and `prefer-const`.

**Modules without automated tests.** `mars-recon-model.js`, `solar-conjunction.js`, `shield-zap.js`, `rocket-boost.js`, and the components in `ui/`.

---

## 10. How to extend the game

### Add or modify a round

1. Copy `src/data/rounds/round-01.js`, which contains the `Round` typedef, and adjust the text, options, minigames, and effects.
2. Import the round and add it to `ROUNDS` in `src/data/rounds/index.js`.
3. Define at least `outcomes.win` for every option and ensure that every referenced `outcomeId` exists in `round.outcomes`.
4. If the round count changes, update `GAME.totalRounds` in `src/config.js`. The HUD and game ending both use it, and `rounds-data.test.js` currently expects exactly four rounds.
5. Run `npm run build` and `npm test`.

### Add a minigame

1. Create the view and, where appropriate, a `*-model.js` file for the logic. Use the signature `(container, config) => Promise<{ result, stats }>`.
2. Add the type name to `src/minigames/types.js` and register it in `src/minigames/index.js`.
3. Reference it in an option, for example `minigame: { type: 'myGame', intro: '...' }`.

---

## 11. Project status and observations

1. **Inconsistent round counts and mission dates.** The code defines **four rounds** in `GAME.totalRounds`. `game.html` contains the placeholder “Round 1 of 10,” which the game replaces on startup. The previous README also mentioned 10 rounds. `GAME.totalDays = 300` is unused. The “300 days” in the introduction is hardcoded in `intro.js`. Round 2 says “DAY 980,” a comment in `mars-recon` says “980 DAYS: MISSION MARS,” and the canvas displays “SOL 264.”
2. **The flight simulation model is disconnected from the interface.** `flight-model.js` models score, radiation, and energy and has automated tests. “Leave the shelter” opens *Power Grid* in `flight.js`, which does not import the model. The Round 1 descriptions mentioning keeping the ship straight and a radiation alarm still describe the flight simulation.
3. **NASA data only affects the report text.** `round-flow.js` passes `level` (`mild`, `medium`, or `strong`) to each minigame. The minigames currently ignore it, so it only changes the text on the “Real NASA data” page.
4. **`dataCheck` always ends in a win.** The `stay` option only declares `outcomes.win`, and the minigame only resolves to `win`.
5. **Round 3 minigames handle the ending differently.** `offlineKit` and `habitatDrill` omit the win or loss sound and the `TIMING.minigameEndMs` delay used by the other minigames.
6. **Round 2 may require the player to end the minigame manually.** Route C has no automatic loss when the player uses all eight scans. Players can reclassify sectors without penalty and must use “End & review” to end the session if they have not won. Route B behaves similarly when the plan is invalid. `evaluateMarsMission` calculates `partial` and `mapQuality`, while `round-02.js` only maps `win` and `lose`.
7. **Radar hint.** The UI shows each sector's approximate heading (“signal near X°”), which makes route C easier.
8. **Round 2 option labels and internal titles differ.** The options are “Rocky Shortcut,” “Surveyed Corridor,” and “Remote Mapping.” Their internal titles are “Manual rover driving,” “Autonomous route planning,” and “Remote terrain mapping.”
9. **Image assets were outside the scope of the source review.** The code references `assets/nave-pixel.png`, `assets/astronauta.png`, `assets/cabina.png`, and `assets/fondo-estrellas.png`. The reviewed material did not include the images, so their existence remains unverified. The previous README named `assets/nave.png`, whereas `index.html` references `assets/nave-pixel.png`.
10. **Network dependencies.** Google Fonts and the DONKI API require internet access. The game can run offline using system fonts and the default `medium` storm level.
11. **Public test key in the client.** `DEMO_KEY` has a low rate limit. The source recommends replacing it before publishing.
12. **Language.** The UI and game text are in English. Most code comments are in Spanish, with English comments in the `mars-recon*` files.
