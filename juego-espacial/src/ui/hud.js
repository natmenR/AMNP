import { RESOURCES } from '../config.js';
import { RESOURCE_KEYS } from '../core/resources.js';

/**
 * Panel superior: ronda actual, progreso y barras de recursos.
 * El HTML ya existe en game.html; aquí solo se actualiza.
 * @param {ParentNode} root
 */
export function createHud(root) {
  const meters = Object.fromEntries(
    RESOURCE_KEYS.map((key) => [key, root.querySelector(`[data-resource="${key}"]`)]),
  );
  const roundLabel = root.querySelector('[data-round-label]');
  const progress = root.querySelector('[data-round-progress]');

  return {
    /** @param {import('../core/resources.js').Resources} resources */
    renderResources(resources) {
      for (const key of RESOURCE_KEYS) {
        const meter = meters[key];
        const value = resources[key];
        meter.querySelector('.value').textContent = `${value}%`;
        meter.querySelector('.fill').style.width = `${value}%`;
        meter.querySelector('[role="progressbar"]').setAttribute('aria-valuenow', String(value));
        meter.classList.toggle('is-low', value <= RESOURCES.lowThreshold);
      }
    },
    /** @param {number} round @param {number} total */
    renderRound(round, total) {
      roundLabel.textContent = `Round ${round} of ${total}`;
      progress.style.width = `${((round - 1) / total) * 100}%`;
    },
  };
}
