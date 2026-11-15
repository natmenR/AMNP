import { RESOURCES } from '../config.js';
import { RESOURCE_KEYS, formatPercent } from '../core/resources.js';
import { el } from './dom.js';

/**
 * Chips con los cambios reales de cada recurso (por ejemplo "Energy −25%").
 * @param {import('../core/resources.js').Effects} applied
 */
export function renderEffectChips(applied) {
  const chips = RESOURCE_KEYS.filter((key) => applied[key] !== 0).map((key) =>
    el(
      'li',
      { class: `chip ${applied[key] > 0 ? 'up' : 'down'}` },
      `${RESOURCES.labels[key]} `,
      el('b', {}, formatPercent(applied[key])),
    ),
  );
  return el('ul', { class: 'chips', 'aria-label': 'Changes to your resources' }, chips.length ? chips : el('li', { class: 'chip' }, 'No changes'));
}
