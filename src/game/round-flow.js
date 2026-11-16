/**
 * Flujo de UNA ronda (una misión):
 *   reporte + historia → decisión → minijuego → resumen con efectos.
 * Se escribe como una secuencia lineal con async/await: cada pantalla devuelve una promesa
 * que se cumple cuando el jugador termina con ella.
 */
import { GAME, TIMING } from '../config.js';
import { sound } from '../audio/sound.js';
import { recordOutcome } from '../core/game-state.js';
import { runMinigame } from '../minigames/index.js';
import { summarizeStorm } from '../services/donki.js';
import { setAlert } from '../ui/alert.js';
import { sleep } from '../ui/dom.js';
import { renderEffectChips } from '../ui/effects.js';
import { askChoice } from '../ui/choice-screen.js';
import { openLetter } from '../ui/letter.js';
import { buildLiveDataPage } from './live-data.js';

const UNAVAILABLE = summarizeStorm({ status: 'unavailable', events: [], windowDays: null, sourceId: null });

/** Espera el resumen de la API, pero sin hacer esperar al jugador más de unos segundos. */
async function waitForStorm(getStormSummary) {
  return Promise.race([getStormSummary(), sleep(TIMING.liveDataWaitMs).then(() => UNAVAILABLE)]);
}

/**
 * @param {object} deps
 * @param {import('../data/rounds/round-01.js').Round} deps.round
 * @param {import('../core/game-state.js').GameState} deps.state
 * @param {{ stage: HTMLElement, hud: ReturnType<import('../ui/hud.js').createHud>, astronaut: ReturnType<import('../ui/astronaut.js').createAstronaut> }} deps.ui
 * @param {() => Promise<ReturnType<typeof summarizeStorm>>} deps.getStormSummary
 * @returns {Promise<{ state: import('../core/game-state.js').GameState, outcomeId: string }>}
 */
export async function playRound({ round, state, ui, getStormSummary }) {
  const { stage, hud, astronaut } = ui;
  hud.renderRound(round.number, GAME.totalRounds);
  hud.renderResources(state.resources);

  setAlert(round.alert);
  if (round.alert) sound.alarm();

  // 1 y 2. Reporte + historia (una sola carta con todas las páginas)
  const storm = round.report.liveData ? await waitForStorm(getStormSummary) : null;
  const pages = [
    ...round.report.pages,
    ...(round.report.liveData ? [buildLiveDataPage(storm)] : []),
    ...round.decision.pages,
  ];
  await openLetter({ container: stage, pages, speaker: round.speaker, finalLabel: 'Decide' });

  // Decisión
  const optionId = await askChoice({
    container: stage,
    title: round.decision.title,
    prompt: round.decision.prompt,
    options: round.decision.options,
  });
  const option = round.decision.options.find((o) => o.id === optionId);

  // 3. Minijuego
  await openLetter({ container: stage, pages: [{ text: option.minigame.intro }], speaker: round.speaker, finalLabel: 'Start' });
  const { result } = await runMinigame(option.minigame.type, stage, {
    ...option.minigame.config,
    level: storm?.level ?? 'medium',
  });

  // 4. Resumen de la ronda
  const outcomeId = option.outcomes[result] ?? Object.values(option.outcomes)[0];
  const outcome = round.outcomes[outcomeId];
  const { state: nextState, applied } = recordOutcome(
    state,
    { roundId: round.id, choiceId: option.id, result, outcomeId },
    outcome.effects,
  );

  setAlert(false);
  hud.renderResources(nextState.resources);
  if (outcome.tone === 'bad') { sound.lose(); astronaut.react('hit'); }
  else { sound.calm(); astronaut.react('happy'); }

  await openLetter({
    container: stage,
    speaker: round.speaker,
    finalLabel: 'Continue',
    pages: [{
      text: outcome.text,
      extra: () => renderEffectChips(applied),
      notesTitle: round.fact.title,
      notes: [{ text: round.fact.text }],
    }],
  });

  return { state: nextState, outcomeId };
}
