/**
 * Lista de rondas, en orden. Cuando un compañero termine una ronda nueva,
 * impórtala aquí y agrégala al arreglo en el lugar correcto.
 * La última entrada del arreglo debe ser siempre la ronda final (round04).
 */
import { round01 } from './round-01.js';
import { round04 } from './round-04.js';

/** @type {import('./round-01.js').Round[]} */
export const ROUNDS = [round01, round04];
