import { runDataCheck } from './data-check.js';
import { runManualFlight } from './flight.js';
import { runShieldZap } from './shield-zap.js';
import { runRocketBoost } from './rocket-boost.js';
import { runOfflineKit, runHabitatDrill } from './solar-conjunction.js';
import { MINIGAME_TYPES } from './types.js';

const MINIGAMES = {
  manualFlight: runManualFlight,
  dataCheck: runDataCheck,
  shieldZap: runShieldZap,
  rocketBoost: runRocketBoost,
  offlineKit: runOfflineKit,
  habitatDrill: runHabitatDrill,
};

for (const type of MINIGAME_TYPES) {
  if (!MINIGAMES[type]) throw new Error('Minigame not registered: ' + type);
}

export function runMinigame(type, container, config = {}) {
  const run = MINIGAMES[type];
  if (!run) throw new Error('Unknown minigame: ' + type);
  return run(container, config);
}