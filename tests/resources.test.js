import assert from 'node:assert/strict';
import { test } from 'node:test';
import { RESOURCES } from '../src/config.js';
import { createGameState, recordOutcome } from '../src/core/game-state.js';
import { applyEffects, clamp, createResources, findDepleted, formatPercent } from '../src/core/resources.js';

const start = { energy: 70, lifeSupport: 70, shielding: 70 };

test('applyEffects suma los efectos sin modificar el original', () => {
  const { resources, applied } = applyEffects(start, { energy: -25, lifeSupport: -15, shielding: 5 }, 100);
  assert.deepEqual(resources, { energy: 45, lifeSupport: 55, shielding: 75 });
  assert.deepEqual(applied, { energy: -25, lifeSupport: -15, shielding: 5 });
  assert.deepEqual(start, { energy: 70, lifeSupport: 70, shielding: 70 });
});

test('applyEffects limita entre 0 y el máximo y reporta el cambio real', () => {
  const { resources, applied } = applyEffects({ energy: 95, lifeSupport: 10, shielding: 50 }, { energy: 10, lifeSupport: -30 }, 100);
  assert.equal(resources.energy, 100);
  assert.equal(resources.lifeSupport, 0);
  assert.equal(applied.energy, 5);
  assert.equal(applied.lifeSupport, -10);
  assert.equal(applied.shielding, 0);
});

test('findDepleted devuelve el recurso agotado o null', () => {
  assert.equal(findDepleted(start), null);
  assert.equal(findDepleted({ energy: 0, lifeSupport: 50, shielding: 50 }), 'energy');
});

test('formatPercent usa signo + o − (menos real)', () => {
  assert.equal(formatPercent(5), '+5%');
  assert.equal(formatPercent(-15), '\u221215%');
});

test('clamp y createResources', () => {
  assert.equal(clamp(120, 100), 100);
  assert.equal(clamp(-5, 100), 0);
  const copy = createResources(start);
  assert.notEqual(copy, start);
  assert.deepEqual(copy, start);
});

test('recordOutcome devuelve un estado nuevo con historial', () => {
  const state = createGameState();
  const entry = { roundId: 'round-01', choiceId: 'stay', result: 'win', outcomeId: 'stay-win' };
  const { state: next, applied } = recordOutcome(state, entry, { lifeSupport: 10, shielding: 5, energy: -5 });
  assert.deepEqual(state.history, []);
  assert.deepEqual(next.history, [entry]);
  assert.equal(next.resources.lifeSupport, RESOURCES.start.lifeSupport + 10);
  assert.equal(applied.energy, -5);
});
