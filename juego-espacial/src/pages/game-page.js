/** Punto de entrada de game.html: arma la pantalla y recorre las rondas. */
import { GAME, PAGES } from '../config.js';
import { createGameState } from '../core/game-state.js';
import { findDepleted } from '../core/resources.js';
import { GAME_OVER_TEXT } from '../data/game-over.js';
import { ROUNDS } from '../data/rounds/index.js';
import { playRound } from '../game/round-flow.js';
import { getLatestSepEvents, summarizeStorm } from '../services/donki.js';
import { createAstronaut } from '../ui/astronaut.js';
import { setAlert } from '../ui/alert.js';
import { showEndScreen } from '../ui/end-screen.js';
import { createHud } from '../ui/hud.js';
import { initSoundToggle } from '../ui/sound-toggle.js';

const stage = document.getElementById('stage');
const hud = createHud(document.querySelector('.hud'));
const astronaut = createAstronaut(document.getElementById('astronaut'));
initSoundToggle(document.getElementById('sound-toggle'));

// Pedimos los datos de la NASA una sola vez, en cuanto carga la página (sin bloquear el juego).
const stormPromise = getLatestSepEvents()
  .then(summarizeStorm)
  .catch(() => summarizeStorm({ status: 'unavailable', events: [], windowDays: null, sourceId: null }));

function finishScreen({ title, paragraphs, retryLabel }) {
  setAlert(false);
  showEndScreen({
    container: stage,
    title,
    paragraphs,
    actions: [
      { label: retryLabel, onClick: () => runGame() },
      { label: 'Back to start', href: PAGES.start, secondary: true },
    ],
  });
}

async function runGame() {
  let state = createGameState();
  hud.renderResources(state.resources);

  for (const round of ROUNDS) {
    ({ state } = await playRound({ round, state, ui: { stage, hud, astronaut }, getStormSummary: () => stormPromise }));

    const depleted = findDepleted(state.resources);
    if (depleted) {
      finishScreen({
        title: 'Mission failed',
        paragraphs: [GAME_OVER_TEXT[depleted], 'Every decision has a cost. Try again and choose carefully!'],
        retryLabel: 'Try again',
      });
      return;
    }
  }

  const finished = ROUNDS.length >= GAME.totalRounds;
  finishScreen({
    title: finished ? 'Mission complete!' : `Round ${ROUNDS.length} complete!`,
    paragraphs: finished
      ? ['You made it to Mars. Thank you for playing!']
      : [`Round ${ROUNDS.length + 1} of ${GAME.totalRounds} is still being built. Thank you for playing, ${GAME.playerName}!`],
    retryLabel: 'Play again',
  });
}

runGame();
