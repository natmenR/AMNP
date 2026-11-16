/**
 * Lógica pura de los recursos de la nave. No toca el DOM, así se puede probar fácil.
 * @typedef {'energy'|'lifeSupport'|'shielding'} ResourceKey
 * @typedef {Record<ResourceKey, number>} Resources
 * @typedef {Partial<Record<ResourceKey, number>>} Effects
 */

export const RESOURCE_KEYS = /** @type {const} */ (['energy', 'lifeSupport', 'shielding']);

/** @param {number} value @param {number} max */
export function clamp(value, max) {
  return Math.max(0, Math.min(max, value));
}

/** @param {Resources} start @returns {Resources} */
export function createResources(start) {
  return { energy: start.energy, lifeSupport: start.lifeSupport, shielding: start.shielding };
}

/**
 * Aplica efectos (en puntos porcentuales) sin modificar el objeto original.
 * @param {Resources} resources
 * @param {Effects} effects
 * @param {number} max
 * @returns {{ resources: Resources, applied: Effects }} applied = cambio real (ya recortado a 0–max)
 */
export function applyEffects(resources, effects, max) {
  const next = { ...resources };
  /** @type {Effects} */
  const applied = {};
  for (const key of RESOURCE_KEYS) {
    const change = effects[key] ?? 0;
    next[key] = clamp(resources[key] + change, max);
    applied[key] = next[key] - resources[key];
  }
  return { resources: next, applied };
}

/** @param {Resources} resources @returns {ResourceKey|null} primer recurso agotado */
export function findDepleted(resources) {
  return RESOURCE_KEYS.find((key) => resources[key] <= 0) ?? null;
}

/** @param {number} delta @returns {string} p. ej. "+5%" o "−15%" */
export function formatPercent(delta) {
  return delta > 0 ? `+${delta}%` : `\u2212${Math.abs(delta)}%`;
}
