import { TIMING } from '../config.js';
import { sound } from '../audio/sound.js';
import { el, focusTitle, mount, sleep } from '../ui/dom.js';

const SYSTEMS = ['Solar Panels', 'Flight Computer', 'Star Tracker', 'Thrusters'];
const SWITCHES = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 0],
];
const MAX_SWITCHES = 4;

export function runManualFlight(container) {
  return new Promise((resolve) => {
    const powered = [true, false, true, false];
    let remaining = MAX_SWITCHES;
    let ended = false;

    const meters = SYSTEMS.map(() => el('p', { class: 'dir-label' }));
    const counter = el('p', { class: 'mg-counter' });
    const status = el('p', { class: 'mg-status', role: 'status' });

    const buttons = SWITCHES.map(([first, second]) =>
      el(
        'button',
        {
          type: 'button',
          class: 'mg-button',
          on: { click: () => flip(first, second) },
        },
        `${SYSTEMS[first]} / ${SYSTEMS[second]}`,
      ),
    );

    const root = el(
      'div',
      { class: 'minigame flight' },
      el('h2', { class: 'mg-title', tabindex: '-1' }, 'Power Grid'),
      el(
        'p',
        { class: 'mg-help' },
        'Restore power to all four systems. Each switch flips both systems on its label: ON becomes OFF, and OFF becomes ON. You have four moves.',
      ),
      el(
        'div',
        { class: 'card-row' },
        meters.map((meter) => el('div', { class: 'panel' }, meter)),
      ),
      el('div', { class: 'mg-controls' }, buttons),
      counter,
      status,
    );

    function render() {
      meters.forEach((meter, index) => {
        const on = powered[index];
        meter.textContent = `${SYSTEMS[index]}: ${on ? 'ON' : 'OFF'}`;
        meter.style.color = on ? 'var(--good)' : 'var(--bad)';
      });

      counter.textContent = `Moves left: ${remaining}`;
    }

    async function finish(result) {
      ended = true;
      buttons.forEach((button) => { button.disabled = true; });

      if (result === 'win') {
        status.textContent = 'Power restored. The ship fired a short thruster pulse and reset the star tracker.';
        sound.win();
      } else {
        status.textContent = 'The power grid is still offline. Return to the shelter!';
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
        finish('win');
      } else if (remaining === 0) {
        finish('lose');
      } else {
        status.textContent = `${SYSTEMS[first]} and ${SYSTEMS[second]} changed state.`;
      }
    }

    mount(container, root);
    render();
    focusTitle(root);
  });
}