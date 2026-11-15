import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DIRECTIONS, createSession, generateCards, isCorrect, submitAnswer } from '../src/minigames/data-check-model.js';
import { seededRandom } from './helpers.js';

test('generateCards crea el número pedido, con al menos 3 falsas y 3 buenas', () => {
  for (let seed = 1; seed <= 200; seed += 1) {
    const cards = generateCards(8, seededRandom(seed));
    const falses = cards.filter((c) => c.isFalse).length;
    assert.equal(cards.length, 8);
    assert.ok(falses >= 3 && cards.length - falses >= 3, `semilla ${seed}: ${falses} falsas`);
  }
});

test('las lecturas buenas coinciden y las falsas apuntan al menos 90° lejos', () => {
  for (const card of generateCards(8, seededRandom(7))) {
    if (card.isFalse) {
      const diff = Math.abs(card.tracker.angle - card.backup.angle);
      assert.ok(Math.min(diff, 360 - diff) >= 90);
    } else {
      assert.equal(card.tracker.id, card.backup.id);
    }
  }
  assert.equal(DIRECTIONS.length, 8);
});

test('isCorrect: borrar una falsa y conservar una buena', () => {
  const good = { isFalse: false };
  const bad = { isFalse: true };
  assert.ok(isCorrect(good, 'keep') && isCorrect(bad, 'clear'));
  assert.ok(!isCorrect(good, 'clear') && !isCorrect(bad, 'keep'));
});

test('submitAnswer: un error repite la tarjeta y cuenta el fallo; al acertar todas termina', () => {
  const session = createSession(generateCards(4, seededRandom(3)));
  const first = session.cards[0];
  const wrong = first.isFalse ? 'keep' : 'clear';
  assert.deepEqual(submitAnswer(session, wrong), { correct: false, finished: false });
  assert.equal(session.index, 0);
  assert.equal(session.mistakes, 1);
  let result;
  while (!session.finished) {
    const card = session.cards[session.index];
    result = submitAnswer(session, card.isFalse ? 'clear' : 'keep');
    assert.ok(result.correct);
  }
  assert.ok(result.finished);
});
