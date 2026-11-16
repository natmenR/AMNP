import { runDataCheck } from './data-check.js';
import { runManualFlight } from './flight.js';
<<<<<<< HEAD
import { runShieldZap } from './shield-zap.js';
import { runRocketBoost } from './rocket-boost.js';
=======
import { runOfflineKit, runHabitatDrill } from './solar-conjunction.js';
>>>>>>> d94da9b (Agrego ronda 2 de conjuncion solar)
import { MINIGAME_TYPES } from './types.js';

const MINIGAMES = {
  manualFlight: runManualFlight,
  dataCheck: runDataCheck,
<<<<<<< HEAD
  shieldZap: runShieldZap,
  rocketBoost: runRocketBoost,
=======
  offlineKit: runOfflineKit,
  habitatDrill: runHabitatDrill,
>>>>>>> d94da9b (Agrego ronda 2 de conjuncion solar)
};

for (const type of MINIGAME_TYPES) {
  if (!MINIGAMES[type]) throw new Error('Minigame not registered: ' + type);
}

export function runMinigame(type, container, config = {}) {
  const run = MINIGAMES[type];
  if (!run) throw new Error('Unknown minigame: ' + type);
  return run(container, config);
}
