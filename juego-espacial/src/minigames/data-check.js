/**
 * Minijuego "Data check" (vista). La lógica está en data-check-model.js.
 * Compara la foto ruidosa del star tracker con los sensores de respaldo.
 */
import { TIMING } from '../config.js';
import { sound } from '../audio/sound.js';
import { el, focusTitle, mount, sleep, svg } from '../ui/dom.js';
import { createSession, generateCards, submitAnswer } from './data-check-model.js';
import { startStatic } from './static-noise.js';

const CARD_COUNT = 8;

function arrow(angle) {
  const icon = svg(
    'svg',
    { class: 'arrow', viewBox: '0 0 24 24', 'aria-hidden': 'true', 'shape-rendering': 'crispEdges' },
    svg('polygon', { points: '12,2 21,13 15,13 15,22 9,22 9,13 3,13', fill: 'currentColor' }),
  );
  icon.style.transform = `rotate(${angle}deg)`;
  return icon;
}

/**
 * @param {HTMLElement} container
 * @param {{ cards?: number }} [config]
 * @returns {Promise<{ result: 'win', stats: { mistakes: number } }>}
 */
export function runDataCheck(container, { cards = CARD_COUNT } = {}) {
  return new Promise((resolve) => {
    const session = createSession(generateCards(cards));

    const feedback = el('p', { class: 'mg-feedback', role: 'status' }, 'Look at both screens. Do the arrows point the same way?');
    const cardRow = el('div', { class: 'card-row' });
    const counter = el('span', { class: 'mg-counter' });
    const stormFill = el('div', { class: 'fill check' });
    const stormBar = el('div', { class: 'bar', role: 'progressbar', 'aria-label': 'Storm passing', 'aria-valuemin': '0', 'aria-valuemax': '100' }, stormFill);
    const lockBadge = el('span', { class: 'lock-badge' }, '\uD83D\uDD12 Thrusters: LOCKED');
    const keepButton = el('button', { type: 'button', class: 'mg-button keep' }, el('span', { class: 'key' }, '1'), ' They match \u2014 keep it');
    const clearButton = el('button', { type: 'button', class: 'mg-button clear' }, el('span', { class: 'key' }, '2'), ' They differ \u2014 clear it');

    const root = el(
      'div',
      { class: 'minigame data-check' },
      el('h2', { class: 'mg-title', tabindex: '-1' }, 'Data check'),
      el('p', { class: 'mg-help' }, 'The star tracker photos are messy because of the storm. Compare each one with the backup sensors. If they match, keep the reading. If they differ, it is a false reading: clear it!'),
      cardRow,
      el('div', { class: 'mg-controls' }, keepButton, clearButton),
      feedback,
      el('div', { class: 'mg-footer' }, counter, el('div', { class: 'mg-meter' }, el('span', { class: 'mg-meter-label' }, 'Storm passing'), stormBar), lockBadge),
    );
    mount(container, root);
    focusTitle(root);

    let stopStatic = () => {};
    let busy = false;

    const renderCard = () => {
      stopStatic();
      const card = session.cards[session.index];
      const trackerCanvas = el('canvas', { class: 'static-canvas', 'aria-hidden': 'true' });
      const panel = (caption, dir, extra, noisy) =>
        el(
          'figure',
          { class: `panel ${noisy ? 'tracker' : 'backup'}` },
          el('figcaption', {}, caption),
          el('div', { class: 'dial' }, noisy ? trackerCanvas : null, arrow(dir.angle)),
          el('p', { class: 'dir-label' }, `Points: ${dir.label}`),
          extra,
        );
      cardRow.replaceChildren(
        panel('Star tracker photo', card.tracker, null, true),
        panel('Backup sensors', card.backup, null, false),
      );
      stopStatic = startStatic(trackerCanvas, { fps: 8, width: 48, height: 48 });
      counter.textContent = `Reading ${Math.min(session.index + 1, session.cards.length)} of ${session.cards.length}`;
      const percent = (session.index / session.cards.length) * 100;
      stormFill.style.width = `${percent}%`;
      stormBar.setAttribute('aria-valuenow', String(Math.round(percent)));
    };

    const answer = async (choice) => {
      if (busy) return;
      const { correct, finished } = submitAnswer(session, choice);
      if (!correct) {
        sound.bad();
        feedback.textContent = 'Not quite. Look again: do both arrows point the same way?';
        feedback.classList.add('is-bad');
        return;
      }
      sound.good();
      feedback.classList.remove('is-bad');
      feedback.textContent = choice === 'clear' ? 'Nice! False reading cleared.' : 'Good! Those readings match, so we keep it.';
      if (!finished) { renderCard(); return; }

      busy = true;
      stopStatic();
      document.removeEventListener('keydown', onKey);
      stormFill.style.width = '100%';
      stormBar.setAttribute('aria-valuenow', '100');
      counter.textContent = 'All readings checked';
      keepButton.disabled = true;
      clearButton.disabled = true;
      feedback.textContent = 'The storm has passed and the thrusters stayed locked. Great job!';
      sound.win();
      await sleep(TIMING.minigameEndMs);
      resolve({ result: 'win', stats: { mistakes: session.mistakes } });
    };

    function onKey(event) {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.key === '1') answer('keep');
      else if (event.key === '2') answer('clear');
    }

    keepButton.addEventListener('click', () => answer('keep'));
    clearButton.addEventListener('click', () => answer('clear'));
    document.addEventListener('keydown', onKey);
    renderCard();
  });
}
