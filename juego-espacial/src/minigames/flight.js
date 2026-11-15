/**
 * Minijuego "Manual flight" (vista). La lógica está en flight-model.js.
 * Controles: botones, flechas ← → o teclas A / D.
 */
import { TIMING } from '../config.js';
import { sound } from '../audio/sound.js';
import { el, focusTitle, mount, sleep } from '../ui/dom.js';
import { FLIGHT, createFlightModel, isInsideZone, pulse, step } from './flight-model.js';
import { startStatic } from './static-noise.js';

const LEVEL_NAMES = { mild: 'Mild', medium: 'Medium', strong: 'Strong' };
const STEP = 1 / 60;

/**
 * @param {HTMLElement} container
 * @param {{ level?: 'mild'|'medium'|'strong' }} [config]
 * @returns {Promise<{ result: 'win'|'lose', stats: object }>}
 */
export function runManualFlight(container, { level = 'medium' } = {}) {
  return new Promise((resolve) => {
    const model = createFlightModel(level);

    const staticCanvas = el('canvas', { class: 'static-canvas', 'aria-hidden': 'true' });
    const marker = el('img', { class: 'marker', src: 'assets/nave.png', alt: '' });
    const flash = el('div', { class: 'flash' });
    const status = el('p', { class: 'mg-status', role: 'status' });
    const makeMeter = (label, className) => {
      const fill = el('div', { class: `fill ${className}` });
      const bar = el('div', { class: 'bar', role: 'progressbar', 'aria-label': label, 'aria-valuemin': '0', 'aria-valuemax': '100' }, fill);
      return { fill, bar, row: el('div', { class: 'mg-meter' }, el('span', { class: 'mg-meter-label' }, label), bar) };
    };
    const progressMeter = makeMeter('Direction check', 'check');
    const energyMeter = makeMeter('Thruster energy', 'energy');
    const radiationMeter = makeMeter('Radiation alarm', 'radiation');

    const leftButton = el('button', { type: 'button', class: 'mg-button', 'aria-label': 'Left thruster' }, '\u25C0 Left thruster');
    const rightButton = el('button', { type: 'button', class: 'mg-button', 'aria-label': 'Right thruster' }, 'Right thruster \u25B6');
    const skipButton = el('button', { type: 'button', class: 'mg-skip' }, 'Skip (counts as a miss)');

    const title = el('h2', { class: 'mg-title', tabindex: '-1' }, 'Manual flight');
    const root = el(
      'div',
      { class: 'minigame flight' },
      title,
      el('p', { class: 'mg-help' }, 'Keep the ship straight! Push the ship into the green zone and hold it there until the direction check is complete. Every push uses Energy, and the radiation alarm keeps rising.'),
      el(
        'div',
        { class: 'star-screen' },
        staticCanvas,
        el('div', { class: 'gauge', 'aria-hidden': 'true' }, el('div', { class: 'zone' }), marker),
        flash,
        el('p', { class: 'screen-label', 'aria-hidden': 'true' }, `STAR TRACKER \u00B7 STORM: ${(LEVEL_NAMES[level] ?? 'Medium').toUpperCase()}`),
      ),
      el('div', { class: 'mg-meters' }, progressMeter.row, energyMeter.row, radiationMeter.row),
      el('div', { class: 'mg-controls' }, leftButton, rightButton),
      el('p', { class: 'mg-hint' }, 'Tip: use the \u2190 \u2192 arrow keys. Pushing too often wastes Energy.'),
      status,
      skipButton,
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
      const left = 50 + (model.pos / FLIGHT.range) * 50;
      marker.style.left = `${left}%`;
      progressMeter.fill.style.width = `${Math.min(100, model.progress)}%`;
      energyMeter.fill.style.width = `${model.energy}%`;
      radiationMeter.fill.style.width = `${Math.min(100, model.radiation)}%`;
      progressMeter.bar.setAttribute('aria-valuenow', String(Math.round(model.progress)));
      energyMeter.bar.setAttribute('aria-valuenow', String(Math.round(model.energy)));
      radiationMeter.bar.setAttribute('aria-valuenow', String(Math.round(model.radiation)));
      marker.classList.toggle('is-inside', isInsideZone(model));
    };

    const cleanup = () => {
      cancelAnimationFrame(frame);
      stopStatic();
      document.removeEventListener('keydown', onKey);
    };

    const end = async (result) => {
      if (ended) return;
      ended = true;
      cleanup();
      leftButton.disabled = true;
      rightButton.disabled = true;
      skipButton.disabled = true;
      if (result === 'win') {
        status.textContent = 'Direction checked! The ship is flying straight.';
        sound.win();
      } else {
        status.textContent = model.reason === 'energy'
          ? 'Out of Energy! The thrusters went quiet.'
          : 'The radiation alarm is too high! Back to the shelter!';
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
      if (event.key === 'ArrowLeft' || event.key === 'a' || event.key === 'A') { event.preventDefault(); doPulse(-1); }
      else if (event.key === 'ArrowRight' || event.key === 'd' || event.key === 'D') { event.preventDefault(); doPulse(1); }
    }

    const loop = (now) => {
      accumulator += Math.min(0.1, (now - last) / 1000);
      last = now;
      while (accumulator >= STEP && model.status === 'running') {
        if (step(model, STEP)) {
          sound.glitch();
          flash.classList.remove('on');
          void flash.offsetWidth;
          flash.classList.add('on');
        }
        accumulator -= STEP;
      }
      if (!warned && model.radiation >= 70) {
        warned = true;
        sound.warning();
        status.textContent = 'Warning: the radiation alarm is getting high!';
      }
      render();
      if (model.status !== 'running') { end(model.status); return; }
      frame = requestAnimationFrame(loop);
    };

    leftButton.addEventListener('pointerdown', (event) => { event.preventDefault(); doPulse(-1); });
    rightButton.addEventListener('pointerdown', (event) => { event.preventDefault(); doPulse(1); });
    // Teclado: Enter/Espacio sobre un botón enfocado (pointerdown no se dispara con el teclado)
    leftButton.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); doPulse(-1); } });
    rightButton.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); doPulse(1); } });
    skipButton.addEventListener('click', () => { model.reason = 'skipped'; end('lose'); });
    document.addEventListener('keydown', onKey);

    render();
    frame = requestAnimationFrame((now) => { last = now; loop(now); });
  });
}
