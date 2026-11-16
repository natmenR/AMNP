import { RESOURCES } from '../config.js';
import { applyEffects, createResources } from './resources.js';

/**
 * @typedef {import('./resources.js').Resources} Resources
 * @typedef {import('./resources.js').Effects} Effects
 * @typedef {{ roundId: string, choiceId: string, result: string, outcomeId: string }} HistoryEntry
 * @typedef {{ resources: Resources, history: HistoryEntry[] }} GameState
 */

/** @returns {GameState} */
export function createGameState() {
  return { resources: createResources(RESOURCES.start), history: [] };
}

/**
 * Devuelve un estado NUEVO con los efectos del resultado de una ronda (el original no cambia).
 * @param {GameState} state
 * @param {HistoryEntry} entry
 * @param {Effects} effects
 * @returns {{ state: GameState, applied: Effects }}
 */
export function recordOutcome(state, entry, effects) {
  const { resources, applied } = applyEffects(state.resources, effects, RESOURCES.max);
  return { state: { resources, history: [...state.history, entry] }, applied };
}
