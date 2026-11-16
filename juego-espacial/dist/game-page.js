(() => {
  // src/config.js
  var GAME = Object.freeze({
    playerName: "D. Diaz",
    totalRounds: 4,
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

<<<<<<< HEAD
  // src/data/rounds/round-04.js
  var round04 = {
    id: "round-04",
    number: 4,
    title: "Return Home",
    speaker: "Ship System",
    alert: true,
=======
  // src/data/rounds/round-02.js
  var round02 = {
    id: "round-02",
    number: 2,
    title: "Solar Conjunction",
    speaker: "Ship System",
    alert: false,
>>>>>>> d94da9b (Agrego ronda 2 de conjuncion solar)
    report: {
      liveData: false,
      pages: [
        {
<<<<<<< HEAD
          text: "Mission complete on Mars! Our cargo bay is packed with red rocks and science samples, and it is time to fly home to Earth.",
          notes: [{ term: "Alert", text: "Engines ready. Set course for Earth." }]
=======
          text: "Later in the mission, your crew is working at the Mars habitat. The Sun is between Earth and Mars, and its outer atmosphere can disturb radio signals. Mission Control has paused new commands for two weeks."
>>>>>>> d94da9b (Agrego ronda 2 de conjuncion solar)
        }
      ]
    },
    decision: {
      pages: [
        {
<<<<<<< HEAD
          text: "To escape Mars, our rockets need a huge burst of power. At the same time, invisible space rays are shooting across our path, and our water tanks are the best shield we have."
        }
      ],
      title: "Ready for Blast-Off",
      prompt: "Water protects us from space rays, but heavy water tanks make the rocket harder to lift. How should we prepare the ship for the trip home?",
      options: [
        {
          id: "heavy-shield",
          label: "Keep the Heavy Water Shield: Keep all water tanks full around the cabin to block space rays, even though the extra weight uses up a lot of battery power.",
          minigame: {
            type: "shieldZap",
            intro: "Space rays are heading toward the cabin. Tap the incoming rays to block them before they hit the ship."
          },
          outcomes: { win: "shield-win", lose: "shield-lose" }
        },
        {
          id: "light-rocket",
          label: "Fly Light and Fast: Drop extra cargo and water to make the rocket super light and save battery power, leaving a thinner shield for the trip home.",
          minigame: {
            type: "rocketBoost",
            intro: "Time to launch! Hit the launch button when the power bar reaches the green zone to blast away from Mars."
          },
          outcomes: { win: "boost-win", lose: "boost-lose" }
=======
          text: "Your instruments and manuals still work. Choose how to keep the base running while Earth is quiet."
        }
      ],
      title: "Round 2",
      prompt: "How will you help the crew?",
      options: [
        {
          id: "offline-kit",
          label: "Pack an Offline Kit",
          minigame: {
            type: "offlineKit",
            intro: "You have six storage units. Save the three files the crew will need while the radio is offline."
          },
          outcomes: { win: "kit-win", lose: "kit-lose" }
        },
        {
          id: "habitat-drill",
          label: "Run the Habitat Drill",
          minigame: {
            type: "habitatDrill",
            intro: "Three alarms need your attention. Read the onboard manual and choose a safe action for each alarm."
          },
          outcomes: { win: "drill-win", lose: "drill-lose" }
>>>>>>> d94da9b (Agrego ronda 2 de conjuncion solar)
        }
      ]
    },
    outcomes: {
<<<<<<< HEAD
      "shield-win": {
        tone: "good",
        text: "Great job! The water shield blocked the space rays and kept the crew safe, though lifting all that water drained a lot of battery power.",
        effects: { energy: -20, shielding: 15 }
      },
      "shield-lose": {
        tone: "mixed",
        text: "Some space rays slipped past the shield and drained our systems, and the heavy ship used up a lot of battery power.",
        effects: { energy: -30, lifeSupport: -10, shielding: 10 }
      },
      "boost-win": {
        tone: "good",
        text: "Awesome launch! The light rocket shot toward Earth with plenty of battery left, though the thinner shield let a little space radiation through.",
        effects: { energy: -5, shielding: -10 }
      },
      "boost-lose": {
        tone: "bad",
        text: "Rough takeoff! We burned extra battery fighting Mars gravity, and our thinner shield barely held back the space rays.",
        effects: { energy: -25, lifeSupport: -15, shielding: -10 }
      }
    },
    fact: {
      title: "Space Science Note",
      text: "Water is a great shield in space because it blocks invisible rays from the Sun and deep space. Since water is very heavy, astronauts always have to balance carrying enough water for safety against saving rocket power to get home."
=======
      "kit-win": {
        tone: "good",
        text: "Your crew used the offline files to check the base. When the signal returned, you sent your mission log to Earth.",
        effects: { energy: -4 }
      },
      "kit-lose": {
        tone: "mixed",
        text: "Your kit was missing a key file. The crew used extra energy to search for a backup copy.",
        effects: { energy: -8 }
      },
      "drill-win": {
        tone: "good",
        text: "You cleared all three alarms. When the signal returned, you sent Earth a report on the repairs.",
        effects: { energy: -3 }
      },
      "drill-lose": {
        tone: "mixed",
        text: "The safety system took over after two wrong actions. The crew stayed safe, but the base used extra energy and oxygen.",
        effects: { energy: -7, lifeSupport: -5 }
      }
    },
    fact: {
      title: "Based on a true story",
      text: "During solar conjunction, NASA plans tasks in advance so its Mars rovers can keep working while new radio commands are paused."
>>>>>>> d94da9b (Agrego ronda 2 de conjuncion solar)
    }
  };

  // src/data/rounds/index.js
<<<<<<< HEAD
  var ROUNDS = [round01, round04];
=======
  var ROUNDS = [round01, round02];
>>>>>>> d94da9b (Agrego ronda 2 de conjuncion solar)

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

  // src/minigames/flight.js
  var SYSTEMS = ["Solar Panels", "Flight Computer", "Star Tracker", "Thrusters"];
  var SWITCHES = [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 0]
  ];
  var MAX_SWITCHES = 4;
  function runManualFlight(container) {
    return new Promise((resolve) => {
      const powered = [true, false, true, false];
      let remaining = MAX_SWITCHES;
      let ended = false;
      const meters = SYSTEMS.map(() => el("p", { class: "dir-label" }));
      const counter = el("p", { class: "mg-counter" });
      const status = el("p", { class: "mg-status", role: "status" });
      const buttons = SWITCHES.map(
        ([first, second]) => el(
          "button",
          {
            type: "button",
            class: "mg-button",
            on: { click: () => flip(first, second) }
          },
          `${SYSTEMS[first]} / ${SYSTEMS[second]}`
        )
      );
      const root = el(
        "div",
        { class: "minigame flight" },
        el("h2", { class: "mg-title", tabindex: "-1" }, "Power Grid"),
        el(
          "p",
          { class: "mg-help" },
          "Restore power to all four systems. Each switch flips both systems on its label: ON becomes OFF, and OFF becomes ON. You have four moves."
        ),
        el(
          "div",
          { class: "card-row" },
          meters.map((meter) => el("div", { class: "panel" }, meter))
        ),
        el("div", { class: "mg-controls" }, buttons),
        counter,
        status
      );
      function render() {
        meters.forEach((meter, index) => {
          const on = powered[index];
          meter.textContent = `${SYSTEMS[index]}: ${on ? "ON" : "OFF"}`;
          meter.style.color = on ? "var(--good)" : "var(--bad)";
        });
        counter.textContent = `Moves left: ${remaining}`;
      }
      async function finish(result) {
        ended = true;
        buttons.forEach((button2) => {
          button2.disabled = true;
        });
        if (result === "win") {
          status.textContent = "Power restored. The ship fired a short thruster pulse and reset the star tracker.";
          sound.win();
        } else {
          status.textContent = "The power grid is still offline. Return to the shelter!";
          sound.lose();
        }
        await sleep(TIMING.minigameEndMs);
        resolve({ result, stats: { moves: MAX_SWITCHES - remaining } });
      }
      function flip(first, second) {
        if (ended) return;
        powered[first] = !powered[first];
        powered[second] = !powered[second];
        remaining -= 1;
        render();
        if (powered.every(Boolean)) {
          finish("win");
        } else if (remaining === 0) {
          finish("lose");
        } else {
          status.textContent = `${SYSTEMS[first]} and ${SYSTEMS[second]} changed state.`;
        }
      }
      mount(container, root);
      render();
      focusTitle(root);
    });
  }

  // src/minigames/solar-conjunction.js
  function openPuzzle(container, title, instructions) {
    const board = el("div", { class: "card-row" });
    const controls = el("div", { class: "mg-controls" });
    const status = el("p", { class: "mg-status", role: "status" });
    const root = el(
      "div",
      { class: "minigame flight" },
      el("h2", { class: "mg-title", tabindex: "-1" }, title),
      el("p", { class: "mg-help" }, instructions),
      board,
      controls,
      status
    );
    mount(container, root);
    focusTitle(root);
    return { board, controls, status };
  }
  function button(label, click) {
    return el("button", {
      class: "mg-button",
      type: "button",
      on: { click }
    }, label);
  }
  function runOfflineKit(container) {
    return new Promise((resolve) => {
      const { board, controls, status } = openPuzzle(
        container,
        "Pack an Offline Kit",
        "Fit instructions, daily checks, and a report template into six storage units."
      );
      const files = [
        ["Safety checklist", 2, true],
        ["Rover photo album", 3, false],
        ["Base manual", 2, true],
        ["Crew movie", 4, false],
        ["Mission log", 2, true]
      ];
      const packed = /* @__PURE__ */ new Set();
      let used = 0;
      status.textContent = "Storage: 0 / 6";
      files.forEach(([label, size], index) => {
        const control = button(`${label} (${size})`, () => {
          if (packed.delete(index)) {
            used -= size;
          } else if (used + size <= 6) {
            packed.add(index);
            used += size;
          } else {
            status.textContent = `That file will not fit. Storage: ${used} / 6`;
            return;
          }
          const saved = packed.has(index);
          control.setAttribute("aria-pressed", String(saved));
          control.textContent = `${saved ? "Saved: " : ""}${label} (${size})`;
          status.textContent = `Storage: ${used} / 6`;
        });
        control.setAttribute("aria-pressed", "false");
        board.append(control);
      });
      controls.append(button("Test Offline Kit", () => {
        const win = files.every((file, index) => !file[2] || packed.has(index));
        resolve({ result: win ? "win" : "lose", stats: { files: packed.size } });
      }));
    });
  }
  function runHabitatDrill(container) {
    return new Promise((resolve) => {
      const { board, controls, status } = openPuzzle(
        container,
        "Run the Habitat Drill",
        "EARTH RADIO OFFLINE. Read the onboard manual and respond to each alarm."
      );
      const alarms = [
        ["Airflow is low.", "A blocked filter can slow the airflow.", "Replace the air filter"],
        ["The habitat is getting cold.", "The backup heater can warm the habitat.", "Start the backup heater"],
        ["The battery reserve is low.", "Keep essential systems on and pause optional work.", "Pause the science lab"]
      ];
      const panel = el("p", { class: "panel" });
      board.append(panel);
      let fixed = 0;
      let errors = 0;
      function showAlarm() {
        const [warning, clue] = alarms[fixed];
        panel.textContent = `Alarm ${fixed + 1} / ${alarms.length}: ${warning} Manual: ${clue}`;
      }
      showAlarm();
      const actions = [
        "Start the backup heater",
        "Pause the science lab",
        "Replace the air filter"
      ];
      actions.forEach((action) => {
        controls.append(button(action, () => {
          if (fixed === alarms.length || errors === 2) return;
          if (action === alarms[fixed][2]) {
            fixed += 1;
            if (fixed === alarms.length) {
              resolve({ result: "win", stats: { fixed, errors } });
              return;
            }
            showAlarm();
            status.textContent = "System restored. Check the next alarm.";
          } else {
            errors += 1;
            if (errors === 2) {
              resolve({ result: "lose", stats: { fixed, errors } });
              return;
            }
            status.textContent = "That did not clear the alarm. Read the manual and try again.";
          }
        }));
      });
    });
  }

  // src/minigames/shield-zap.js
  var ZAP_GOAL = 6;
  var GAME_DURATION = 18;
  function runShieldZap(container, _config = {}) {
    return new Promise((resolve) => {
      let zapped = 0;
      let timeLeft = GAME_DURATION;
      let ended = false;
      let spawnTimer = null;
      let countdownTimer = null;
      const status = el("p", { class: "mg-status", role: "status" });
      const zapCount = el("span", { class: "sz-count" }, `0 / ${ZAP_GOAL}`);
      const timeBadge = el("span", { class: "sz-time" }, `${timeLeft}s`);
      const field = el("div", { class: "sz-field", "aria-label": "Shield field \u2014 click the space rays!" });
      const skipButton = el("button", { type: "button", class: "mg-skip" }, "Skip (counts as a miss)");
      const root = el(
        "div",
        { class: "minigame shield-zap" },
        el("h2", { class: "mg-title", tabindex: "-1" }, "Shield Zap"),
        el("p", { class: "mg-help" }, `Space rays are coming! Click or tap each ray to zap it. Block ${ZAP_GOAL} rays before time runs out!`),
        el(
          "div",
          { class: "sz-hud" },
          el("span", {}, "Zapped: ", zapCount),
          timeBadge
        ),
        field,
        status,
        skipButton
      );
      mount(container, root);
      focusTitle(root);
      const cleanup = () => {
        clearInterval(spawnTimer);
        clearInterval(countdownTimer);
      };
      const end = async (result) => {
        if (ended) return;
        ended = true;
        cleanup();
        skipButton.disabled = true;
        field.querySelectorAll(".sz-ray").forEach((r) => r.remove());
        if (result === "win") {
          status.textContent = `Amazing! You blocked all ${ZAP_GOAL} rays! The shield held!`;
          sound.win();
        } else {
          status.textContent = "Time is up! Some rays got through.";
          sound.lose();
        }
        await sleep(TIMING.minigameEndMs);
        resolve({ result, stats: { zapped, timeLeft: Math.max(0, Math.round(timeLeft)) } });
      };
      const spawnRay = () => {
        if (ended) return;
        const fromLeft = Math.random() < 0.5;
        const topPct = 10 + Math.random() * 80;
        const ray = el("div", {
          class: `sz-ray ${fromLeft ? "from-left" : "from-right"}`,
          role: "button",
          tabindex: "0",
          "aria-label": "Space ray \u2014 click to zap!"
        }, fromLeft ? ">>>" : "<<<");
        ray.style.top = `${topPct}%`;
        const zapRay = () => {
          if (ended || ray.classList.contains("sz-zapped")) return;
          ray.classList.add("sz-zapped");
          sound.good();
          zapped += 1;
          zapCount.textContent = `${zapped} / ${ZAP_GOAL}`;
          setTimeout(() => ray.remove(), 300);
          if (zapped >= ZAP_GOAL) end("win");
        };
        ray.addEventListener("pointerdown", (e) => {
          e.preventDefault();
          zapRay();
        });
        ray.addEventListener("keydown", (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            zapRay();
          }
        });
        field.append(ray);
        setTimeout(() => {
          if (!ray.classList.contains("sz-zapped")) ray.remove();
        }, 3e3);
      };
      countdownTimer = setInterval(() => {
        if (ended) return;
        timeLeft -= 1;
        timeBadge.textContent = `${timeLeft}s`;
        if (timeLeft <= 5) timeBadge.classList.add("sz-urgent");
        if (timeLeft <= 0) end("lose");
      }, 1e3);
      spawnRay();
      spawnTimer = setInterval(spawnRay, 2e3);
      skipButton.addEventListener("click", () => end("lose"));
    });
  }

  // src/minigames/rocket-boost.js
  var HITS_NEEDED = 3;
  var MAX_MISSES = 3;
  var NEEDLE_SPEED = 65;
  function runRocketBoost(container, _config = {}) {
    return new Promise((resolve) => {
      let needlePos = 15;
      let direction = 1;
      let hits = 0;
      let misses = 0;
      let frame = 0;
      let last = performance.now();
      let ended = false;
      const ZONE_MIN = 38;
      const ZONE_MAX = 62;
      const hitStars = el("span", { class: "rb-stars" });
      const missMarks = el("span", { class: "rb-misses" });
      const feedback = el("p", { class: "mg-feedback", role: "status" }, "Press BLAST OFF when the needle is in the green zone!");
      const needle = el("div", { class: "rb-needle", "aria-hidden": "true" });
      const meter = el(
        "div",
        { class: "rb-meter", "aria-label": "Power meter", role: "img" },
        el("div", { class: "rb-zone" }),
        needle
      );
      const boostBtn = el("button", { type: "button", class: "rb-boost-btn" }, "BLAST OFF!");
      const skipButton = el("button", { type: "button", class: "mg-skip" }, "Skip (counts as a miss)");
      const renderHits = () => {
        hitStars.textContent = `Boosts: ${hits} / ${HITS_NEEDED}`;
        missMarks.textContent = `Misses: ${misses} / ${MAX_MISSES}`;
      };
      renderHits();
      const root = el(
        "div",
        { class: "minigame rocket-boost" },
        el("h2", { class: "mg-title", tabindex: "-1" }, "Rocket Boost"),
        el("p", { class: "mg-help" }, `Press BLAST OFF ${HITS_NEEDED} times when the needle lands in the green zone to blast home!`),
        el("div", { class: "rb-scoreboard" }, hitStars, missMarks),
        meter,
        boostBtn,
        feedback,
        skipButton
      );
      mount(container, root);
      focusTitle(root);
      boostBtn.focus();
      const cleanup = () => {
        cancelAnimationFrame(frame);
      };
      const end = async (result) => {
        if (ended) return;
        ended = true;
        cleanup();
        boostBtn.disabled = true;
        skipButton.disabled = true;
        if (result === "win") {
          feedback.textContent = `${HITS_NEEDED} perfect boosts! Blasting off - heading HOME!`;
          sound.win();
        } else {
          feedback.textContent = "Too many misses! The engine sputtered out.";
          sound.lose();
        }
        await sleep(TIMING.minigameEndMs);
        resolve({ result, stats: { hits, misses } });
      };
      const tryBoost = () => {
        if (ended) return;
        const inZone = needlePos >= ZONE_MIN && needlePos <= ZONE_MAX;
        if (inZone) {
          hits += 1;
          sound.good();
          needle.classList.add("rb-hit");
          setTimeout(() => needle.classList.remove("rb-hit"), 300);
          feedback.textContent = hits < HITS_NEEDED ? `Nice boost! ${HITS_NEEDED - hits} more to go!` : "";
          renderHits();
          if (hits >= HITS_NEEDED) end("win");
        } else {
          misses += 1;
          sound.bad();
          needle.classList.add("rb-miss");
          setTimeout(() => needle.classList.remove("rb-miss"), 300);
          feedback.textContent = `Miss! Try again - ${MAX_MISSES - misses} chances left.`;
          renderHits();
          if (misses >= MAX_MISSES) end("lose");
        }
      };
      const loop = (now) => {
        const dt = Math.min(0.1, (now - last) / 1e3);
        last = now;
        needlePos += direction * NEEDLE_SPEED * dt;
        if (needlePos >= 100) {
          needlePos = 100;
          direction = -1;
        }
        if (needlePos <= 0) {
          needlePos = 0;
          direction = 1;
        }
        needle.style.left = `${needlePos}%`;
        if (!ended) frame = requestAnimationFrame(loop);
      };
      boostBtn.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        tryBoost();
      });
      boostBtn.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          tryBoost();
        }
      });
      document.addEventListener("keydown", function onKey(e) {
        if (ended) {
          document.removeEventListener("keydown", onKey);
          return;
        }
        if (e.key === " " && document.activeElement !== boostBtn) {
          e.preventDefault();
          tryBoost();
        }
      });
      skipButton.addEventListener("click", () => end("lose"));
      frame = requestAnimationFrame((now) => {
        last = now;
        loop(now);
      });
    });
  }

  // src/minigames/types.js
