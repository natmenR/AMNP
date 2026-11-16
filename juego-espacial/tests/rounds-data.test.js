import assert from 'node:assert/strict';
import { test } from 'node:test';
import { RESOURCE_KEYS } from '../src/core/resources.js';
import { ROUNDS } from '../src/data/rounds/index.js';
import { MINIGAME_TYPES } from '../src/minigames/types.js';

for (const round of ROUNDS) {
  test(`${round.id}: la estructura de datos es válida`, () => {
    assert.ok(round.report.pages.length > 0, 'tiene páginas de reporte');
    assert.ok(round.decision.pages.length > 0, 'tiene historia de decisión');
    assert.ok(round.decision.options.length >= 2, 'tiene al menos 2 opciones');

    for (const option of round.decision.options) {
      assert.ok(MINIGAME_TYPES.includes(option.minigame.type), `minijuego conocido: ${option.minigame.type}`);
      assert.ok(option.minigame.intro.length > 0);
      assert.ok(option.outcomes.win, `la opción ${option.id} define el resultado "win"`);
      for (const outcomeId of Object.values(option.outcomes)) {
        assert.ok(round.outcomes[outcomeId], `existe el resultado ${outcomeId}`);
      }
    }
    for (const [id, outcome] of Object.entries(round.outcomes)) {
      assert.ok(['good', 'mixed', 'bad'].includes(outcome.tone), `${id} tiene un tono válido`);
      for (const key of Object.keys(outcome.effects)) assert.ok(RESOURCE_KEYS.includes(key), `${id}: recurso desconocido ${key}`);
    }
  });
}

test('los efectos de la ronda 1 coinciden con el guion', () => {
  const { outcomes } = ROUNDS[0];
  assert.deepEqual(outcomes['leave-win'].effects, { lifeSupport: -15, energy: -25, shielding: 5 });
  assert.deepEqual(outcomes['leave-lose'].effects, { lifeSupport: -20, energy: -30, shielding: -10 });
  assert.deepEqual(outcomes['stay-win'].effects, { lifeSupport: 10, shielding: 5, energy: -5 });
});

test('los números de ronda son consecutivos', () => {
  ROUNDS.forEach((round, i) => assert.equal(round.number, i + 1));
});
