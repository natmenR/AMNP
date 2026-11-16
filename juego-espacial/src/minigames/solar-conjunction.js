import { el, focusTitle, mount } from '../ui/dom.js';

function openPuzzle(container, title, instructions) {
  const board = el('div', { class: 'card-row' });
  const controls = el('div', { class: 'mg-controls' });
  const status = el('p', { class: 'mg-status', role: 'status' });

  const root = el(
    'div',
    { class: 'minigame flight' },
    el('h2', { class: 'mg-title', tabindex: '-1' }, title),
    el('p', { class: 'mg-help' }, instructions),
    board,
    controls,
    status,
  );

  mount(container, root);
  focusTitle(root);
  return { board, controls, status };
}

function button(label, click) {
  return el('button', {
    class: 'mg-button',
    type: 'button',
    on: { click },
  }, label);
}

export function runOfflineKit(container) {
  return new Promise((resolve) => {
    const { board, controls, status } = openPuzzle(
      container,
      'Pack an Offline Kit',
      'Fit instructions, daily checks, and a report template into six storage units.',
    );

    const files = [
      ['Safety checklist', 2, true],
      ['Rover photo album', 3, false],
      ['Base manual', 2, true],
      ['Crew movie', 4, false],
      ['Mission log', 2, true],
    ];

    const packed = new Set();
    let used = 0;
    status.textContent = 'Storage: 0 / 6';

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
        control.setAttribute('aria-pressed', String(saved));
        control.textContent = `${saved ? 'Saved: ' : ''}${label} (${size})`;
        status.textContent = `Storage: ${used} / 6`;
      });

      control.setAttribute('aria-pressed', 'false');
      board.append(control);
    });

    controls.append(button('Test Offline Kit', () => {
      const win = files.every((file, index) => !file[2] || packed.has(index));
      resolve({ result: win ? 'win' : 'lose', stats: { files: packed.size } });
    }));
  });
}

export function runHabitatDrill(container) {
  return new Promise((resolve) => {
    const { board, controls, status } = openPuzzle(
      container,
      'Run the Habitat Drill',
      'EARTH RADIO OFFLINE. Read the onboard manual and respond to each alarm.',
    );

    const alarms = [
      ['Airflow is low.', 'A blocked filter can slow the airflow.', 'Replace the air filter'],
      ['The habitat is getting cold.', 'The backup heater can warm the habitat.', 'Start the backup heater'],
      ['The battery reserve is low.', 'Keep essential systems on and pause optional work.', 'Pause the science lab'],
    ];

    const panel = el('p', { class: 'panel' });
    board.append(panel);
    let fixed = 0;
    let errors = 0;

    function showAlarm() {
      const [warning, clue] = alarms[fixed];
      panel.textContent = `Alarm ${fixed + 1} / ${alarms.length}: ${warning} Manual: ${clue}`;
    }

    showAlarm();

    const actions = [
      'Start the backup heater',
      'Pause the science lab',
      'Replace the air filter',
    ];

    actions.forEach((action) => {
      controls.append(button(action, () => {
        if (fixed === alarms.length || errors === 2) return;

        if (action === alarms[fixed][2]) {
          fixed += 1;
          if (fixed === alarms.length) {
            resolve({ result: 'win', stats: { fixed, errors } });
            return;
          }
          showAlarm();
          status.textContent = 'System restored. Check the next alarm.';
        } else {
          errors += 1;
          if (errors === 2) {
            resolve({ result: 'lose', stats: { fixed, errors } });
            return;
          }
          status.textContent = 'That did not clear the alarm. Read the manual and try again.';
        }
      }));
    });
  });
}