<<<<<<< HEAD
  var MINIGAME_TYPES = Object.freeze(["manualFlight", "dataCheck", "shieldZap", "rocketBoost"]);
=======
  var MINIGAME_TYPES = Object.freeze([
    "manualFlight",
    "dataCheck",
    "offlineKit",
    "habitatDrill"
  ]);
>>>>>>> d94da9b (Agrego ronda 2 de conjuncion solar)

  // src/minigames/index.js
  var MINIGAMES = {
    manualFlight: runManualFlight,
    dataCheck: runDataCheck,
<<<<<<< HEAD
    shieldZap: runShieldZap,
    rocketBoost: runRocketBoost
=======
    offlineKit: runOfflineKit,
    habitatDrill: runHabitatDrill
>>>>>>> d94da9b (Agrego ronda 2 de conjuncion solar)
  };
  for (const type of MINIGAME_TYPES) {
    if (!MINIGAMES[type]) throw new Error("Minigame not registered: " + type);
  }
  function runMinigame(type, container, config = {}) {
    const run = MINIGAMES[type];
    if (!run) throw new Error("Unknown minigame: " + type);
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
  var LEVEL_NAMES = { mild: "mild", medium: "medium", strong: "strong" };
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
            text: `${LEVEL_NAMES[summary.level]}, based on how many eruptions were linked to that real storm.`
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
  function initSoundToggle(button2) {
    const paint = () => {
      button2.textContent = `Sound: ${sound.isMuted() ? "off" : "on"}`;
      button2.setAttribute("aria-pressed", String(!sound.isMuted()));
    };
    button2.addEventListener("click", () => {
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
    const lastRound = ROUNDS[ROUNDS.length - 1];
    const finished = lastRound.number >= GAME.totalRounds;
    finishScreen({
      title: finished ? "Mission Complete - Welcome Home!" : `Round ${ROUNDS.length} complete!`,
      paragraphs: finished ? [
        "You launched from Earth, collected Mars rocks with the rover, survived a solar storm, and blasted safely back home.",
        `You balanced power, air, and shielding like a real space explorer. Great job, ${GAME.playerName}!`
      ] : [`Round ${ROUNDS.length + 1} of ${GAME.totalRounds} is still being built. Thank you for playing, ${GAME.playerName}!`],
      retryLabel: "Play again"
    });
  }
  runGame();
})();
//# sourceMappingURL=game-page.js.map
