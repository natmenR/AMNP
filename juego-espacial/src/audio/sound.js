/**
 * Efectos de sonido generados con Web Audio (no hay archivos de audio).
 * Todos suenan bajito. El estado "silenciado" se guarda en localStorage.
 */
import { STORAGE_KEYS } from '../config.js';
import { readString, writeString } from '../services/storage.js';

let context = null;
let muted = readString(STORAGE_KEYS.sound) === 'off';

function getContext() {
  if (!context) {
    const AudioCtx = window.AudioContext ?? window.webkitAudioContext;
    if (!AudioCtx) return null;
    context = new AudioCtx();
  }
  if (context.state === 'suspended') context.resume();
  return context;
}

// Los navegadores bloquean el audio hasta el primer gesto del jugador.
for (const type of ['pointerdown', 'keydown']) {
  window.addEventListener(type, () => { if (context?.state === 'suspended') context.resume(); }, { passive: true });
}

/** Un tono corto con envolvente suave. */
function tone({ freq, freqEnd, dur, type = 'square', vol = 0.03, delay = 0 }) {
  if (muted) return;
  const ctx = getContext();
  if (!ctx) return;
  const t = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (freqEnd) osc.frequency.exponentialRampToValueAtTime(freqEnd, t + dur);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.linearRampToValueAtTime(vol, t + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

/** Ruido filtrado (estática, motores). */
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
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(from, t);
  filter.frequency.exponentialRampToValueAtTime(to, t + dur);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.linearRampToValueAtTime(vol, t + dur * 0.3);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  source.connect(filter).connect(gain).connect(ctx.destination);
  source.start(t);
}

export const sound = {
  init() { getContext(); },
  isMuted: () => muted,
  toggle() {
    muted = !muted;
    writeString(STORAGE_KEYS.sound, muted ? 'off' : 'on');
    if (!muted) { getContext(); this.page(); }
    return muted;
  },
  // interfaz
  tick() { tone({ freq: 520 + Math.random() * 90, dur: 0.035, type: 'triangle', vol: 0.018 }); },
  page() {
    tone({ freq: 660, dur: 0.07, type: 'triangle', vol: 0.035 });
    tone({ freq: 880, dur: 0.09, type: 'triangle', vol: 0.035, delay: 0.07 });
  },
  choose() { tone({ freq: 420, freqEnd: 300, dur: 0.08, type: 'triangle', vol: 0.04 }); },
  // escenas
  liftOff() { noise({ dur: 1.4, from: 250, to: 1800, vol: 0.06 }); tone({ freq: 80, freqEnd: 200, dur: 1.2, type: 'sine', vol: 0.05 }); },
  alarm() {
    for (let i = 0; i < 3; i += 1) {
      tone({ freq: 660, dur: 0.2, vol: 0.025, delay: i * 0.9 });
      tone({ freq: 495, dur: 0.2, vol: 0.025, delay: i * 0.9 + 0.3 });
    }
  },
  calm() {
    tone({ freq: 392, dur: 0.25, type: 'sine', vol: 0.04 });
    tone({ freq: 523, dur: 0.35, type: 'sine', vol: 0.04, delay: 0.2 });
  },
  // minijuegos
  thrust() { noise({ dur: 0.16, from: 900, to: 300, vol: 0.05 }); },
  glitch() { noise({ dur: 0.12, from: 3000, to: 1500, vol: 0.05 }); },
  warning() { tone({ freq: 740, dur: 0.12, vol: 0.03 }); tone({ freq: 740, dur: 0.12, vol: 0.03, delay: 0.2 }); },
  good() {
    tone({ freq: 523, dur: 0.12, type: 'sine', vol: 0.05 });
    tone({ freq: 784, dur: 0.18, type: 'sine', vol: 0.05, delay: 0.11 });
  },
  bad() { tone({ freq: 200, freqEnd: 130, dur: 0.3, type: 'sawtooth', vol: 0.035 }); },
  win() { [523, 659, 784, 1046].forEach((freq, i) => tone({ freq, dur: 0.22, type: 'triangle', vol: 0.05, delay: i * 0.13 })); },
  lose() { [392, 330, 262].forEach((freq, i) => tone({ freq, dur: 0.3, type: 'sawtooth', vol: 0.03, delay: i * 0.22 })); },
};
