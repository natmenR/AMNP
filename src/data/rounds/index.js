/**
 * Lista de rondas, en orden. Hay 10 rondas en total (GAME.totalRounds);
 * cuando escribas la ronda 2, impórtala aquí y agrégala al arreglo.
 */
import { round01 } from './round-01.js';

/** @type {import('./round-01.js').Round[]} */
export const ROUNDS = [round01];

// NUEVO: Registrar la ronda 2
import { round02 } from './round-02.js';

ROUNDS.push(round02);
