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

  // src/data/intro.js
  function buildIntroPages(playerName) {
    return [
      { text: `Hello, ${playerName}. Welcome aboard Ares, a spaceship on its way to Mars.` },
      { text: "Your science mission: find out whether life could exist on the red planet by collecting data about its environment." },
      {
        text: "To get there, you will have to share your energy wisely, take care of your life support and protect the ship from radiation.",
        notes: [
          { term: "Life support", text: "the machines that give the crew air to breathe and clean water." },
          { term: "Radiation", text: "invisible energy that can hurt people and damage electronics." }
        ]
      },
      { text: "The challenge: every decision counts. Survive 300 days in space to complete the mission." }
    ];
  }

  // src/ui/alert.js
  function setAlert(on) {
    document.body.classList.toggle("is-alert", on);
  }
  function isAlertOn() {
    return document.body.classList.contains("is-alert");
  }

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
  var prefersReducedMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

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

  // src/pages/start-page.js
  var playButton = document.getElementById("play-button");
  var intro = document.getElementById("intro");
  var started = false;
  initSoundToggle(document.getElementById("sound-toggle"));
  async function showIntro() {
    document.body.classList.add("is-cruising");
    intro.hidden = false;
    await openLetter({
      container: intro,
      pages: buildIntroPages(GAME.playerName),
      skippable: true,
      finalLabel: "Respond",
      onShow(index, total) {
        if (index === total - 1 && !isAlertOn()) {
          setAlert(true);
          sound.alarm();
        }
      }
    });
    document.body.classList.add("is-leaving");
    setTimeout(() => {
      window.location.href = PAGES.game;
    }, TIMING.fadeOutMs);
  }
  function start() {
    if (started) return;
    started = true;
    sound.init();
    sound.liftOff();
    document.body.classList.add("is-lifting-off");
    setTimeout(showIntro, TIMING.liftOffMs);
  }
  playButton.addEventListener("click", start);
  document.addEventListener("keydown", (event) => {
    if ((event.key === "Enter" || event.key === " ") && !started && document.activeElement?.id !== "sound-toggle") {
      event.preventDefault();
      start();
    }
  });
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) window.location.reload();
  });
})();
//# sourceMappingURL=start-page.js.map
