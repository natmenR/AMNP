import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GAME } from '../src/config.js';
import { RESOURCE_KEYS } from '../src/core/resources.js';
import { ROUNDS } from '../src/data/rounds/index.js';
import { MINIGAME_TYPES } from '../src/minigames/types.js';

test('el juego esta configurado para 4 rondas en total', () => {
  assert.equal(GAME.totalRounds, 4);
  assert.equal(ROUNDS.length, 4);
});

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

test('las 4 rondas tienen números consecutivos del 1 al 4', () => {
  ROUNDS.forEach((round, i) => {
    assert.equal(round.number, i + 1, `la ronda ${round.id} debe ser la número ${i + 1}`);
  });
});

test('los efectos de la ronda 1 coinciden con el guion', () => {
  const { outcomes } = ROUNDS[0];
  assert.deepEqual(outcomes['leave-win'].effects, { lifeSupport: -15, energy: -25, shielding: 5 });
  assert.deepEqual(outcomes['leave-lose'].effects, { lifeSupport: -20, energy: -30, shielding: -10 });
  assert.deepEqual(outcomes['stay-win'].effects, { lifeSupport: 10, shielding: 5, energy: -5 });
});

const round02 = ROUNDS.find((r) => r.id === 'round-02');
test('round-02 es la misión del rover / reconocimiento de terreno', () => {
  assert.ok(round02, 'round-02 debe existir');
  assert.equal(round02.number, 2);
  const types = round02.decision.options.map((o) => o.minigame.type);
  assert.ok(types.includes('marsRoverDrive'), 'usa marsRoverDrive');
  assert.ok(types.includes('marsRoutePlanner'), 'usa marsRoutePlanner');
  assert.ok(types.includes('marsRadarScan'), 'usa marsRadarScan');
});

const round03 = ROUNDS.find((r) => r.id === 'round-03');
test('round-03 es la misión de conjunción solar', () => {
  assert.ok(round03, 'round-03 debe existir');
  assert.equal(round03.number, 3);
  assert.equal(round03.title, 'Solar Conjunction');
  const types = round03.decision.options.map((o) => o.minigame.type);
  assert.ok(types.includes('offlineKit'), 'usa offlineKit');
  assert.ok(types.includes('habitatDrill'), 'usa habitatDrill');
});

const round04 = ROUNDS.find((r) => r.id === 'round-04');
test('round-04 existe en el arreglo como Ronda 4 y tiene exactamente 2 opciones', () => {
  assert.ok(round04, 'round-04 debe estar registrado en ROUNDS');
  assert.equal(round04.number, 4);
  assert.equal(round04.decision.options.length, 2);
});

test('round-04 usa shieldZap y rocketBoost como minijuegos', () => {
  const types = round04.decision.options.map((o) => o.minigame.type);
  assert.ok(types.includes('shieldZap'),   'opción 1 debe usar shieldZap');
  assert.ok(types.includes('rocketBoost'), 'opción 2 debe usar rocketBoost');
});

test('los efectos de la ronda 4 coinciden con el guion', () => {
  const { outcomes } = round04;
  assert.deepEqual(outcomes['shield-win'].effects,  { energy: -20, shielding: 15 });
  assert.deepEqual(outcomes['shield-lose'].effects, { energy: -30, lifeSupport: -10, shielding: 10 });
  assert.deepEqual(outcomes['boost-win'].effects,   { energy: -5,  shielding: -10 });
  assert.deepEqual(outcomes['boost-lose'].effects,  { energy: -25, lifeSupport: -15, shielding: -10 });
});

test('round-04 tiene un resultado win definido para cada opción', () => {
  for (const option of round04.decision.options) {
    assert.ok(option.outcomes.win, `opción "${option.id}" debe tener un resultado win`);
    assert.ok(round04.outcomes[option.outcomes.win], `el outcome "${option.outcomes.win}" debe existir en round04.outcomes`);
  }
});

test('shieldZap y rocketBoost están registrados en MINIGAME_TYPES', () => {
  assert.ok(MINIGAME_TYPES.includes('shieldZap'),   'shieldZap debe estar en MINIGAME_TYPES');
  assert.ok(MINIGAME_TYPES.includes('rocketBoost'), 'rocketBoost debe estar en MINIGAME_TYPES');
});

test('round-04 no contiene emojis, porcentajes o nombres de agencias en sus textos', () => {
  const allTexts = [
    round04.title,
    ...round04.report.pages.map((p) => p.text),
    ...(round04.report.pages.flatMap((p) => (p.notes ?? []).map((n) => `${n.term} ${n.text}`))),
    ...round04.decision.pages.map((p) => p.text),
    round04.decision.title,
    round04.decision.prompt,
    ...round04.decision.options.map((o) => o.label),
    ...round04.decision.options.map((o) => o.minigame.intro),
    ...Object.values(round04.outcomes).map((o) => o.text),
    round04.fact.title,
    round04.fact.text,
  ].join(' ');

  // No emojis
  const emojiRegex = /[\p{Extended_Pictographic}]/u;
  assert.equal(emojiRegex.test(allTexts), false, 'No debe haber emojis');

  // No percentages
  assert.equal(allTexts.includes('%'), false, 'No debe haber porcentajes');

  // No NASA, DONKI, OSDR
  assert.equal(/NASA|DONKI|OSDR/i.test(allTexts), false, 'No debe mencionar agencias o acronimos');
});
