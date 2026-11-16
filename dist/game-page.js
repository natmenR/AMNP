(() => {
  // src/config.js
  var GAME = Object.freeze({
    playerName: "D. Diaz",
    totalRounds: 10,
    totalDays: 300
  });
  var PAGES = Object.freeze({
    start: "index.html",
    game: "game.html"
  });
  var RESOURCES = Object.freeze({
    max: 100,
    lowThreshold: 25,
    start: Object.freeze({ energy: 70, lifeSupport: 70, shielding: 70 }),
    labels: Object.freeze({
      energy: "Energy",
      lifeSupport: "Life Support",
      shielding: "Shielding"
    })
  });
  var STORAGE_KEYS = Object.freeze({
    sound: "survive-in-space:sound",
    sepCache: "survive-in-space:sep-cache"
  });
  var TIMING = Object.freeze({
    liftOffMs: 1400,
    fadeOutMs: 850,
    typeMsPerChar: 22,
    liveDataWaitMs: 3500,
    minigameEndMs: 1500
  });
  var DONKI = Object.freeze({
    timeoutMs: 5e3,
    /** Ventanas de búsqueda, de la más corta a la más larga (en días). */
    lookbackDays: Object.freeze([30, 365, 1825]),
    cacheTtlMs: 6 * 60 * 60 * 1e3,
    sources: Object.freeze([
      Object.freeze({
        id: "ccmc",
        baseUrl: "https://ccmc.gsfc.nasa.gov/DONKI-API/get/SEP",
        params: Object.freeze({ catalog: "M2M_CATALOG", version: "Latest" }),
        dateParams: Object.freeze({ start: "startDate", end: "endDate" })
      }),
      Object.freeze({
        id: "api-nasa-gov",
        baseUrl: "https://api.nasa.gov/DONKI/SEP",
        // DEMO_KEY sirve para pruebas (límite bajo). Para publicar el juego, pide tu propia clave gratis en api.nasa.gov
        params: Object.freeze({ api_key: "DEMO_KEY" }),
        dateParams: Object.freeze({ start: "startDate", end: "endDate" })
      })
    ])
  });

  // src/core/resources.js
  var RESOURCE_KEYS = (
    /** @type {const} */
    ["energy", "lifeSupport", "shielding"]
  );
  function clamp(value, max) {
    return Math.max(0, Math.min(max, value));
  }
  function createResources(start) {
    return { energy: start.energy, lifeSupport: start.lifeSupport, shielding: start.shielding };
  }
  function applyEffects(resources, effects, max) {
    const next = { ...resources };
    const applied = {};
    for (const key of RESOURCE_KEYS) {
      const change = effects[key] ?? 0;
      next[key] = clamp(resources[key] + change, max);
      applied[key] = next[key] - resources[key];
    }
    return { resources: next, applied };
  }
  function findDepleted(resources) {
    return RESOURCE_KEYS.find((key) => resources[key] <= 0) ?? null;
  }
  function formatPercent(delta) {
    return delta > 0 ? `+${delta}%` : `\u2212${Math.abs(delta)}%`;
  }

  // src/core/game-state.js
  function createGameState() {
    return { resources: createResources(RESOURCES.start), history: [] };
  }
  function recordOutcome(state, entry, effects) {
    const { resources, applied } = applyEffects(state.resources, effects, RESOURCES.max);
    return { state: { resources, history: [...state.history, entry] }, applied };
  }

  // src/data/game-over.js
  var GAME_OVER_TEXT = {
    energy: "The ship ran out of Energy: without electricity, nothing on board could keep working.",
    lifeSupport: "Life Support failed: the crew could no longer get the air and water they need.",
    shielding: "The shielding gave out: the radiation and impacts were too much for the ship."
  };

  // src/data/rounds/round-01.js
  var name = GAME.playerName;
  var round01 = {
    id: "round-01",
    number: 1,
    title: "Solar Storm",
    speaker: "Ship System",
    alert: true,
    report: {
      liveData: true,
      // añade una página con datos reales de la API de la NASA (ver services/donki.js)
      pages: [
        { text: `Hello, ${name}. Trip Start Summary (Round 1): We have just entered open space and the ship is working well.` },
        {
          text: "However, our sensors detected a solar storm: the Sun had a huge explosion and sent an invisible rain of tiny, energy-packed particles flying toward us."
        },
        {
          text: "This creates dangerous radiation, invisible energy traveling through space that can harm our bodies if nothing blocks it. To stay safe, we sounded the alarm and the whole crew moved into the ship's thick-walled shelter.",
          notes: [{ term: "Radiation", text: "invisible energy that can hurt people and damage electronics." }]
        }
      ]
    },
    decision: {
      pages: [
        {
          text: `${name}, we are safe inside the shelter, but we have a problem outside. That rain of particles hit our star tracker, a camera sensor that takes pictures of the stars like a map to know which way the ship is pointing, and now it is giving confusing readings.`,
          notes: [{ term: "Star tracker", text: "a camera that looks at the stars to figure out which way the ship is pointing." }]
        },
        {
          text: "On the screen, it looks like we are spinning out of control, but the ship is still flying straight; it is just a glitch caused by flashes from the storm."
        },
        {
          text: "You can leave the shelter and go to the cockpit to check the star tracker and fire the thrusters, but the radiation outside will hurt you and you will waste a lot of Energy for nothing. The other choice is to stay inside, check the backup sensors, the internal instruments that do not look at the stars and do not get confused by the storm, and wait until the danger passes.",
          notes: [{ term: "Backup sensors", text: "instruments inside the ship that feel its movement, so the storm cannot blind them." }]
        }
      ],
      title: "Your decision",
      prompt: "What is your decision?",
      options: [
        {
          id: "leave",
          label: "Leave the shelter for the cockpit to check the star tracker and fire the thrusters.",
          minigame: {
            type: "manualFlight",
            intro: `Shelter hatch open, ${name}. Starting manual flight minigame: try to keep the ship straight while looking at the static-filled screen from the star tracker, and control the Energy used by the thrusters before the radiation alarm goes too high.`
          },
          outcomes: { win: "leave-win", lose: "leave-lose" }
        },
        {
          id: "stay",
          label: "Stay inside the shelter, check the backup sensors, and wait for the storm to pass.",
          minigame: {
            type: "dataCheck",
            intro: `Shelter control screen ready, ${name}. Starting data-check minigame: compare the messy star tracker photos with the backup sensors, clear out the false readings, and keep the thrusters locked off until the storm passes.`
          },
          outcomes: { win: "stay-win" }
        }
      ]
    },
    outcomes: {
      "leave-win": {
        tone: "mixed",
        text: `End of Round 1 Report, ${name}. You managed to check the ship's direction, but leaving the shelter during the solar storm and firing the thrusters without waiting came at a high cost: you lost -15% Life Support from the radiation outside and -25% Energy from using the thrusters unnecessarily, though you gained +5% Shelter Integrity and Shielding by checking the outside sensors.`,
        effects: { lifeSupport: -15, energy: -25, shielding: 5 }
      },
      "leave-lose": {
        tone: "bad",
        text: `End of Round 1 Report, ${name}. The storm flashes blinded the star tracker, you fired the thrusters using false readings, and you had to rush back to the shelter. You lost -20% Life Support, -30% Energy, and -10% Shelter Integrity and Shielding from the rough maneuver.`,
        effects: { lifeSupport: -20, energy: -30, shielding: -10 }
      },
      "stay-win": {
        tone: "good",
        text: `End of Round 1 Report, ${name}. You made the right call by staying in the shelter, checking our direction with the backup sensors, and patiently waiting for the star tracker to see the stars clearly again. You gained +10% Life Support for keeping the crew safe, +5% Shelter Integrity and Shielding by keeping the ship steady, and only spent -5% Energy on the indoor screens.`,
        effects: { lifeSupport: 10, shielding: 5, energy: -5 }
      }
    },
    fact: {
      title: "Based on a true story",
      text: "During the solar storms of May 2024, the star camera on NASA's Mars Odyssey orbiter was overwhelmed by solar particles and went offline for a short time. Odyssey had other ways to figure out its orientation, and the camera was working again in less than an hour."
    }
  };

  // src/data/rounds/round-02.js
  var name2 = GAME.playerName;
  var round02 = {
    id: "round-02",
    number: 2,
    title: "Mars Terrain Reconnaissance",
    speaker: "AURA",
    alert: false,
    // ==========================================================
    // 1. INITIAL MISSION REPORT
    // ==========================================================
    report: {
      liveData: false,
      pages: [
        {
          text: `Welcome to the Martian surface, ${name2}. This is AURA, your onboard artificial intelligence assistant. Our landing is complete, but the terrain surrounding the habitat has not yet been fully surveyed.`
        },
        {
          text: "Before the crew can travel beyond the habitat, we need to identify safe corridors, dangerous obstacles, and locations that may contain valuable scientific evidence.",
          notes: [
            {
              term: "Terrain reconnaissance",
              text: "The process of observing and mapping an area to identify its features, hazards, and possible travel routes."
            }
          ]
        },
        {
          text: "Our exploration rover is ready for its first assignment. Three scientific sites have been identified: ALPHA, BETA, and GAMMA. Each site may help us understand the surrounding Martian environment.",
          notes: [
            {
              term: "Rover",
              text: "A robotic vehicle designed to move across the surface of another world and collect scientific information."
            }
          ]
        },
        {
          text: "MISSION CONTROL: Commander, remember that reaching a destination is only part of the mission. The rover must also preserve enough energy to return to the habitat safely."
        }
      ]
    },
    // ==========================================================
    // 2. MISSION DECISION
    // ==========================================================
    decision: {
      pages: [
        {
          text: "AURA: Our preliminary scans show several possible approaches. Some paths are shorter but contain difficult terrain. Others are longer but easier to navigate.",
          notes: [
            {
              term: "Regolith",
              text: "The layer of loose dust, sand, and broken rock covering the surface of Mars."
            }
          ]
        },
        {
          text: "MISSION CONTROL: Driving across rocky ground can consume additional power. An apparently shorter path is not always the most energy-efficient one.",
          notes: [
            {
              term: "Energy efficiency",
              text: "Completing a task while minimizing the amount of energy required."
            }
          ]
        },
        {
          text: "AURA: We have three possible strategies. You may control the rover manually, program an autonomous expedition, or remain at the habitat and map the surrounding terrain remotely."
        },
        {
          text: "MISSION CONTROL: Each strategy offers different advantages and risks. Consider how much information we need, how much energy we can spend, and whether the rover can return safely."
        }
      ],
      title: "Mars Terrain Reconnaissance",
      prompt: "How will you survey the Martian surface?",
      options: [
        // ======================================================
        // ROUTE A — ROCKY SHORTCUT
        // ======================================================
        {
          id: "rocky-shortcut",
          label: "A \u2014 Rocky shortcut: Drive the rover manually through hazardous terrain, scan three science sites, and return to the habitat.",
          minigame: {
            type: "marsRoverDrive",
            intro: `Manual rover controls activated, ${name2}. Use the arrow keys or WASD to navigate the Martian surface. Reach ALPHA, BETA, and GAMMA, then press Space to scan each site. Avoid impassable rocks, monitor battery consumption, and return to the habitat.`,
            config: {
              route: "A",
              siteCount: 3,
              requireReturn: true,
              rockyTerrainCost: 3,
              normalTerrainCost: 1
            }
          },
          outcomes: {
            win: "rocky-win",
            lose: "rocky-lose"
          }
        },
        // ======================================================
        // ROUTE B — LONGER SURVEYED CORRIDOR
        // ======================================================
        {
          id: "surveyed-corridor",
          label: "B \u2014 Longer surveyed corridor: Plan an autonomous route through three science sites while preserving enough battery for the return journey.",
          minigame: {
            type: "marsRoutePlanner",
            intro: `Autonomous navigation system ready, ${name2}. Select the order in which the rover will visit ALPHA, BETA, and GAMMA. Review the estimated battery cost before executing the expedition. Your plan must include the return journey to the habitat.`,
            config: {
              route: "B",
              siteCount: 3,
              requireReturn: true,
              requireAllSites: true
            }
          },
          outcomes: {
            win: "corridor-win",
            lose: "corridor-lose"
          }
        },
        // ======================================================
        // ROUTE C — REMOTE TERRAIN MAPPING
        // ======================================================
        {
          id: "remote-mapping",
          label: "C \u2014 Remote terrain mapping: Keep the rover at the habitat, align the radar antenna, and classify four terrain sectors.",
          minigame: {
            type: "marsRadarScan",
            intro: `Remote scanning system online, ${name2}. The rover will remain at the habitat. Select a sector, align the radar antenna with its signal direction, and scan the terrain. Use the returned signal to classify each sector. You have eight scan attempts.`,
            config: {
              route: "C",
              sectorCount: 4,
              maxAttempts: 8,
              bearingTolerance: 15
            }
          },
          outcomes: {
            win: "radar-win",
            lose: "radar-lose"
          }
        }
      ]
    },
    // ==========================================================
    // 3. MISSION OUTCOMES
    //
    // Effects use the three existing HUD resources:
    // energy, lifeSupport, shielding.
    //
    // These are proposed gameplay balance values.
    // ==========================================================
    outcomes: {
      // --------------------------------------------------------
      // ROUTE A — SUCCESS
      // --------------------------------------------------------
      "rocky-win": {
        tone: "good",
        text: `End of Round 2 Report, ${name2}. Excellent rover control! You successfully navigated the rocky shortcut, scanned ALPHA, BETA, and GAMMA, and returned the rover to the habitat. The expedition provided a complete local terrain survey, although the difficult ground required additional power. Energy -15%, Life Support +5%, Shielding unchanged.`,
        effects: {
          energy: -15,
          lifeSupport: 5,
          shielding: 0
        }
      },
      // --------------------------------------------------------
      // ROUTE A — FAILURE
      // --------------------------------------------------------
      "rocky-lose": {
        tone: "bad",
        text: `End of Round 2 Report, ${name2}. The manual rover expedition did not meet its objectives. Hazardous terrain, incomplete scans, or insufficient return reserves prevented a successful survey. The mission consumed valuable power without producing a complete map. Energy -25%, Life Support unchanged, Shielding unchanged.`,
        effects: {
          energy: -25,
          lifeSupport: 0,
          shielding: 0
        }
      },
      // --------------------------------------------------------
      // ROUTE B — SUCCESS
      // --------------------------------------------------------
      "corridor-win": {
        tone: "good",
        text: `End of Round 2 Report, ${name2}. Your autonomous expedition was successful. The rover visited all three science sites and returned to the habitat using the planned route. Mission Control has received a complete terrain survey and valuable navigation data for future operations. Energy -10%, Life Support +5%, Shielding unchanged.`,
        effects: {
          energy: -10,
          lifeSupport: 5,
          shielding: 0
        }
      },
      // --------------------------------------------------------
      // ROUTE B — FAILURE
      // --------------------------------------------------------
      "corridor-lose": {
        tone: "bad",
        text: `End of Round 2 Report, ${name2}. The autonomous expedition could not be completed as planned. The selected waypoint order did not satisfy the mission requirements or available energy reserves. Our surface map remains incomplete. Energy -15%, Life Support unchanged, Shielding unchanged.`,
        effects: {
          energy: -15,
          lifeSupport: 0,
          shielding: 0
        }
      },
      // --------------------------------------------------------
      // ROUTE C — SUCCESS
      // --------------------------------------------------------
      "radar-win": {
        tone: "mixed",
        text: `End of Round 2 Report, ${name2}. The remote terrain survey was successful. You aligned the antenna and classified all four sectors without deploying the rover. This preserved most of our mobility resources, but the remote observations provide only a partial terrain map compared with a direct rover survey. Energy -5%, Life Support unchanged, Shielding unchanged.`,
        effects: {
          energy: -5,
          lifeSupport: 0,
          shielding: 0
        }
      },
      // --------------------------------------------------------
      // ROUTE C — FAILURE
      // --------------------------------------------------------
      "radar-lose": {
        tone: "bad",
        text: `End of Round 2 Report, ${name2}. The remote scanning operation did not produce enough verified terrain classifications. The available antenna scans have been exhausted or the survey was ended early. The rover remains safely at the habitat, but our terrain information is limited. Energy -5%, Life Support unchanged, Shielding unchanged.`,
        effects: {
          energy: -5,
          lifeSupport: 0,
          shielding: 0
        }
      }
    },
    // ==========================================================
    // 4. SCIENTIFIC EXPLANATION
    // ==========================================================
    fact: {
      title: "Quick Science \u2014 Exploring Mars",
      text: "NASA Mars rovers use cameras, scientific instruments, and autonomous navigation systems to study the Martian surface. Mission teams must consider obstacles, terrain conditions, communication delays, and available power when planning rover activities. Orbital and remote observations can complement direct surface exploration."
    }
  };

  // src/data/rounds/index.js
  var ROUNDS = [round01];
  ROUNDS.push(round02);

  // src/services/storage.js
  function readString(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }
  function writeString(key, value) {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  }
  function readJson(key, fallback = null) {
    const raw = readString(key);
    if (raw === null) return fallback;
    try {
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  }
  function writeJson(key, value) {
    return writeString(key, JSON.stringify(value));
  }

  // src/audio/sound.js
  var context = null;
  var muted = readString(STORAGE_KEYS.sound) === "off";
  function getContext() {
    if (!context) {
      const AudioCtx = window.AudioContext ?? window.webkitAudioContext;
      if (!AudioCtx) return null;
      context = new AudioCtx();
    }
    if (context.state === "suspended") context.resume();
    return context;
  }
  for (const type of ["pointerdown", "keydown"]) {
    window.addEventListener(type, () => {
      if (context?.state === "suspended") context.resume();
    }, { passive: true });
  }
  function tone({ freq, freqEnd, dur, type = "square", vol = 0.03, delay = 0 }) {
    if (muted) return;
    const ctx = getContext();
    if (!ctx) return;
    const t = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (freqEnd) osc.frequency.exponentialRampToValueAtTime(freqEnd, t + dur);
    gain.gain.setValueAtTime(1e-4, t);
    gain.gain.linearRampToValueAtTime(vol, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(1e-4, t + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }
  function noise({ dur, from, to, vol }) {
    if (muted) return;
    const ctx = getContext();
    if (!ctx) return;
    const t = ctx.currentTime;
    const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(from, t);
    filter.frequency.exponentialRampToValueAtTime(to, t + dur);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(1e-4, t);
    gain.gain.linearRampToValueAtTime(vol, t + dur * 0.3);
    gain.gain.exponentialRampToValueAtTime(1e-4, t + dur);
    source.connect(filter).connect(gain).connect(ctx.destination);
    source.start(t);
  }
  var sound = {
    init() {
      getContext();
    },
    isMuted: () => muted,
    toggle() {
      muted = !muted;
      writeString(STORAGE_KEYS.sound, muted ? "off" : "on");
      if (!muted) {
        getContext();
        this.page();
      }
      return muted;
    },
    // interfaz
    tick() {
      tone({ freq: 520 + Math.random() * 90, dur: 0.035, type: "triangle", vol: 0.018 });
    },
    page() {
      tone({ freq: 660, dur: 0.07, type: "triangle", vol: 0.035 });
      tone({ freq: 880, dur: 0.09, type: "triangle", vol: 0.035, delay: 0.07 });
    },
    choose() {
      tone({ freq: 420, freqEnd: 300, dur: 0.08, type: "triangle", vol: 0.04 });
    },
    // escenas
    liftOff() {
      noise({ dur: 1.4, from: 250, to: 1800, vol: 0.06 });
      tone({ freq: 80, freqEnd: 200, dur: 1.2, type: "sine", vol: 0.05 });
    },
    alarm() {
      for (let i = 0; i < 3; i += 1) {
        tone({ freq: 660, dur: 0.2, vol: 0.025, delay: i * 0.9 });
        tone({ freq: 495, dur: 0.2, vol: 0.025, delay: i * 0.9 + 0.3 });
      }
    },
    calm() {
      tone({ freq: 392, dur: 0.25, type: "sine", vol: 0.04 });
      tone({ freq: 523, dur: 0.35, type: "sine", vol: 0.04, delay: 0.2 });
    },
    // minijuegos
    thrust() {
      noise({ dur: 0.16, from: 900, to: 300, vol: 0.05 });
    },
    glitch() {
      noise({ dur: 0.12, from: 3e3, to: 1500, vol: 0.05 });
    },
    warning() {
      tone({ freq: 740, dur: 0.12, vol: 0.03 });
      tone({ freq: 740, dur: 0.12, vol: 0.03, delay: 0.2 });
    },
    good() {
      tone({ freq: 523, dur: 0.12, type: "sine", vol: 0.05 });
      tone({ freq: 784, dur: 0.18, type: "sine", vol: 0.05, delay: 0.11 });
    },
    bad() {
      tone({ freq: 200, freqEnd: 130, dur: 0.3, type: "sawtooth", vol: 0.035 });
    },
    win() {
      [523, 659, 784, 1046].forEach((freq, i) => tone({ freq, dur: 0.22, type: "triangle", vol: 0.05, delay: i * 0.13 }));
    },
    lose() {
      [392, 330, 262].forEach((freq, i) => tone({ freq, dur: 0.3, type: "sawtooth", vol: 0.03, delay: i * 0.22 }));
    }
  };

  // src/ui/dom.js
  function el(tag, attrs = {}, ...children) {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs ?? {})) {
      if (value === void 0 || value === null || value === false) continue;
      if (key === "class") node.className = String(value);
      else if (key === "dataset") Object.assign(node.dataset, value);
      else if (key === "on") for (const [event, handler] of Object.entries(value)) node.addEventListener(event, handler);
      else if (value === true) node.setAttribute(key, "");
      else node.setAttribute(key, String(value));
    }
    node.append(...flatten(children));
    return node;
  }
  function svg(tag, attrs = {}, ...children) {
    const node = document.createElementNS("http://www.w3.org/2000/svg", tag);
    for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, String(value));
    node.append(...flatten(children));
    return node;
  }
  function flatten(children) {
    return children.flat(Infinity).filter((child) => child !== null && child !== void 0 && child !== false).map((child) => child instanceof Node ? child : document.createTextNode(String(child)));
  }
  function mount(container, ...nodes) {
    container.replaceChildren(...nodes);
  }
  var sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  var prefersReducedMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  function focusTitle(root) {
    const title = root.querySelector('[tabindex="-1"]');
    title?.focus({ preventScroll: true });
  }

  // src/minigames/data-check-model.js
  var DIRECTIONS = Object.freeze([
    { id: "up", label: "Up", angle: 0 },
    { id: "up-right", label: "Up-right", angle: 45 },
    { id: "right", label: "Right", angle: 90 },
    { id: "down-right", label: "Down-right", angle: 135 },
    { id: "down", label: "Down", angle: 180 },
    { id: "down-left", label: "Down-left", angle: 225 },
    { id: "left", label: "Left", angle: 270 },
    { id: "up-left", label: "Up-left", angle: 315 }
  ]);
  function shuffle(list, rng) {
    const copy = [...list];
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rng() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }
  function generateCards(count = 8, rng = Math.random) {
    const falseCount = Math.min(count - 3, Math.max(3, Math.round(count / 2 + (rng() - 0.5) * 2)));
    const flags = shuffle(Array.from({ length: count }, (_, i) => i < falseCount), rng);
    return flags.map((isFalse, id) => {
      const backupIndex = Math.floor(rng() * DIRECTIONS.length);
      const offset = isFalse ? 2 + Math.floor(rng() * 5) : 0;
      return {
        id,
        isFalse,
        backup: DIRECTIONS[backupIndex],
        tracker: DIRECTIONS[(backupIndex + offset) % DIRECTIONS.length]
      };
    });
  }
  function isCorrect(card, answer) {
    return answer === (card.isFalse ? "clear" : "keep");
  }
  function createSession(cards) {
    return { cards, index: 0, mistakes: 0, finished: false };
  }
  function submitAnswer(session, answer) {
    if (session.finished) return { correct: false, finished: true };
    const correct = isCorrect(session.cards[session.index], answer);
    if (correct) {
      session.index += 1;
      if (session.index >= session.cards.length) session.finished = true;
    } else {
      session.mistakes += 1;
    }
    return { correct, finished: session.finished };
  }

  // src/minigames/static-noise.js
  function startStatic(canvas, { fps = 10, width = 96, height = 54 } = {}) {
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return () => {
    };
    const image = ctx.createImageData(width, height);
    const draw = () => {
      for (let i = 0; i < image.data.length; i += 4) {
        const v = Math.random() * 255;
        image.data[i] = v;
        image.data[i + 1] = v;
        image.data[i + 2] = v;
        image.data[i + 3] = 255;
      }
      ctx.putImageData(image, 0, 0);
    };
    draw();
    if (prefersReducedMotion()) return () => {
    };
    const timer = setInterval(draw, 1e3 / fps);
    return () => clearInterval(timer);
  }

  // src/minigames/data-check.js
  var CARD_COUNT = 8;
  function arrow(angle) {
    const icon = svg(
      "svg",
      { class: "arrow", viewBox: "0 0 24 24", "aria-hidden": "true", "shape-rendering": "crispEdges" },
      svg("polygon", { points: "12,2 21,13 15,13 15,22 9,22 9,13 3,13", fill: "currentColor" })
    );
    icon.style.transform = `rotate(${angle}deg)`;
    return icon;
  }
  function runDataCheck(container, { cards = CARD_COUNT } = {}) {
    return new Promise((resolve) => {
      const session = createSession(generateCards(cards));
      const feedback = el("p", { class: "mg-feedback", role: "status" }, "Look at both screens. Do the arrows point the same way?");
      const cardRow = el("div", { class: "card-row" });
      const counter = el("span", { class: "mg-counter" });
      const stormFill = el("div", { class: "fill check" });
      const stormBar = el("div", { class: "bar", role: "progressbar", "aria-label": "Storm passing", "aria-valuemin": "0", "aria-valuemax": "100" }, stormFill);
      const lockBadge = el("span", { class: "lock-badge" }, "\u{1F512} Thrusters: LOCKED");
      const keepButton = el("button", { type: "button", class: "mg-button keep" }, el("span", { class: "key" }, "1"), " They match \u2014 keep it");
      const clearButton = el("button", { type: "button", class: "mg-button clear" }, el("span", { class: "key" }, "2"), " They differ \u2014 clear it");
      const root = el(
        "div",
        { class: "minigame data-check" },
        el("h2", { class: "mg-title", tabindex: "-1" }, "Data check"),
        el("p", { class: "mg-help" }, "The star tracker photos are messy because of the storm. Compare each one with the backup sensors. If they match, keep the reading. If they differ, it is a false reading: clear it!"),
        cardRow,
        el("div", { class: "mg-controls" }, keepButton, clearButton),
        feedback,
        el("div", { class: "mg-footer" }, counter, el("div", { class: "mg-meter" }, el("span", { class: "mg-meter-label" }, "Storm passing"), stormBar), lockBadge)
      );
      mount(container, root);
      focusTitle(root);
      let stopStatic = () => {
      };
      let busy = false;
      const renderCard = () => {
        stopStatic();
        const card = session.cards[session.index];
        const trackerCanvas = el("canvas", { class: "static-canvas", "aria-hidden": "true" });
        const panel = (caption, dir, extra, noisy) => el(
          "figure",
          { class: `panel ${noisy ? "tracker" : "backup"}` },
          el("figcaption", {}, caption),
          el("div", { class: "dial" }, noisy ? trackerCanvas : null, arrow(dir.angle)),
          el("p", { class: "dir-label" }, `Points: ${dir.label}`),
          extra
        );
        cardRow.replaceChildren(
          panel("Star tracker photo", card.tracker, null, true),
          panel("Backup sensors", card.backup, null, false)
        );
        stopStatic = startStatic(trackerCanvas, { fps: 8, width: 48, height: 48 });
        counter.textContent = `Reading ${Math.min(session.index + 1, session.cards.length)} of ${session.cards.length}`;
        const percent = session.index / session.cards.length * 100;
        stormFill.style.width = `${percent}%`;
        stormBar.setAttribute("aria-valuenow", String(Math.round(percent)));
      };
      const answer = async (choice) => {
        if (busy) return;
        const { correct, finished } = submitAnswer(session, choice);
        if (!correct) {
          sound.bad();
          feedback.textContent = "Not quite. Look again: do both arrows point the same way?";
          feedback.classList.add("is-bad");
          return;
        }
        sound.good();
        feedback.classList.remove("is-bad");
        feedback.textContent = choice === "clear" ? "Nice! False reading cleared." : "Good! Those readings match, so we keep it.";
        if (!finished) {
          renderCard();
          return;
        }
        busy = true;
        stopStatic();
        document.removeEventListener("keydown", onKey);
        stormFill.style.width = "100%";
        stormBar.setAttribute("aria-valuenow", "100");
        counter.textContent = "All readings checked";
        keepButton.disabled = true;
        clearButton.disabled = true;
        feedback.textContent = "The storm has passed and the thrusters stayed locked. Great job!";
        sound.win();
        await sleep(TIMING.minigameEndMs);
        resolve({ result: "win", stats: { mistakes: session.mistakes } });
      };
      function onKey(event) {
        if (event.ctrlKey || event.metaKey || event.altKey) return;
        if (event.key === "1") answer("keep");
        else if (event.key === "2") answer("clear");
      }
      keepButton.addEventListener("click", () => answer("keep"));
      clearButton.addEventListener("click", () => answer("clear"));
      document.addEventListener("keydown", onKey);
      renderCard();
    });
  }

  // src/minigames/flight-model.js
  var FLIGHT = Object.freeze({
    range: 100,
    // el marcador vive entre -100 y +100
    zone: 22,
    // zona verde: -22 a +22
    pulseSpeed: 38,
    // empuje de cada propulsor
    pulseCost: 4,
    // Energy que gasta cada propulsión (de 100)
    damping: 0.7,
    baseRadiation: 4.2,
    // por segundo
    outsideRadiation: 4,
    // extra por segundo si el marcador está fuera de la zona
    progressRate: 12.5,
    // por segundo dentro de la zona (8 s para completar)
    presets: Object.freeze({
      mild: { drift: 120, flashEvery: [2.6, 4.2], flashSize: [14, 26] },
      medium: { drift: 190, flashEvery: [2, 3.4], flashSize: [18, 32] },
      strong: { drift: 270, flashEvery: [1.5, 2.6], flashSize: [24, 40] }
    })
  });
  var between = (rng, [min, max]) => min + rng() * (max - min);
  function createFlightModel(level = "medium", rng = Math.random) {
    const preset = FLIGHT.presets[level] ?? FLIGHT.presets.medium;
    return {
      preset,
      rng,
      pos: 0,
      vel: 0,
      energy: 100,
      radiation: 0,
      progress: 0,
      time: 0,
      nextFlash: between(rng, preset.flashEvery),
      flashCount: 0,
      status: "running",
      reason: null
    };
  }
  var isInsideZone = (model) => Math.abs(model.pos) <= FLIGHT.zone;
  function pulse(model, dir) {
    if (model.status !== "running" || model.energy <= 0) return false;
    model.vel += dir * FLIGHT.pulseSpeed;
    model.energy = Math.max(0, model.energy - FLIGHT.pulseCost);
    if (model.energy <= 0) finish(model, "lose", "energy");
    return true;
  }
  function finish(model, status, reason = null) {
    if (model.status === "running") {
      model.status = status;
      model.reason = reason;
    }
  }
  function step(model, dt) {
    if (model.status !== "running") return false;
    const { preset, rng } = model;
    model.time += dt;
    model.vel += (rng() - 0.5) * 2 * preset.drift * dt;
    model.vel *= Math.max(0, 1 - FLIGHT.damping * dt);
    model.pos += model.vel * dt;
    let flashed = false;
    if (model.time >= model.nextFlash) {
      model.pos += (rng() < 0.5 ? -1 : 1) * between(rng, preset.flashSize);
      model.nextFlash = model.time + between(rng, preset.flashEvery);
      model.flashCount += 1;
      flashed = true;
    }
    if (Math.abs(model.pos) > FLIGHT.range) {
      model.pos = Math.sign(model.pos) * FLIGHT.range;
      model.vel *= -0.3;
    }
    const inside = isInsideZone(model);
    model.radiation += (FLIGHT.baseRadiation + (inside ? 0 : FLIGHT.outsideRadiation)) * dt;
    if (inside) model.progress += FLIGHT.progressRate * dt;
    if (model.progress >= 100) finish(model, "win");
    else if (model.radiation >= 100) finish(model, "lose", "radiation");
    return flashed;
  }

  // src/minigames/flight.js
  var LEVEL_NAMES = { mild: "Mild", medium: "Medium", strong: "Strong" };
  var STEP = 1 / 60;
  function runManualFlight(container, { level = "medium" } = {}) {
    return new Promise((resolve) => {
      const model = createFlightModel(level);
      const staticCanvas = el("canvas", { class: "static-canvas", "aria-hidden": "true" });
      const marker = el("img", { class: "marker", src: "assets/nave.png", alt: "" });
      const flash = el("div", { class: "flash" });
      const status = el("p", { class: "mg-status", role: "status" });
      const makeMeter = (label, className) => {
        const fill = el("div", { class: `fill ${className}` });
        const bar = el("div", { class: "bar", role: "progressbar", "aria-label": label, "aria-valuemin": "0", "aria-valuemax": "100" }, fill);
        return { fill, bar, row: el("div", { class: "mg-meter" }, el("span", { class: "mg-meter-label" }, label), bar) };
      };
      const progressMeter = makeMeter("Direction check", "check");
      const energyMeter = makeMeter("Thruster energy", "energy");
      const radiationMeter = makeMeter("Radiation alarm", "radiation");
      const leftButton = el("button", { type: "button", class: "mg-button", "aria-label": "Left thruster" }, "\u25C0 Left thruster");
      const rightButton = el("button", { type: "button", class: "mg-button", "aria-label": "Right thruster" }, "Right thruster \u25B6");
      const skipButton = el("button", { type: "button", class: "mg-skip" }, "Skip (counts as a miss)");
      const title = el("h2", { class: "mg-title", tabindex: "-1" }, "Manual flight");
      const root = el(
        "div",
        { class: "minigame flight" },
        title,
        el("p", { class: "mg-help" }, "Keep the ship straight! Push the ship into the green zone and hold it there until the direction check is complete. Every push uses Energy, and the radiation alarm keeps rising."),
        el(
          "div",
          { class: "star-screen" },
          staticCanvas,
          el("div", { class: "gauge", "aria-hidden": "true" }, el("div", { class: "zone" }), marker),
          flash,
          el("p", { class: "screen-label", "aria-hidden": "true" }, `STAR TRACKER \xB7 STORM: ${(LEVEL_NAMES[level] ?? "Medium").toUpperCase()}`)
        ),
        el("div", { class: "mg-meters" }, progressMeter.row, energyMeter.row, radiationMeter.row),
        el("div", { class: "mg-controls" }, leftButton, rightButton),
        el("p", { class: "mg-hint" }, "Tip: use the \u2190 \u2192 arrow keys. Pushing too often wastes Energy."),
        status,
        skipButton
      );
      mount(container, root);
      focusTitle(root);
      const stopStatic = startStatic(staticCanvas);
      let frame = 0;
      let last = performance.now();
      let accumulator = 0;
      let warned = false;
      let ended = false;
      const render = () => {
        const left = 50 + model.pos / FLIGHT.range * 50;
        marker.style.left = `${left}%`;
        progressMeter.fill.style.width = `${Math.min(100, model.progress)}%`;
        energyMeter.fill.style.width = `${model.energy}%`;
        radiationMeter.fill.style.width = `${Math.min(100, model.radiation)}%`;
        progressMeter.bar.setAttribute("aria-valuenow", String(Math.round(model.progress)));
        energyMeter.bar.setAttribute("aria-valuenow", String(Math.round(model.energy)));
        radiationMeter.bar.setAttribute("aria-valuenow", String(Math.round(model.radiation)));
        marker.classList.toggle("is-inside", isInsideZone(model));
      };
      const cleanup = () => {
        cancelAnimationFrame(frame);
        stopStatic();
        document.removeEventListener("keydown", onKey);
      };
      const end = async (result) => {
        if (ended) return;
        ended = true;
        cleanup();
        leftButton.disabled = true;
        rightButton.disabled = true;
        skipButton.disabled = true;
        if (result === "win") {
          status.textContent = "Direction checked! The ship is flying straight.";
          sound.win();
        } else {
          status.textContent = model.reason === "energy" ? "Out of Energy! The thrusters went quiet." : "The radiation alarm is too high! Back to the shelter!";
          sound.lose();
        }
        await sleep(TIMING.minigameEndMs);
        resolve({ result, stats: { time: model.time, flashes: model.flashCount, energyLeft: Math.round(model.energy), reason: model.reason } });
      };
      const doPulse = (dir) => {
        if (ended || !pulse(model, dir)) return;
        sound.thrust();
        render();
      };
      function onKey(event) {
        if (event.repeat) return;
        if (event.key === "ArrowLeft" || event.key === "a" || event.key === "A") {
          event.preventDefault();
          doPulse(-1);
        } else if (event.key === "ArrowRight" || event.key === "d" || event.key === "D") {
          event.preventDefault();
          doPulse(1);
        }
      }
      const loop = (now) => {
        accumulator += Math.min(0.1, (now - last) / 1e3);
        last = now;
        while (accumulator >= STEP && model.status === "running") {
          if (step(model, STEP)) {
            sound.glitch();
            flash.classList.remove("on");
            void flash.offsetWidth;
            flash.classList.add("on");
          }
          accumulator -= STEP;
        }
        if (!warned && model.radiation >= 70) {
          warned = true;
          sound.warning();
          status.textContent = "Warning: the radiation alarm is getting high!";
        }
        render();
        if (model.status !== "running") {
          end(model.status);
          return;
        }
        frame = requestAnimationFrame(loop);
      };
      leftButton.addEventListener("pointerdown", (event) => {
        event.preventDefault();
        doPulse(-1);
      });
      rightButton.addEventListener("pointerdown", (event) => {
        event.preventDefault();
        doPulse(1);
      });
      leftButton.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          doPulse(-1);
        }
      });
      rightButton.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          doPulse(1);
        }
      });
      skipButton.addEventListener("click", () => {
        model.reason = "skipped";
        end("lose");
      });
      document.addEventListener("keydown", onKey);
      render();
      frame = requestAnimationFrame((now) => {
        last = now;
        loop(now);
      });
    });
  }

  // src/minigames/types.js
  var MINIGAME_TYPES = Object.freeze(["manualFlight", "dataCheck", "marsRoverDrive", "marsRoutePlanner", "marsRadarScan"]);

  // src/minigames/mars-recon-model.js
  var MARS_RECON = Object.freeze({
    width: 19,
    height: 11,
    tileSize: 46,
    home: Object.freeze([1, 1]),
    normalCost: 1,
    rockyCost: 3,
    batteryBuffer: 38,
    maxRadarScans: 8,
    radarTolerance: 15
  });
  var SCIENCE_SITES = Object.freeze([
    {
      id: 0,
      name: "ALPHA",
      position: Object.freeze([5, 3])
    },
    {
      id: 1,
      name: "BETA",
      position: Object.freeze([12, 3])
    },
    {
      id: 2,
      name: "GAMMA",
      position: Object.freeze([16, 8])
    }
  ]);
  var RADAR_SECTORS = Object.freeze([
    {
      id: 0,
      label: "A",
      bearing: 40,
      type: "regolith",
      signal: "Fine, low-reflectance particles"
    },
    {
      id: 1,
      label: "B",
      bearing: 125,
      type: "rock",
      signal: "Strong, irregular backscatter"
    },
    {
      id: 2,
      label: "C",
      bearing: 220,
      type: "dune",
      signal: "Layered, shifting ridge pattern"
    },
    {
      id: 3,
      label: "D",
      bearing: 310,
      type: "slope",
      signal: "Consistent elevation gradient"
    }
  ]);
  var MAP_ROWS = [
    "###################",
    "#.....#...........#",
    "#.###.#.#####.###.#",
    "#...#...#...#...#.#",
    "###.#####.#.###.#.#",
    "#...#.....#.....#.#",
    "#.###.#########.#.#",
    "#...#...........#.#",
    "#.#.###.#######.#.#",
    "#.................#",
    "###################"
  ];
  function createMarsMap() {
    const map = MAP_ROWS.map((row) => row.split(""));
    const passages = [
      [5, 2],
      [5, 4],
      [6, 3],
      [9, 4],
      [12, 4],
      [13, 4],
      [16, 7],
      [15, 8],
      [12, 8],
      [5, 8],
      [4, 8],
      [4, 7],
      [7, 6],
      [12, 6],
      [13, 6],
      [17, 8]
    ];
    passages.forEach(([x, y]) => {
      map[y][x] = ".";
    });
    for (let x = 5; x <= 12; x++) {
      map[3][x] = ".";
    }
    for (let y = 3; y <= 5; y++) {
      map[y][9] = ".";
    }
    for (let x = 9; x <= 15; x++) {
      map[5][x] = ".";
    }
    for (let y = 5; y <= 8; y++) {
      map[y][15] = ".";
    }
    map[8][16] = ".";
    return map;
  }
  var MARS_MAP = createMarsMap();
  function samePosition(a, b) {
    return a[0] === b[0] && a[1] === b[1];
  }
  function isPassable(x, y) {
    return Number.isInteger(x) && Number.isInteger(y) && x >= 0 && y >= 0 && x < MARS_RECON.width && y < MARS_RECON.height && MARS_MAP[y][x] !== "#";
  }
  function isRocky(x, y) {
    return isPassable(x, y) && (x * 7 + y * 11) % 9 === 0;
  }
  function movementCost(x, y) {
    if (!isPassable(x, y)) {
      return Infinity;
    }
    return isRocky(x, y) ? MARS_RECON.rockyCost : MARS_RECON.normalCost;
  }
  var DIRECTIONS2 = Object.freeze([
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1]
  ]);
  function shortestPath(start, destination) {
    if (!isPassable(...start) || !isPassable(...destination)) {
      return {
        cost: Infinity,
        path: []
      };
    }
    const distances = Array.from(
      { length: MARS_RECON.height },
      () => Array(MARS_RECON.width).fill(Infinity)
    );
    const previous = /* @__PURE__ */ new Map();
    const queue = [
      {
        x: start[0],
        y: start[1],
        cost: 0
      }
    ];
    distances[start[1]][start[0]] = 0;
    while (queue.length > 0) {
      queue.sort((a, b) => a.cost - b.cost);
      const current = queue.shift();
      const { x, y, cost } = current;
      if (cost !== distances[y][x]) {
        continue;
      }
      if (samePosition([x, y], destination)) {
        const path = [];
        let position = [x, y];
        while (!samePosition(position, start)) {
          path.unshift(position);
          position = previous.get(
            position.join(",")
          );
        }
        return { cost, path };
      }
      for (const [dx, dy] of DIRECTIONS2) {
        const nx = x + dx;
        const ny = y + dy;
        if (!isPassable(nx, ny)) {
          continue;
        }
        const nextCost = cost + movementCost(nx, ny);
        if (nextCost < distances[ny][nx]) {
          distances[ny][nx] = nextCost;
          previous.set(
            `${nx},${ny}`,
            [x, y]
          );
          queue.push({
            x: nx,
            y: ny,
            cost: nextCost
          });
        }
      }
    }
    return {
      cost: Infinity,
      path: []
    };
  }
  function calculateTour(order) {
    let currentPosition = MARS_RECON.home;
    let totalCost = 0;
    const fullPath = [];
    for (const siteId of [...order, -1]) {
      const destination = siteId === -1 ? MARS_RECON.home : SCIENCE_SITES[siteId]?.position;
      if (!destination) {
        return {
          cost: Infinity,
          path: []
        };
      }
      const segment = shortestPath(
        currentPosition,
        destination
      );
      if (!Number.isFinite(segment.cost)) {
        return {
          cost: Infinity,
          path: []
        };
      }
      totalCost += segment.cost;
      fullPath.push(...segment.path);
      currentPosition = destination;
    }
    return {
      cost: totalCost,
      path: fullPath
    };
  }
  function getSiteOrders() {
    return [
      [0, 1, 2],
      [0, 2, 1],
      [1, 0, 2],
      [1, 2, 0],
      [2, 0, 1],
      [2, 1, 0]
    ];
  }
  function minimumTour() {
    let best = {
      order: [],
      cost: Infinity,
      path: []
    };
    for (const order of getSiteOrders()) {
      const result = calculateTour(order);
      if (result.cost < best.cost) {
        best = {
          order: [...order],
          cost: result.cost,
          path: result.path
        };
      }
    }
    return best;
  }
  var INITIAL_BATTERY = minimumTour().cost + MARS_RECON.batteryBuffer;
  function createMarsSession(route = "A") {
    if (!["A", "B", "C"].includes(route)) {
      throw new Error(
        `Invalid Mars reconnaissance route: ${route}`
      );
    }
    return {
      route,
      status: "running",
      reason: null,
      x: MARS_RECON.home[0],
      y: MARS_RECON.home[1],
      battery: INITIAL_BATTERY,
      scanned: /* @__PURE__ */ new Set(),
      visited: /* @__PURE__ */ new Set([
        MARS_RECON.home.join(",")
      ]),
      // Route B
      plan: [],
      expedition: null,
      // Route C
      bearing: 0,
      attempts: 0,
      readings: {},
      classified: {}
    };
  }
  function finishSession(session, status, reason = null) {
    if (session.status !== "running") {
      return false;
    }
    session.status = status;
    session.reason = reason;
    return true;
  }
  function endMarsSession(session) {
    return finishSession(
      session,
      "lose",
      "ended-early"
    );
  }
  function isAtHabitat(session) {
    return samePosition(
      [session.x, session.y],
      MARS_RECON.home
    );
  }
  function moveMarsRover(session, dx, dy) {
    if (session.route !== "A" || session.status !== "running") {
      return {
        moved: false,
        reason: "not-running"
      };
    }
    if (!Number.isInteger(dx) || !Number.isInteger(dy) || Math.abs(dx) + Math.abs(dy) !== 1) {
      return {
        moved: false,
        reason: "invalid-direction"
      };
    }
    const nx = session.x + dx;
    const ny = session.y + dy;
    if (!isPassable(nx, ny)) {
      return {
        moved: false,
        reason: "obstacle"
      };
    }
    const cost = movementCost(nx, ny);
    if (session.battery < cost) {
      finishSession(
        session,
        "lose",
        "battery-exhausted"
      );
      return {
        moved: false,
        reason: "battery-exhausted"
      };
    }
    session.x = nx;
    session.y = ny;
    session.battery -= cost;
    session.visited.add(`${nx},${ny}`);
    const site = SCIENCE_SITES.find(
      (item) => samePosition(item.position, [nx, ny])
    );
    const returnCost = shortestPath(
      [nx, ny],
      MARS_RECON.home
    ).cost;
    const reserveWarning = session.battery < returnCost;
    if (isAtHabitat(session) && session.scanned.size === SCIENCE_SITES.length) {
      finishSession(session, "win");
    } else if (session.battery === 0 && !isAtHabitat(session)) {
      finishSession(
        session,
        "lose",
        "battery-exhausted"
      );
    }
    return {
      moved: true,
      position: [nx, ny],
      cost,
      battery: session.battery,
      site: site?.name ?? null,
      reserveWarning,
      returnCost,
      status: session.status
    };
  }
  function scanMarsSite(session) {
    if (session.route !== "A" || session.status !== "running") {
      return {
        success: false,
        reason: "not-running"
      };
    }
    const site = SCIENCE_SITES.find(
      (item) => samePosition(
        item.position,
        [session.x, session.y]
      )
    );
    if (!site) {
      return {
        success: false,
        reason: "not-at-site"
      };
    }
    if (session.scanned.has(site.id)) {
      return {
        success: false,
        reason: "already-scanned"
      };
    }
    session.scanned.add(site.id);
    return {
      success: true,
      site: site.name,
      scanned: session.scanned.size,
      remaining: SCIENCE_SITES.length - session.scanned.size
    };
  }
  function toggleMarsWaypoint(session, siteId) {
    if (session.route !== "B" || session.status !== "running" || session.expedition !== null) {
      return false;
    }
    if (!Number.isInteger(siteId) || siteId < 0 || siteId >= SCIENCE_SITES.length) {
      return false;
    }
    const index = session.plan.indexOf(siteId);
    if (index >= 0) {
      session.plan.splice(index, 1);
    } else {
      session.plan.push(siteId);
    }
    return true;
  }
  function evaluateMarsPlan(session) {
    const tour = calculateTour(session.plan);
    const allSitesSelected = session.plan.length === SCIENCE_SITES.length && new Set(session.plan).size === SCIENCE_SITES.length;
    return {
      ...tour,
      allSitesSelected,
      affordable: tour.cost <= session.battery,
      remainingBattery: session.battery - tour.cost,
      valid: allSitesSelected && tour.cost <= session.battery
    };
  }
  function startMarsExpedition(session) {
    if (session.route !== "B" || session.status !== "running" || session.expedition !== null) {
      return {
        success: false,
        reason: "not-available"
      };
    }
    const estimate = evaluateMarsPlan(session);
    if (!estimate.allSitesSelected) {
      return {
        success: false,
        reason: "missing-waypoints"
      };
    }
    if (!estimate.affordable) {
      return {
        success: false,
        reason: "insufficient-battery"
      };
    }
    session.expedition = {
      path: estimate.path.map(
        (position) => [...position]
      ),
      index: 0,
      cost: estimate.cost
    };
    return {
      success: true,
      path: session.expedition.path,
      cost: estimate.cost
    };
  }
  function stepMarsExpedition(session) {
    if (session.route !== "B" || session.status !== "running" || !session.expedition) {
      return {
        moved: false,
        reason: "not-running"
      };
    }
    const expedition = session.expedition;
    if (expedition.index >= expedition.path.length) {
      finishSession(session, "win");
      return {
        moved: false,
        finished: true,
        status: session.status
      };
    }
    const [nx, ny] = expedition.path[expedition.index];
    const cost = movementCost(nx, ny);
    if (session.battery < cost) {
      finishSession(
        session,
        "lose",
        "battery-exhausted"
      );
      return {
        moved: false,
        reason: "battery-exhausted"
      };
    }
    session.x = nx;
    session.y = ny;
    session.battery -= cost;
    session.visited.add(`${nx},${ny}`);
    const site = SCIENCE_SITES.find(
      (item) => samePosition(item.position, [nx, ny])
    );
    if (site) {
      session.scanned.add(site.id);
    }
    expedition.index++;
    const finished = expedition.index >= expedition.path.length;
    if (finished) {
      if (isAtHabitat(session) && session.scanned.size === SCIENCE_SITES.length) {
        finishSession(session, "win");
      } else {
        finishSession(
          session,
          "lose",
          "incomplete-expedition"
        );
      }
    }
    return {
      moved: true,
      position: [nx, ny],
      cost,
      battery: session.battery,
      finished,
      status: session.status
    };
  }
  function normalizeBearing(angle) {
    if (!Number.isFinite(angle)) {
      return 0;
    }
    return (angle % 360 + 360) % 360;
  }
  function bearingDifference(a, b) {
    const difference = Math.abs(
      normalizeBearing(a) - normalizeBearing(b)
    );
    return Math.min(
      difference,
      360 - difference
    );
  }
  function aimMarsRadar(session, angle) {
    if (session.route !== "C" || session.status !== "running") {
      return false;
    }
    session.bearing = normalizeBearing(angle);
    return true;
  }
  function scanMarsSector(session, sectorId) {
    if (session.route !== "C" || session.status !== "running") {
      return {
        success: false,
        reason: "not-running"
      };
    }
    const sector = RADAR_SECTORS[sectorId];
    if (!sector) {
      return {
        success: false,
        reason: "invalid-sector"
      };
    }
    if (session.attempts >= MARS_RECON.maxRadarScans) {
      return {
        success: false,
        reason: "no-attempts"
      };
    }
    session.attempts++;
    const difference = bearingDifference(
      session.bearing,
      sector.bearing
    );
    const aligned = difference <= MARS_RECON.radarTolerance;
    if (aligned) {
      session.readings[sectorId] = sector.signal;
    }
    return {
      success: aligned,
      sector: sector.label,
      signal: aligned ? sector.signal : null,
      difference,
      attempts: session.attempts,
      remaining: MARS_RECON.maxRadarScans - session.attempts
    };
  }
  function classifyMarsSector(session, sectorId, terrainType) {
    if (session.route !== "C" || session.status !== "running") {
      return {
        success: false,
        reason: "not-running"
      };
    }
    const sector = RADAR_SECTORS[sectorId];
    if (!sector) {
      return {
        success: false,
        reason: "invalid-sector"
      };
    }
    if (!session.readings[sectorId]) {
      return {
        success: false,
        reason: "not-scanned"
      };
    }
    const correct = terrainType === sector.type;
    session.classified[sectorId] = {
      type: terrainType,
      correct
    };
    const correctCount = getCorrectMarsSectors(session);
    if (correctCount === RADAR_SECTORS.length) {
      finishSession(session, "win");
    }
    return {
      success: correct,
      sector: sector.label,
      correctCount,
      total: RADAR_SECTORS.length,
      status: session.status
    };
  }
  function getCorrectMarsSectors(session) {
    return Object.values(session.classified).filter((item) => item.correct).length;
  }
  function evaluateMarsMission(session) {
    if (session.route === "A") {
      const returnedHome = isAtHabitat(session);
      const success2 = session.status === "win" && returnedHome && session.scanned.size === SCIENCE_SITES.length;
      const partial2 = !success2 && returnedHome && session.scanned.size > 0;
      return {
        route: "A",
        success: success2,
        partial: partial2,
        status: success2 ? "win" : "lose",
        scanned: session.scanned.size,
        batteryRemaining: session.battery,
        mapQuality: success2 ? "full" : partial2 ? "partial" : "none"
      };
    }
    if (session.route === "B") {
      const success2 = session.status === "win" && isAtHabitat(session) && session.scanned.size === SCIENCE_SITES.length;
      return {
        route: "B",
        success: success2,
        partial: false,
        status: success2 ? "win" : "lose",
        scanned: session.scanned.size,
        batteryRemaining: session.battery,
        mapQuality: success2 ? "full" : "none"
      };
    }
    const correctCount = getCorrectMarsSectors(session);
    const success = session.status === "win" && correctCount === RADAR_SECTORS.length;
    const partial = !success && correctCount >= 2;
    return {
      route: "C",
      success,
      partial,
      status: success ? "win" : "lose",
      classified: correctCount,
      attempts: session.attempts,
      batteryRemaining: null,
      mapQuality: success || partial ? "partial" : "none"
    };
  }

  // src/minigames/mars-recon.js
  var VIEW = {
    width: 960,
    height: 590,
    tile: MARS_RECON.tileSize,
    offsetX: 43,
    offsetY: 38,
    animationDelay: 75
  };
  var ROUTES = {
    A: {
      title: "Manual rover driving",
      subtitle: "Drive, scan, and return",
      help: "Use WASD or arrow keys to drive. Press Space to scan each science site. Return to the habitat safely."
    },
    B: {
      title: "Autonomous route planning",
      subtitle: "Plan a safe expedition",
      help: "Select all three science sites in order. Review the battery estimate, then execute your plan."
    },
    C: {
      title: "Remote terrain mapping",
      subtitle: "Radar reconnaissance",
      help: "Align the antenna, scan four sectors, and classify the terrain. You have eight scan attempts."
    }
  };
  var COLORS = {
    background: "#291d25",
    sand: "#b27659",
    sandDetail: "#d39b75",
    rocky: "#805147",
    rockDetail: "#c58a68",
    obstacle: "#3e343c",
    obstacleDetail: "#5b4546",
    habitat: "#72e7ed",
    science: "#ffcf79",
    scanned: "#7de7a9",
    rover: "#f4f6e8",
    roverDark: "#17263a",
    text: "#f7d9b2",
    radar: "#112b36",
    radarLine: "#6bc6c5"
  };
  function drawBadge(ctx, x, y, color, label) {
    const tile = VIEW.tile;
    const px = x * tile + tile / 2;
    const py = y * tile + tile / 2;
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = 15;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(px, py, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#142333";
    ctx.font = "bold 17px monospace";
    ctx.textAlign = "center";
    ctx.fillText(label, px, py + 6);
    ctx.restore();
  }
  function drawTerrainTile(ctx, x, y) {
    const size = VIEW.tile;
    const px = x * size;
    const py = y * size;
    const passable = isPassable(x, y);
    const rocky = isRocky(x, y);
    ctx.fillStyle = !passable ? COLORS.obstacle : rocky ? COLORS.rocky : COLORS.sand;
    ctx.fillRect(px + 1, py + 1, size - 2, size - 2);
    if (!passable) {
      ctx.fillStyle = COLORS.obstacleDetail;
      ctx.beginPath();
      ctx.moveTo(px + 4, py + 35);
      ctx.lineTo(px + 13, py + 8);
      ctx.lineTo(px + 32, py + 4);
      ctx.lineTo(px + 42, py + 29);
      ctx.lineTo(px + 28, py + 42);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "#98736b";
      ctx.stroke();
      return;
    }
    ctx.fillStyle = rocky ? COLORS.rockDetail : COLORS.sandDetail;
    for (let i = 0; i < 3; i++) {
      const dx = (x * 13 + y * 7 + i * 17) % 37;
      const dy = (y * 19 + x * 5 + i * 11) % 36;
      ctx.fillRect(px + dx + 5, py + dy + 5, 3, 2);
    }
  }
  function drawGrid(ctx) {
    const size = VIEW.tile;
    ctx.strokeStyle = "#ffffff12";
    ctx.lineWidth = 1;
    for (let x = 0; x <= MARS_RECON.width; x++) {
      ctx.beginPath();
      ctx.moveTo(x * size, 0);
      ctx.lineTo(x * size, MARS_RECON.height * size);
      ctx.stroke();
    }
    for (let y = 0; y <= MARS_RECON.height; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * size);
      ctx.lineTo(MARS_RECON.width * size, y * size);
      ctx.stroke();
    }
  }
  function drawRover(ctx, x, y) {
    const size = VIEW.tile;
    const px = x * size + size / 2;
    const py = y * size + size / 2;
    ctx.save();
    ctx.translate(px, py);
    ctx.shadowColor = "#0a0e16";
    ctx.shadowBlur = 11;
    ctx.fillStyle = COLORS.rover;
    ctx.fillRect(-13, -10, 26, 20);
    ctx.fillStyle = COLORS.roverDark;
    ctx.fillRect(-10, -7, 20, 14);
    ctx.fillStyle = "#f6c981";
    ctx.fillRect(-5, -5, 10, 10);
    ctx.fillStyle = "#182638";
    ctx.fillRect(-17, -12, 6, 8);
    ctx.fillRect(11, -12, 6, 8);
    ctx.fillRect(-17, 4, 6, 8);
    ctx.fillRect(11, 4, 6, 8);
    ctx.restore();
  }
  function drawPlannedPath(ctx, session) {
    if (session.route !== "B" || session.plan.length === 0) {
      return;
    }
    const estimate = evaluateMarsPlan(session);
    const size = VIEW.tile;
    ctx.save();
    ctx.strokeStyle = "#7be7e5";
    ctx.lineWidth = 5;
    ctx.setLineDash([8, 7]);
    ctx.beginPath();
    ctx.moveTo(
      MARS_RECON.home[0] * size + size / 2,
      MARS_RECON.home[1] * size + size / 2
    );
    for (const [x, y] of estimate.path) {
      ctx.lineTo(
        x * size + size / 2,
        y * size + size / 2
      );
    }
    ctx.stroke();
    ctx.restore();
  }
  function drawTerrain(ctx, session) {
    ctx.save();
    ctx.translate(VIEW.offsetX, VIEW.offsetY);
    for (let y = 0; y < MARS_RECON.height; y++) {
      for (let x = 0; x < MARS_RECON.width; x++) {
        drawTerrainTile(ctx, x, y);
      }
    }
    drawGrid(ctx);
    drawPlannedPath(ctx, session);
    drawBadge(
      ctx,
      ...MARS_RECON.home,
      COLORS.habitat,
      "H"
    );
    for (const site of SCIENCE_SITES) {
      const scanned = session.scanned.has(site.id);
      drawBadge(
        ctx,
        ...site.position,
        scanned ? COLORS.scanned : COLORS.science,
        scanned ? "\u2713" : String(site.id + 1)
      );
    }
    drawRover(ctx, session.x, session.y);
    ctx.restore();
    ctx.fillStyle = COLORS.text;
    ctx.font = "bold 16px monospace";
    ctx.textAlign = "left";
    ctx.fillText("MARS SURFACE \xB7 SOL 264", 43, 568);
    ctx.textAlign = "right";
    ctx.fillText(
      session.route === "A" ? "MANUAL CONTROL" : "AUTONOMOUS NAVIGATION",
      917,
      568
    );
  }
  function drawRadar(ctx, session) {
    const centerX = 470;
    const centerY = 283;
    const radius = 210;
    ctx.fillStyle = COLORS.radar;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius + 22, 0, Math.PI * 2);
    ctx.fill();
    for (let ring = 1; ring <= 4; ring++) {
      ctx.strokeStyle = "#6bc6c533";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(
        centerX,
        centerY,
        radius * ring / 4,
        0,
        Math.PI * 2
      );
      ctx.stroke();
    }
    for (let angle = 0; angle < 360; angle += 30) {
      const radians2 = (angle - 90) * Math.PI / 180;
      ctx.strokeStyle = "#6bc6c52a";
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(
        centerX + radius * Math.cos(radians2),
        centerY + radius * Math.sin(radians2)
      );
      ctx.stroke();
    }
    for (const sector of RADAR_SECTORS) {
      const radians2 = (sector.bearing - 90) * Math.PI / 180;
      const x = centerX + 175 * Math.cos(radians2);
      const y = centerY + 175 * Math.sin(radians2);
      const correct = session.classified[sector.id]?.correct;
      ctx.fillStyle = correct ? COLORS.scanned : COLORS.science;
      ctx.beginPath();
      ctx.arc(x, y, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#182839";
      ctx.textAlign = "center";
      ctx.font = "bold 18px monospace";
      ctx.fillText(
        correct ? "\u2713" : sector.label,
        x,
        y + 6
      );
    }
    const radians = (session.bearing - 90) * Math.PI / 180;
    ctx.strokeStyle = "#75edf1";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(
      centerX + radius * Math.cos(radians),
      centerY + radius * Math.sin(radians)
    );
    ctx.stroke();
    ctx.fillStyle = "#a2f2f4";
    ctx.beginPath();
    ctx.arc(centerX, centerY, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.text;
    ctx.font = "bold 16px monospace";
    ctx.textAlign = "left";
    ctx.fillText("REMOTE RADAR \xB7 HABITAT", 35, 552);
    ctx.textAlign = "right";
    ctx.fillText(
      `BEARING ${Math.round(session.bearing)}\xB0`,
      917,
      552
    );
  }
  function renderCanvas(ctx, session) {
    ctx.clearRect(0, 0, VIEW.width, VIEW.height);
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    if (session.route === "C") {
      drawRadar(ctx, session);
    } else {
      drawTerrain(ctx, session);
    }
  }
  function runMarsRecon(container, { route = "A" } = {}) {
    return new Promise((resolve) => {
      const selectedRoute = ROUTES[route] ? route : "A";
      const session = createMarsSession(selectedRoute);
      const info = ROUTES[selectedRoute];
      let ended = false;
      let busy = false;
      let animationFrame = null;
      let holdTimer = null;
      const title = el(
        "h2",
        { class: "mg-title", tabindex: "-1" },
        info.title
      );
      const help = el(
        "p",
        { class: "mg-help" },
        info.help
      );
      const canvas = el("canvas", {
        class: "mars-canvas",
        width: VIEW.width,
        height: VIEW.height,
        "aria-label": "Mars reconnaissance terrain map"
      });
      const ctx = canvas.getContext("2d");
      const status = el(
        "p",
        {
          class: "mg-status mars-status",
          role: "status",
          "aria-live": "polite"
        },
        "AURA: Mission systems ready."
      );
      const batteryLabel = el(
        "span",
        { class: "mars-stat-value" },
        ""
      );
      const batteryFill = el("div", {
        class: "fill mars-battery-fill"
      });
      const batteryBar = el(
        "div",
        {
          class: "bar",
          role: "progressbar",
          "aria-label": "Rover battery",
          "aria-valuemin": "0",
          "aria-valuemax": String(INITIAL_BATTERY)
        },
        batteryFill
      );
      const batteryPanel = el(
        "div",
        { class: "mars-stat" },
        el(
          "div",
          { class: "mars-stat-heading" },
          el("span", {}, "ROVER BATTERY"),
          batteryLabel
        ),
        batteryBar
      );
      const progressLabel = el(
        "span",
        { class: "mars-stat-value" },
        ""
      );
      const progressFill = el("div", {
        class: "fill mars-progress-fill"
      });
      const progressBar = el(
        "div",
        {
          class: "bar",
          role: "progressbar",
          "aria-label": "Mission progress",
          "aria-valuemin": "0",
          "aria-valuemax": selectedRoute === "C" ? "4" : "3"
        },
        progressFill
      );
      const progressPanel = el(
        "div",
        { class: "mars-stat" },
        el(
          "div",
          { class: "mars-stat-heading" },
          el(
            "span",
            {},
            selectedRoute === "C" ? "SECTORS CLASSIFIED" : "SCIENCE SITES"
          ),
          progressLabel
        ),
        progressBar
      );
      const controls = el("div", {
        class: "mars-controls"
      });
      const skipButton = el(
        "button",
        {
          type: "button",
          class: "mg-skip mars-end"
        },
        "End & review (counts as a miss)"
      );
      const sidebar = el(
        "aside",
        { class: "mars-sidebar" },
        el(
          "p",
          { class: "mars-subtitle" },
          info.subtitle
        ),
        batteryPanel,
        progressPanel,
        controls,
        status,
        skipButton
      );
      if (selectedRoute === "C") {
        batteryPanel.hidden = true;
      }
      const root = el(
        "div",
        {
          class: "minigame mars-recon",
          "data-route": selectedRoute
        },
        title,
        help,
        el(
          "div",
          { class: "mars-layout" },
          el(
            "div",
            { class: "mars-board" },
            canvas,
            el(
              "p",
              { class: "mars-legend" },
              "H = Habitat \xB7 1\u20133 = Science sites \xB7 Dark rocks = Obstacles"
            )
          ),
          sidebar
        )
      );
      mount(container, root);
      focusTitle(root);
      function message(text) {
        status.textContent = `AURA: ${text}`;
      }
      function render() {
        if (ended) return;
        renderCanvas(ctx, session);
        const batteryPercent = session.battery / INITIAL_BATTERY * 100;
        batteryLabel.textContent = `${session.battery} / ${INITIAL_BATTERY}`;
        batteryFill.style.width = `${Math.max(0, batteryPercent)}%`;
        batteryBar.setAttribute(
          "aria-valuenow",
          String(session.battery)
        );
        let progress = 0;
        let total = 3;
        if (selectedRoute === "A") {
          progress = session.scanned.size;
        } else if (selectedRoute === "B") {
          progress = session.scanned.size;
        } else {
          progress = getCorrectMarsSectors(session);
          total = 4;
        }
        progressLabel.textContent = `${progress} / ${total}`;
        progressFill.style.width = `${progress / total * 100}%`;
        progressBar.setAttribute(
          "aria-valuenow",
          String(progress)
        );
      }
      function stopMovement() {
        if (holdTimer !== null) {
          clearInterval(holdTimer);
          holdTimer = null;
        }
      }
      function cleanup() {
        stopMovement();
        if (animationFrame !== null) {
          cancelAnimationFrame(animationFrame);
          animationFrame = null;
        }
        document.removeEventListener("keydown", onKey);
        window.removeEventListener("pointerup", stopMovement);
        window.removeEventListener("blur", stopMovement);
      }
      async function finish2() {
        if (ended) return;
        ended = true;
        cleanup();
        const evaluation = evaluateMarsMission(session);
        const result = evaluation.status;
        skipButton.disabled = true;
        controls.querySelectorAll("button, select, input").forEach((element) => {
          element.disabled = true;
        });
        if (result === "win") {
          message("Mission accomplished. Reconnaissance complete.");
          sound.win();
        } else {
          message("Mission ended. Reviewing available survey data.");
          sound.lose();
        }
        await sleep(TIMING.minigameEndMs);
        resolve({
          result,
          stats: {
            ...evaluation,
            route: selectedRoute,
            reason: session.reason
          }
        });
      }
      function checkCompletion() {
        if (session.status !== "running") {
          finish2();
          return true;
        }
        return false;
      }
      function move(dx, dy) {
        if (ended || busy || selectedRoute !== "A") {
          return;
        }
        const result = moveMarsRover(session, dx, dy);
        if (!result.moved) {
          const messages = {
            obstacle: "Obstacle ahead. Choose another corridor.",
            "battery-exhausted": "Rover battery exhausted.",
            "invalid-direction": "Invalid movement command."
          };
          message(
            messages[result.reason] ?? "Movement unavailable."
          );
          render();
          checkCompletion();
          return;
        }
        sound.thrust();
        if (result.reserveWarning) {
          message(
            "WARNING: Battery reserve is below the estimated return requirement!"
          );
        } else if (result.site) {
          message(
            `Site ${result.site} reached. Press Space to scan.`
          );
        } else if (isAtHabitat(session)) {
          message("Rover returned to habitat.");
        } else {
          message(
            `Rover moved. Battery cost: ${result.cost}.`
          );
        }
        render();
        checkCompletion();
      }
      function scan() {
        if (ended || selectedRoute !== "A") {
          return;
        }
        const result = scanMarsSite(session);
        if (result.success) {
          sound.good();
          message(
            `Site ${result.site} scanned. ${result.remaining} sites remaining.`
          );
        } else {
          sound.bad();
          message(
            result.reason === "already-scanned" ? "This site has already been scanned." : "Move onto a science marker before scanning."
          );
        }
        render();
      }
      function createMoveButton(symbol, dx, dy, label) {
        const button = el(
          "button",
          {
            type: "button",
            class: "mg-button mars-arrow",
            "aria-label": label
          },
          symbol
        );
        button.addEventListener("pointerdown", (event) => {
          if (ended) return;
          event.preventDefault();
          stopMovement();
          move(dx, dy);
          holdTimer = setInterval(() => {
            move(dx, dy);
          }, 145);
        });
        [
          "pointerup",
          "pointerleave",
          "pointercancel"
        ].forEach((eventName) => {
          button.addEventListener(eventName, stopMovement);
        });
        return button;
      }
      function setupManualControls() {
        const up = createMoveButton("\u2191", 0, -1, "Move up");
        const left = createMoveButton("\u2190", -1, 0, "Move left");
        const down = createMoveButton("\u2193", 0, 1, "Move down");
        const right = createMoveButton("\u2192", 1, 0, "Move right");
        const arrows = el(
          "div",
          { class: "mars-arrows" },
          el("span"),
          up,
          el("span"),
          left,
          down,
          right
        );
        const scanButton = el(
          "button",
          {
            type: "button",
            class: "mg-button mars-action"
          },
          "SCAN SITE \xB7 SPACE"
        );
        scanButton.addEventListener("click", scan);
        controls.append(
          el(
            "p",
            { class: "mars-control-label" },
            "MANUAL ROVER CONTROLS"
          ),
          arrows,
          scanButton
        );
      }
      function setupPlannerControls() {
        const choices = el(
          "div",
          { class: "mars-waypoints" }
        );
        const estimate = el(
          "p",
          { class: "mars-reading" }
        );
        const executeButton = el(
          "button",
          {
            type: "button",
            class: "mg-button mars-action"
          },
          "EXECUTE PLAN"
        );
        const clearButton = el(
          "button",
          {
            type: "button",
            class: "mg-button"
          },
          "CLEAR PLAN"
        );
        function renderPlanner() {
          choices.replaceChildren();
          for (const site of SCIENCE_SITES) {
            const position = session.plan.indexOf(site.id);
            const selected = position !== -1;
            const button = el(
              "button",
              {
                type: "button",
                class: `mars-waypoint${selected ? " selected" : ""}`
              },
              el("strong", {}, `SITE ${site.name}`),
              el(
                "span",
                {},
                selected ? `#${position + 1}` : "+ ADD"
              )
            );
            button.disabled = busy || ended;
            button.addEventListener("click", () => {
              if (busy || ended) return;
              toggleMarsWaypoint(session, site.id);
              sound.good();
              renderPlanner();
              render();
            });
            choices.append(button);
          }
          const plan = evaluateMarsPlan(session);
          estimate.textContent = `Estimated power: ${plan.cost} / ${INITIAL_BATTERY} \xB7 Includes return trip`;
          executeButton.disabled = busy || ended || !plan.valid;
          clearButton.disabled = busy || ended || session.plan.length === 0;
        }
        function animateExpedition() {
          let lastFrame = 0;
          function stepFrame(timestamp) {
            if (ended || !busy) return;
            if (timestamp - lastFrame >= VIEW.animationDelay) {
              lastFrame = timestamp;
              const result = stepMarsExpedition(session);
              render();
              if (result.finished) {
                busy = false;
                animationFrame = null;
                if (!checkCompletion()) {
                  message("Expedition ended without completion.");
                }
                return;
              }
              if (session.status !== "running") {
                busy = false;
                animationFrame = null;
                checkCompletion();
                return;
              }
            }
            animationFrame = requestAnimationFrame(stepFrame);
          }
          animationFrame = requestAnimationFrame(stepFrame);
        }
        executeButton.addEventListener("click", () => {
          if (busy || ended) return;
          const result = startMarsExpedition(session);
          if (!result.success) {
            sound.bad();
            message("The planned route cannot be executed.");
            return;
          }
          busy = true;
          sound.good();
          message(
            "Autonomous rover expedition in progress."
          );
          renderPlanner();
          animateExpedition();
        });
        clearButton.addEventListener("click", () => {
          if (busy || ended) return;
          session.plan = [];
          renderPlanner();
          render();
        });
        controls.append(
          el(
            "p",
            { class: "mars-control-label" },
            "SELECT SCIENCE WAYPOINTS"
          ),
          choices,
          estimate,
          executeButton,
          clearButton
        );
        renderPlanner();
      }
      function setupRadarControls() {
        const sectorSelect = el(
          "select",
          {
            class: "mars-select",
            "aria-label": "Radar sector"
          },
          ...RADAR_SECTORS.map(
            (sector) => el(
              "option",
              { value: String(sector.id) },
              `Sector ${sector.label}`
            )
          )
        );
        const bearingLabel = el(
          "strong",
          { class: "mars-bearing" },
          "0\xB0"
        );
        const bearingSlider = el("input", {
          type: "range",
          class: "mars-slider",
          min: "0",
          max: "359",
          step: "1",
          value: "0",
          "aria-label": "Antenna bearing"
        });
        const sectorHint = el(
          "p",
          { class: "mars-reading" }
        );
        const radarReading = el(
          "p",
          { class: "mars-reading" },
          "No valid signal recorded."
        );
        const scanButton = el(
          "button",
          {
            type: "button",
            class: "mg-button mars-action"
          },
          "SCAN SECTOR"
        );
        const classification = el(
          "select",
          {
            class: "mars-select",
            "aria-label": "Terrain classification"
          },
          ...[
            "regolith",
            "rock",
            "dune",
            "slope"
          ].map(
            (type) => el(
              "option",
              { value: type },
              type.toUpperCase()
            )
          )
        );
        const saveButton = el(
          "button",
          {
            type: "button",
            class: "mg-button"
          },
          "SAVE CLASSIFICATION"
        );
        function selectedSector() {
          return Number(sectorSelect.value);
        }
        function renderRadarControls() {
          const sector = RADAR_SECTORS[selectedSector()];
          bearingLabel.textContent = `${Math.round(session.bearing)}\xB0`;
          sectorHint.textContent = `Sector ${sector.label}: signal near ${sector.bearing}\xB0 (\xB1${MARS_RECON.radarTolerance}\xB0). Scans remaining: ${MARS_RECON.maxRadarScans - session.attempts}`;
          radarReading.textContent = session.readings[sector.id] ? `SIGNAL: ${session.readings[sector.id]}` : "No valid signal recorded for this sector.";
          scanButton.disabled = ended || session.attempts >= MARS_RECON.maxRadarScans;
          saveButton.disabled = ended || !session.readings[sector.id];
        }
        bearingSlider.addEventListener("input", () => {
          if (ended) return;
          aimMarsRadar(
            session,
            Number(bearingSlider.value)
          );
          renderRadarControls();
          render();
        });
        sectorSelect.addEventListener("change", () => {
          renderRadarControls();
          render();
        });
        scanButton.addEventListener("click", () => {
          if (ended) return;
          const result = scanMarsSector(
            session,
            selectedSector()
          );
          if (result.success) {
            sound.good();
            message(
              "Radar signal acquired. Classify the terrain."
            );
          } else {
            sound.bad();
            message(
              "Weak signal. Adjust the antenna bearing."
            );
          }
          renderRadarControls();
          render();
        });
        saveButton.addEventListener("click", () => {
          if (ended) return;
          const result = classifyMarsSector(
            session,
            selectedSector(),
            classification.value
          );
          if (result.success) {
            sound.good();
            message(
              `Correct terrain classification. ${result.correctCount}/4 sectors complete.`
            );
          } else {
            sound.bad();
            message(
              "Classification mismatch. Review the signal."
            );
          }
          renderRadarControls();
          render();
          checkCompletion();
        });
        controls.append(
          el(
            "p",
            { class: "mars-control-label" },
            "RADAR ALIGNMENT"
          ),
          sectorSelect,
          el(
            "div",
            { class: "mars-stat-heading" },
            el("span", {}, "ANTENNA BEARING"),
            bearingLabel
          ),
          bearingSlider,
          sectorHint,
          scanButton,
          radarReading,
          el(
            "p",
            { class: "mars-control-label" },
            "TERRAIN CLASSIFICATION"
          ),
          classification,
          saveButton
        );
        renderRadarControls();
      }
      const KEY_DIRECTIONS = {
        ArrowUp: [0, -1],
        ArrowDown: [0, 1],
        ArrowLeft: [-1, 0],
        ArrowRight: [1, 0],
        w: [0, -1],
        s: [0, 1],
        a: [-1, 0],
        d: [1, 0]
      };
      function onKey(event) {
        if (ended || busy || selectedRoute !== "A" || event.repeat || event.ctrlKey || event.metaKey || event.altKey) {
          return;
        }
        const tag = event.target?.tagName;
        if (["INPUT", "SELECT", "TEXTAREA"].includes(tag)) {
          return;
        }
        const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
        const direction = KEY_DIRECTIONS[key];
        if (direction) {
          event.preventDefault();
          move(...direction);
          return;
        }
        if (event.code === "Space") {
          event.preventDefault();
          scan();
        }
      }
      skipButton.addEventListener("click", () => {
        if (ended) return;
        endMarsSession(session);
        finish2();
      });
      if (selectedRoute === "A") {
        setupManualControls();
      } else if (selectedRoute === "B") {
        setupPlannerControls();
      } else {
        setupRadarControls();
      }
      document.addEventListener("keydown", onKey);
      window.addEventListener("pointerup", stopMovement);
      window.addEventListener("blur", stopMovement);
      render();
    });
  }
  function runMarsRoverDrive(container, config = {}) {
    return runMarsRecon(container, {
      ...config,
      route: "A"
    });
  }
  function runMarsRoutePlanner(container, config = {}) {
    return runMarsRecon(container, {
      ...config,
      route: "B"
    });
  }
  function runMarsRadarScan(container, config = {}) {
    return runMarsRecon(container, {
      ...config,
      route: "C"
    });
  }

  // src/minigames/index.js
  var MINIGAMES = {
    manualFlight: runManualFlight,
    dataCheck: runDataCheck,
    //Registrar los minijuegos de la ronda 2
    marsRoverDrive: runMarsRoverDrive,
    marsRoutePlanner: runMarsRoutePlanner,
    marsRadarScan: runMarsRadarScan
  };
  for (const type of MINIGAME_TYPES) {
    if (!MINIGAMES[type]) throw new Error(`Minigame "${type}" is listed in types.js but not registered`);
  }
  function runMinigame(type, container, config = {}) {
    const run = MINIGAMES[type];
    if (!run) throw new Error(`Unknown minigame type: "${type}"`);
    return run(container, config);
  }

  // src/services/donki.js
  var DAY_MS = 864e5;
  function toApiDate(date) {
    return date.toISOString().slice(0, 10);
  }
  function buildUrl(source, start, end) {
    const url = new URL(source.baseUrl);
    for (const [key, value] of Object.entries(source.params)) url.searchParams.set(key, value);
    url.searchParams.set(source.dateParams.start, toApiDate(start));
    url.searchParams.set(source.dateParams.end, toApiDate(end));
    return url.toString();
  }
  function normalizeEvent(raw) {
    if (!raw || typeof raw !== "object") return null;
    const id = raw.sepID ?? raw.id;
    if (typeof id !== "string" || id === "") return null;
    const timeText = raw.eventTime ?? raw.event_time;
    const parsed = timeText ? new Date(timeText) : null;
    const time = parsed && !Number.isNaN(parsed.getTime()) ? parsed : null;
    const names = (list, pick) => (Array.isArray(list) ? list : []).map((item) => typeof item === "string" ? item : item?.[pick]).filter((value) => typeof value === "string" && value !== "");
    return {
      id,
      time,
      instruments: names(raw.instruments, "displayName"),
      linkedEvents: names(raw.linkedEvents, "activityID")
    };
  }
  function normalizeResponse(json) {
    if (!Array.isArray(json)) throw new Error("Unexpected DONKI response: expected a list");
    return json.map(normalizeEvent).filter(Boolean).sort((a, b) => (b.time?.getTime() ?? 0) - (a.time?.getTime() ?? 0));
  }
  async function fetchJson(url, { fetchImpl, timeoutMs }) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchImpl(url, { signal: controller.signal, headers: { Accept: "application/json" } });
      if (!response.ok) throw new Error(`DONKI request failed with status ${response.status}`);
      return await response.json();
    } finally {
      clearTimeout(timer);
    }
  }
  var defaultCache = {
    load(now) {
      const saved = readJson(STORAGE_KEYS.sepCache);
      if (!saved || typeof saved.savedAt !== "number" || now.getTime() - saved.savedAt > DONKI.cacheTtlMs) return null;
      try {
        const events = saved.result.events.map(normalizeEvent).filter(Boolean);
        return events.length ? { ...saved.result, events } : null;
      } catch {
        return null;
      }
    },
    save(result, now) {
      const events = result.events.map((e) => ({
        sepID: e.id,
        eventTime: e.time ? e.time.toISOString() : null,
        instruments: e.instruments,
        linkedEvents: e.linkedEvents
      }));
      writeJson(STORAGE_KEYS.sepCache, { savedAt: now.getTime(), result: { ...result, events } });
    }
  };
  async function getLatestSepEvents(options = {}) {
    const {
      fetchImpl = globalThis.fetch?.bind(globalThis),
      now = /* @__PURE__ */ new Date(),
      sources = DONKI.sources,
      lookbackDays = DONKI.lookbackDays,
      timeoutMs = DONKI.timeoutMs,
      cache = defaultCache
    } = options;
    const cached = cache.load(now);
    if (cached) return { ...cached, status: "cached" };
    if (!fetchImpl) return { status: "unavailable", events: [], windowDays: null, sourceId: null };
    for (const source of sources) {
      try {
        for (const days of lookbackDays) {
          const start = new Date(now.getTime() - days * DAY_MS);
          const json = await fetchJson(buildUrl(source, start, now), { fetchImpl, timeoutMs });
          const events = normalizeResponse(json);
          if (events.length > 0) {
            const result = { status: "live", events, windowDays: days, sourceId: source.id };
            cache.save(result, now);
            return result;
          }
        }
        return { status: "live", events: [], windowDays: lookbackDays[lookbackDays.length - 1], sourceId: source.id };
      } catch {
      }
    }
    return { status: "unavailable", events: [], windowDays: null, sourceId: null };
  }
  function summarizeStorm(result) {
    const latest = result.events[0] ?? null;
    let level = (
      /** @type {StormLevel} */
      "medium"
    );
    if (latest) {
      const linked = latest.linkedEvents.length;
      level = linked >= 2 ? "strong" : linked === 1 ? "medium" : "mild";
    }
    return { latest, count: result.events.length, windowDays: result.windowDays, level, hasLiveData: latest !== null };
  }

  // src/ui/alert.js
  function setAlert(on) {
    document.body.classList.toggle("is-alert", on);
  }

  // src/ui/effects.js
  function renderEffectChips(applied) {
    const chips = RESOURCE_KEYS.filter((key) => applied[key] !== 0).map(
      (key) => el(
        "li",
        { class: `chip ${applied[key] > 0 ? "up" : "down"}` },
        `${RESOURCES.labels[key]} `,
        el("b", {}, formatPercent(applied[key]))
      )
    );
    return el("ul", { class: "chips", "aria-label": "Changes to your resources" }, chips.length ? chips : el("li", { class: "chip" }, "No changes"));
  }

  // src/ui/choice-screen.js
  function askChoice({ container, title, prompt, options }) {
    return new Promise((resolve) => {
      const choose = (id) => {
        document.removeEventListener("keydown", onKey);
        sound.choose();
        resolve(id);
      };
      const onKey = (event) => {
        if (event.ctrlKey || event.metaKey || event.altKey) return;
        const option = options[Number(event.key) - 1];
        if (option) choose(option.id);
      };
      const card = el(
        "div",
        { class: "letter panel-choice" },
        el("h2", { class: "letter-title", tabindex: "-1" }, title),
        el("p", { class: "choice-prompt" }, prompt),
        el(
          "ul",
          { class: "choices" },
          options.map(
            (option, i) => el(
              "li",
              {},
              el(
                "button",
                { type: "button", class: "choice", on: { click: () => choose(option.id) } },
                el("span", { class: "choice-key", "aria-hidden": "true" }, String(i + 1)),
                el("span", { class: "choice-text" }, option.label)
              )
            )
          )
        )
      );
      mount(container, card);
      focusTitle(card);
      document.addEventListener("keydown", onKey);
    });
  }

  // src/ui/letter.js
  var activeLetter = null;
  function arrowIcon() {
    const rects = [[5, 0, 1, 9], [6, 1, 1, 7], [7, 2, 1, 5], [8, 3, 1, 3], [9, 4, 1, 1], [0, 3, 5, 3]];
    return svg(
      "svg",
      { viewBox: "0 0 10 9", fill: "currentColor", "shape-rendering": "crispEdges", "aria-hidden": "true" },
      ...rects.map(([x, y, width, height]) => svg("rect", { x, y, width, height }))
    );
  }
  function closeLetter() {
    activeLetter?.dispose();
    activeLetter = null;
  }
  function openLetter({ container, pages, speaker, finalLabel = "", skippable = false, onShow }) {
    closeLetter();
    return new Promise((resolve) => {
      const last = pages.length - 1;
      const instant = prefersReducedMotion();
      let index = 0;
      let typing = false;
      let typedLength = 0;
      let timer = null;
      const live = el("p", { class: "sr", "aria-live": "polite" });
      const extraLive = el("p", { class: "sr", "aria-live": "polite" });
      const textEl = el("p", { class: "letter-text", "aria-hidden": "true" });
      const notesEl = el("div", { class: "letter-notes", "aria-hidden": "true" });
      const extraEl = el("div", { class: "letter-extra" });
      const labelEl = el("span", { class: "label" });
      const nextButton = el("button", { type: "button", class: "letter-next" }, labelEl, arrowIcon());
      const dots = pages.map(() => el("span", { class: "dot" }));
      const skipButton = skippable ? el("button", { type: "button", class: "letter-skip", "aria-label": "Skip to the last page" }, "\xD7") : null;
      const root = el(
        "div",
        { class: "letter", role: "dialog", "aria-label": speaker ?? "Message" },
        speaker ? el("span", { class: "letter-speaker" }, speaker) : null,
        skipButton,
        live,
        textEl,
        notesEl,
        extraEl,
        extraLive,
        el("div", { class: "letter-pager", "aria-hidden": "true" }, dots),
        nextButton
      );
      mount(container, root);
      const paintText = (count) => {
        const full = pages[index].text;
        textEl.replaceChildren(el("span", {}, full.slice(0, count)), el("span", { class: "hidden-text" }, full.slice(count)));
      };
      const finishTyping = () => {
        clearTimeout(timer);
        typing = false;
        paintText(pages[index].text.length);
        notesEl.removeAttribute("data-hidden");
        extraEl.removeAttribute("data-hidden");
        const extraText = extraEl.textContent?.trim();
        if (extraText) extraLive.textContent = extraText;
      };
      const typeNext = () => {
        const text = pages[index].text;
        if (typedLength >= text.length) {
          finishTyping();
          return;
        }
        typedLength += 1;
        paintText(typedLength);
        const char = text[typedLength - 1];
        if (char !== " " && typedLength % 3 === 0) sound.tick();
        const pause = ".!?".includes(char) ? 220 : char === "," ? 100 : 0;
        timer = setTimeout(typeNext, TIMING.typeMsPerChar + pause);
      };
      const showPage = () => {
        const page = pages[index];
        const notes = page.notes ?? [];
        dots.forEach((dot, i) => dot.classList.toggle("active", i === index));
        notesEl.replaceChildren(
          ...notes.length ? [
            el("p", { class: "notes-title" }, page.notesTitle ?? "Quick science"),
            ...notes.map((n) => el("p", {}, n.term ? el("b", {}, `${n.term}: `) : null, n.text))
          ] : []
        );
        notesEl.style.display = notes.length ? "" : "none";
        notesEl.setAttribute("data-hidden", "");
        extraEl.replaceChildren(...page.extra ? [page.extra()] : []);
        extraEl.setAttribute("data-hidden", "");
        extraLive.textContent = "";
        live.textContent = `Page ${index + 1} of ${pages.length}. ${page.text}${notes.map((n) => ` ${page.notesTitle ?? "Quick science"}. ${n.term ? `${n.term}: ` : ""}${n.text}`).join("")}`;
        labelEl.textContent = index === last ? finalLabel : "";
        nextButton.setAttribute("aria-label", index === last ? finalLabel || "Continue" : "Next page");
        if (skipButton) skipButton.style.display = index === last ? "none" : "";
        typedLength = 0;
        onShow?.(index, pages.length);
        if (instant) {
          finishTyping();
          return;
        }
        typing = true;
        paintText(0);
        timer = setTimeout(typeNext, 250);
      };
      const advance = () => {
        if (typing) {
          finishTyping();
          return;
        }
        sound.page();
        if (index < last) {
          index += 1;
          showPage();
          return;
        }
        closeLetter();
        resolve();
      };
      const skipToEnd = () => {
        sound.page();
        clearTimeout(timer);
        typing = false;
        index = last;
        showPage();
        finishTyping();
      };
      const onKey = (event) => {
        if (event.ctrlKey || event.metaKey || event.altKey) return;
        if (/^(BUTTON|A|INPUT)$/.test(event.target?.tagName ?? "")) return;
        if (["Enter", " ", "ArrowRight"].includes(event.key)) {
          event.preventDefault();
          advance();
        }
      };
      nextButton.addEventListener("click", advance);
      skipButton?.addEventListener("click", skipToEnd);
      document.addEventListener("keydown", onKey);
      activeLetter = { dispose() {
        clearTimeout(timer);
        document.removeEventListener("keydown", onKey);
      } };
      showPage();
      nextButton.focus({ preventScroll: true });
    });
  }

  // src/game/live-data.js
  function describeWindow(days) {
    if (days === 30) return "last 30 days";
    if (days === 365) return "last year";
    if (days === 1825) return "last 5 years";
    return days ? `last ${days} days` : "recent years";
  }
  var LEVEL_NAMES2 = { mild: "mild", medium: "medium", strong: "strong" };
  var plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;
  function buildLiveDataPage(summary) {
    const base = "Mission Control: this is not just a game. Space weather scientists track storms like this one every day, and NASA keeps a public log of them.";
    if (summary?.hasLiveData && summary.latest) {
      const { latest } = summary;
      const date = latest.time ? latest.time.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" }) : "a date we could not read";
      const instrument = latest.instruments[0] ? `, spotted by ${latest.instruments[0]}` : "";
      const linked = latest.linkedEvents.length;
      return {
        text: base,
        notesTitle: "Real NASA data",
        notes: [
          {
            term: "Latest particle storm in the log",
            text: `${date}${instrument}. It was linked to ${plural(linked, "solar eruption")}. NASA logged ${plural(summary.count, "particle storm")} in the ${describeWindow(summary.windowDays)}.`
          },
          {
            term: "Storm strength in this game",
            text: `${LEVEL_NAMES2[summary.level]}, based on how many eruptions were linked to that real storm.`
          }
        ]
      };
    }
    const reason = summary && summary.windowDays ? `NASA's log shows no particle storms in the ${describeWindow(summary.windowDays)}` : "We couldn't reach NASA's space weather log right now";
    return {
      text: base,
      notesTitle: "Real NASA data",
      notes: [{ term: "NASA log", text: `${reason}, so we are using a typical storm strength: medium.` }]
    };
  }

  // src/game/round-flow.js
  var UNAVAILABLE = summarizeStorm({ status: "unavailable", events: [], windowDays: null, sourceId: null });
  async function waitForStorm(getStormSummary) {
    return Promise.race([getStormSummary(), sleep(TIMING.liveDataWaitMs).then(() => UNAVAILABLE)]);
  }
  async function playRound({ round, state, ui, getStormSummary }) {
    const { stage: stage2, hud: hud2, astronaut: astronaut2 } = ui;
    hud2.renderRound(round.number, GAME.totalRounds);
    hud2.renderResources(state.resources);
    setAlert(round.alert);
    if (round.alert) sound.alarm();
    const storm = round.report.liveData ? await waitForStorm(getStormSummary) : null;
    const pages = [
      ...round.report.pages,
      ...round.report.liveData ? [buildLiveDataPage(storm)] : [],
      ...round.decision.pages
    ];
    await openLetter({ container: stage2, pages, speaker: round.speaker, finalLabel: "Decide" });
    const optionId = await askChoice({
      container: stage2,
      title: round.decision.title,
      prompt: round.decision.prompt,
      options: round.decision.options
    });
    const option = round.decision.options.find((o) => o.id === optionId);
    await openLetter({ container: stage2, pages: [{ text: option.minigame.intro }], speaker: round.speaker, finalLabel: "Start" });
    const { result } = await runMinigame(option.minigame.type, stage2, {
      ...option.minigame.config,
      level: storm?.level ?? "medium"
    });
    const outcomeId = option.outcomes[result] ?? Object.values(option.outcomes)[0];
    const outcome = round.outcomes[outcomeId];
    const { state: nextState, applied } = recordOutcome(
      state,
      { roundId: round.id, choiceId: option.id, result, outcomeId },
      outcome.effects
    );
    setAlert(false);
    hud2.renderResources(nextState.resources);
    if (outcome.tone === "bad") {
      sound.lose();
      astronaut2.react("hit");
    } else {
      sound.calm();
      astronaut2.react("happy");
    }
    await openLetter({
      container: stage2,
      speaker: round.speaker,
      finalLabel: "Continue",
      pages: [{
        text: outcome.text,
        extra: () => renderEffectChips(applied),
        notesTitle: round.fact.title,
        notes: [{ text: round.fact.text }]
      }]
    });
    return { state: nextState, outcomeId };
  }

  // src/ui/astronaut.js
  function createAstronaut(node) {
    return {
      /** @param {'happy'|'hit'} mood */
      react(mood) {
        if (!node) return;
        node.classList.remove("is-happy", "is-hit");
        void node.offsetWidth;
        node.classList.add(mood === "happy" ? "is-happy" : "is-hit");
      }
    };
  }

  // src/ui/end-screen.js
  function showEndScreen({ container, title, paragraphs, actions }) {
    const buttons = actions.map(({ label, onClick, href, secondary }) => {
      const className = `letter-button${secondary ? " secondary" : ""}`;
      return href ? el("a", { class: className, href }, label) : el("button", { type: "button", class: className, on: { click: onClick } }, label);
    });
    const card = el(
      "div",
      { class: "letter panel-end" },
      el("h2", { class: "letter-title", tabindex: "-1" }, title),
      paragraphs.map((text) => el("p", { class: "end-text" }, text)),
      el("div", { class: "actions" }, buttons)
    );
    mount(container, card);
    focusTitle(card);
  }

  // src/ui/hud.js
  function createHud(root) {
    const meters = Object.fromEntries(
      RESOURCE_KEYS.map((key) => [key, root.querySelector(`[data-resource="${key}"]`)])
    );
    const roundLabel = root.querySelector("[data-round-label]");
    const progress = root.querySelector("[data-round-progress]");
    return {
      /** @param {import('../core/resources.js').Resources} resources */
      renderResources(resources) {
        for (const key of RESOURCE_KEYS) {
          const meter = meters[key];
          const value = resources[key];
          meter.querySelector(".value").textContent = `${value}%`;
          meter.querySelector(".fill").style.width = `${value}%`;
          meter.querySelector('[role="progressbar"]').setAttribute("aria-valuenow", String(value));
          meter.classList.toggle("is-low", value <= RESOURCES.lowThreshold);
        }
      },
      /** @param {number} round @param {number} total */
      renderRound(round, total) {
        roundLabel.textContent = `Round ${round} of ${total}`;
        progress.style.width = `${(round - 1) / total * 100}%`;
      }
    };
  }

  // src/ui/sound-toggle.js
  function initSoundToggle(button) {
    const paint = () => {
      button.textContent = `Sound: ${sound.isMuted() ? "off" : "on"}`;
      button.setAttribute("aria-pressed", String(!sound.isMuted()));
    };
    button.addEventListener("click", () => {
      sound.toggle();
      paint();
    });
    paint();
  }

  // src/pages/game-page.js
  var stage = document.getElementById("stage");
  var hud = createHud(document.querySelector(".hud"));
  var astronaut = createAstronaut(document.getElementById("astronaut"));
  initSoundToggle(document.getElementById("sound-toggle"));
  var stormPromise = getLatestSepEvents().then(summarizeStorm).catch(() => summarizeStorm({ status: "unavailable", events: [], windowDays: null, sourceId: null }));
  function finishScreen({ title, paragraphs, retryLabel }) {
    setAlert(false);
    showEndScreen({
      container: stage,
      title,
      paragraphs,
      actions: [
        { label: retryLabel, onClick: () => runGame() },
        { label: "Back to start", href: PAGES.start, secondary: true }
      ]
    });
  }
  async function runGame() {
    let state = createGameState();
    hud.renderResources(state.resources);
    for (const round of ROUNDS) {
      ({ state } = await playRound({ round, state, ui: { stage, hud, astronaut }, getStormSummary: () => stormPromise }));
      const depleted = findDepleted(state.resources);
      if (depleted) {
        finishScreen({
          title: "Mission failed",
          paragraphs: [GAME_OVER_TEXT[depleted], "Every decision has a cost. Try again and choose carefully!"],
          retryLabel: "Try again"
        });
        return;
      }
    }
    const finished = ROUNDS.length >= GAME.totalRounds;
    finishScreen({
      title: finished ? "Mission complete!" : `Round ${ROUNDS.length} complete!`,
      paragraphs: finished ? ["You made it to Mars. Thank you for playing!"] : [`Round ${ROUNDS.length + 1} of ${GAME.totalRounds} is still being built. Thank you for playing, ${GAME.playerName}!`],
      retryLabel: "Play again"
    });
  }
  runGame();
})();
//# sourceMappingURL=game-page.js.map
