import { sound } from '../audio/sound.js';
import { el, focusTitle, mount } from './dom.js';

/**
 * Pantalla de decisión: muestra las opciones y devuelve la que elija el jugador.
 * Atajos de teclado: 1, 2, 3…
 *
 * @param {object} options
 * @param {HTMLElement} options.container
 * @param {string} options.title
 * @param {string} options.prompt
 * @param {{ id: string, label: string }[]} options.options
 * @returns {Promise<string>} id de la opción elegida
 */
export function askChoice({ container, title, prompt, options }) {
  return new Promise((resolve) => {
    const choose = (id) => {
      document.removeEventListener('keydown', onKey);
      sound.choose();
      resolve(id);
    };
    const onKey = (event) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      const option = options[Number(event.key) - 1];
      if (option) choose(option.id);
    };

    const card = el(
      'div',
      { class: 'letter panel-choice' },
      el('h2', { class: 'letter-title', tabindex: '-1' }, title),
      el('p', { class: 'choice-prompt' }, prompt),
      el(
        'ul',
        { class: 'choices' },
        options.map((option, i) =>
          el(
            'li',
            {},
            el(
              'button',
              { type: 'button', class: 'choice', on: { click: () => choose(option.id) } },
              el('span', { class: 'choice-key', 'aria-hidden': 'true' }, String(i + 1)),
              el('span', { class: 'choice-text' }, option.label),
            ),
          ),
        ),
      ),
    );
    mount(container, card);
    focusTitle(card);
    document.addEventListener('keydown', onKey);
  });
}
