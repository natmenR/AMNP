/**
 * Modelo del minijuego "Manual flight" (solo lógica, sin DOM).
 *
 * La pantalla del star tracker muestra un marcador que se desvía por los destellos de la tormenta.
 * El jugador usa propulsores (cuestan Energy) para mantenerlo en la zona verde mientras la
 * alarma de radiación sube. Gana si completa la revisión; pierde si la radiación se llena
 * o se acaba la energía.
 *
 * @typedef {{ drift: number, flashEvery: [number, number], flashSize: [number, number] }} Preset
 * @typedef {{
 *   preset: Preset, rng: () => number, pos: number, vel: number, energy: number, radiation: number,
 *   progress: number, time: number, nextFlash: number, flashCount: number,
 *   status: 'running'|'win'|'lose', reason: 'radiation'|'energy'|null
 * }} FlightModel
 */

export const FLIGHT = Object.freeze({
  range: 100, // el marcador vive entre -100 y +100
  zone: 22, // zona verde: -22 a +22
  pulseSpeed: 38, // empuje de cada propulsor
  pulseCost: 4, // Energy que gasta cada propulsión (de 100)
  damping: 0.7,
  baseRadiation: 4.2, // por segundo
  outsideRadiation: 4.0, // extra por segundo si el marcador está fuera de la zona
  progressRate: 12.5, // por segundo dentro de la zona (8 s para completar)
  presets: Object.freeze({
    mild: { drift: 120, flashEvery: [2.6, 4.2], flashSize: [14, 26] },
    medium: { drift: 190, flashEvery: [2.0, 3.4], flashSize: [18, 32] },
    strong: { drift: 270, flashEvery: [1.5, 2.6], flashSize: [24, 40] },
  }),
});

const between = (rng, [min, max]) => min + rng() * (max - min);

/** @param {'mild'|'medium'|'strong'} [level] @param {() => number} [rng] @returns {FlightModel} */
export function createFlightModel(level = 'medium', rng = Math.random) {
  const preset = FLIGHT.presets[level] ?? FLIGHT.presets.medium;
  return {
    preset, rng, pos: 0, vel: 0, energy: 100, radiation: 0, progress: 0, time: 0,
    nextFlash: between(rng, preset.flashEvery), flashCount: 0, status: 'running', reason: null,
  };
}

export const isInsideZone = (model) => Math.abs(model.pos) <= FLIGHT.zone;

/** Un empujón del propulsor. dir = -1 (izquierda) o +1 (derecha). */
export function pulse(model, dir) {
  if (model.status !== 'running' || model.energy <= 0) return false;
  model.vel += dir * FLIGHT.pulseSpeed;
  model.energy = Math.max(0, model.energy - FLIGHT.pulseCost);
  if (model.energy <= 0) finish(model, 'lose', 'energy');
  return true;
}

function finish(model, status, reason = null) {
  if (model.status === 'running') {
    model.status = status;
    model.reason = reason;
  }
}

/** Avanza la simulación dt segundos. @returns {boolean} true si hubo un destello en este paso */
export function step(model, dt) {
  if (model.status !== 'running') return false;
  const { preset, rng } = model;
  model.time += dt;

  model.vel += (rng() - 0.5) * 2 * preset.drift * dt;
  model.vel *= Math.max(0, 1 - FLIGHT.damping * dt);
  model.pos += model.vel * dt;

  let flashed = false;
  if (model.time >= model.nextFlash) {
    model.pos += (rng() < 0.5 ? -1 : 1) * between(rng, preset.flashSize);
    model.nextFlash = model.time + between(rng, preset.flashEvery);
    model.flashCount += 1;
    flashed = true;
  }

  if (Math.abs(model.pos) > FLIGHT.range) {
    model.pos = Math.sign(model.pos) * FLIGHT.range;
    model.vel *= -0.3;
  }

  const inside = isInsideZone(model);
  model.radiation += (FLIGHT.baseRadiation + (inside ? 0 : FLIGHT.outsideRadiation)) * dt;
  if (inside) model.progress += FLIGHT.progressRate * dt;

  if (model.progress >= 100) finish(model, 'win');
  else if (model.radiation >= 100) finish(model, 'lose', 'radiation');
  return flashed;
}
