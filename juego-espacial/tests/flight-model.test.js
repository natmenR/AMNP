import assert from 'node:assert/strict';
import { test } from 'node:test';
import { FLIGHT, createFlightModel, pulse, step } from '../src/minigames/flight-model.js';
import { seededRandom } from './helpers.js';

const DT = 1 / 60;

/** Jugador simulado: solo ve la posición, reacciona con retraso y a veces se equivoca. */
function simulatePlayer(level, seed, { reaction = 0.5, threshold = 18, mistakeRate = 0.08 } = {}) {
  const model = createFlightModel(level, seededRandom(seed));
  const human = seededRandom(seed * 7 + 1);
  let next = 0.4 + human() * reaction;
  while (model.status === 'running' && model.time < 60) {
    if (model.time >= next) {
      if (Math.abs(model.pos) > threshold) pulse(model, (model.pos > 0 ? -1 : 1) * (human() < mistakeRate ? -1 : 1));
      next = model.time + reaction * (0.6 + human() * 0.8);
    }
    step(model, DT);
  }
  return model;
}

test('cada propulsión gasta energía y cambia la velocidad', () => {
  const model = createFlightModel('medium', seededRandom(1));
  assert.ok(pulse(model, 1));
  assert.equal(model.energy, 100 - FLIGHT.pulseCost);
  assert.equal(model.vel, FLIGHT.pulseSpeed);
});

test('gastar toda la energía hace perder por "energy"', () => {
  const model = createFlightModel('medium', seededRandom(2));
  for (let i = 0; i < 40; i += 1) pulse(model, i % 2 ? 1 : -1);
  assert.equal(model.status, 'lose');
  assert.equal(model.reason, 'energy');
  assert.equal(pulse(model, 1), false);
});

test('la radiación siempre sube y llena la alarma si no se completa la revisión', () => {
  const model = createFlightModel('strong', seededRandom(3));
  let last = 0;
  for (let i = 0; i < 60 * 40 && model.status === 'running'; i += 1) {
    step(model, DT);
    assert.ok(model.radiation >= last);
    last = model.radiation;
  }
  assert.notEqual(model.status, 'running');
});

test('un jugador normal gana casi siempre en nivel medio', () => {
  let wins = 0;
  for (let seed = 1; seed <= 200; seed += 1) if (simulatePlayer('medium', seed).status === 'win') wins += 1;
  assert.ok(wins >= 160, `ganó ${wins} de 200`);
});

test('el nivel fuerte es más difícil que el suave', () => {
  const count = (level) => Array.from({ length: 200 }, (_, i) => simulatePlayer(level, i + 1, { reaction: 0.8 })).filter((m) => m.status === 'win').length;
  assert.ok(count('mild') > count('strong'));
});

test('apretar los propulsores sin pensar pierde por energía', () => {
  const model = createFlightModel('medium', seededRandom(5));
  let t = 0;
  while (model.status === 'running' && t < 60) {
    pulse(model, t % 0.2 < 0.1 ? 1 : -1);
    for (let i = 0; i < 6; i += 1) step(model, DT);
    t += 0.1;
  }
  assert.equal(model.reason, 'energy');
});
