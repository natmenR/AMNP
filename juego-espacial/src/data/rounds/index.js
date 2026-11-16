/**
 * Lista de rondas, en orden cronológico:
 *   1. Lanzamiento / Tormenta solar (round-01)
 *   2. Reconocimiento de terreno / Rover en Marte (round-02)
 *   3. Conjunción solar (round-03)
 *   4. Regreso a casa (round-04)
 */
import { round01 } from './round-01.js';
import { round02 } from './round-02.js';
import { round03 } from './round-03.js';
import { round04 } from './round-04.js';

/** @type {import('./round-01.js').Round[]} */
export const ROUNDS = [round01, round02, round03, round04];
