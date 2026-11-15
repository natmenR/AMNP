/**
 * Modelo del minijuego "Data check" (solo lógica, sin DOM).
 *
 * Cada tarjeta compara la dirección que dice el star tracker (con ruido) contra la de los
 * sensores de respaldo. Si no coinciden, es una lectura falsa y hay que borrarla.
 *
 * @typedef {{ id: string, label: string, angle: number }} Direction
 * @typedef {{ id: number, backup: Direction, tracker: Direction, isFalse: boolean }} Card
 * @typedef {'keep'|'clear'} Answer
 */

export const DIRECTIONS = Object.freeze([
  { id: 'up', label: 'Up', angle: 0 },
  { id: 'up-right', label: 'Up-right', angle: 45 },
  { id: 'right', label: 'Right', angle: 90 },
  { id: 'down-right', label: 'Down-right', angle: 135 },
  { id: 'down', label: 'Down', angle: 180 },
  { id: 'down-left', label: 'Down-left', angle: 225 },
  { id: 'left', label: 'Left', angle: 270 },
  { id: 'up-left', label: 'Up-left', angle: 315 },
]);

function shuffle(list, rng) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Genera tarjetas con al menos 3 lecturas falsas y 3 buenas.
 * @param {number} [count] @param {() => number} [rng] @returns {Card[]}
 */
export function generateCards(count = 8, rng = Math.random) {
  const falseCount = Math.min(count - 3, Math.max(3, Math.round(count / 2 + (rng() - 0.5) * 2)));
  const flags = shuffle(Array.from({ length: count }, (_, i) => i < falseCount), rng);
  return flags.map((isFalse, id) => {
    const backupIndex = Math.floor(rng() * DIRECTIONS.length);
    // Una lectura falsa apunta al menos 90° (2 pasos) lejos del respaldo.
    const offset = isFalse ? 2 + Math.floor(rng() * 5) : 0;
    return {
      id,
      isFalse,
      backup: DIRECTIONS[backupIndex],
      tracker: DIRECTIONS[(backupIndex + offset) % DIRECTIONS.length],
    };
  });
}

/** @param {Card} card @param {Answer} answer */
export function isCorrect(card, answer) {
  return answer === (card.isFalse ? 'clear' : 'keep');
}

/** @param {Card[]} cards */
export function createSession(cards) {
  return { cards, index: 0, mistakes: 0, finished: false };
}

/** Procesa una respuesta. Si fue incorrecta, la tarjeta se repite. */
export function submitAnswer(session, answer) {
  if (session.finished) return { correct: false, finished: true };
  const correct = isCorrect(session.cards[session.index], answer);
  if (correct) {
    session.index += 1;
    if (session.index >= session.cards.length) session.finished = true;
  } else {
    session.mistakes += 1;
  }
  return { correct, finished: session.finished };
}
