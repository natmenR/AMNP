import { el, focusTitle, mount } from './dom.js';

/**
 * Pantalla final con botones (game over, "continuará…", etc.).
 * @param {object} options
 * @param {HTMLElement} options.container
 * @param {string} options.title
 * @param {string[]} options.paragraphs
 * @param {{ label: string, onClick?: () => void, href?: string, secondary?: boolean }[]} options.actions
 */
export function showEndScreen({ container, title, paragraphs, actions }) {
  const buttons = actions.map(({ label, onClick, href, secondary }) => {
    const className = `letter-button${secondary ? ' secondary' : ''}`;
    return href
      ? el('a', { class: className, href }, label)
      : el('button', { type: 'button', class: className, on: { click: onClick } }, label);
  });
  const card = el(
    'div',
    { class: 'letter panel-end' },
    el('h2', { class: 'letter-title', tabindex: '-1' }, title),
    paragraphs.map((text) => el('p', { class: 'end-text' }, text)),
    el('div', { class: 'actions' }, buttons),
  );
  mount(container, card);
  focusTitle(card);
}
