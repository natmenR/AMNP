/**
 * Registro de minijuegos. Para agregar uno nuevo:
 *   1. Crea su modelo (lógica) y su vista, con la forma (container, config) => Promise<{ result, stats }>
 *   2. Regístralo aquí
 *   3. Úsalo en una ronda con  minigame: { type: 'miNombre', intro: '...' }
 */
import { runDataCheck } from './data-check.js';
import { runManualFlight } from './flight.js';
import { runShieldZap } from './shield-zap.js';
import { runRocketBoost } from './rocket-boost.js';
import { MINIGAME_TYPES } from './types.js';

const MINIGAMES = {
  manualFlight: runManualFlight,
  dataCheck: runDataCheck,
  shieldZap: runShieldZap,
  rocketBoost: runRocketBoost,
};

// Si agregas un minijuego, añade también su nombre en types.js
for (const type of MINIGAME_TYPES) {
  if (!MINIGAMES[type]) throw new Error(`Minigame "${type}" is listed in types.js but not registered`);
}

/**
 * @param {string} type
 * @param {HTMLElement} container
 * @param {object} [config]
 * @returns {Promise<{ result: 'win'|'lose', stats: object }>}
 */
export function runMinigame(type, container, config = {}) {
  const run = MINIGAMES[type];
  if (!run) throw new Error(`Unknown minigame type: "${type}"`);
  return run(container, config);
}
