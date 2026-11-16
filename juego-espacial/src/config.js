/**
 * Ajustes globales del juego.
 * Cambia números y textos de configuración AQUÍ, no dentro de la lógica.
 */

export const GAME = Object.freeze({
  playerName: 'D. Diaz',
  totalRounds: 4,
  totalDays: 300,
});

export const PAGES = Object.freeze({
  start: 'index.html',
  game: 'game.html',
});

/** Recursos de la nave (porcentajes de 0 a 100). */
export const RESOURCES = Object.freeze({
  max: 100,
  lowThreshold: 25,
  start: Object.freeze({ energy: 70, lifeSupport: 70, shielding: 70 }),
  labels: Object.freeze({
    energy: 'Energy',
    lifeSupport: 'Life Support',
    shielding: 'Shielding',
  }),
});

export const STORAGE_KEYS = Object.freeze({
  sound: 'survive-in-space:sound',
  sepCache: 'survive-in-space:sep-cache',
});

export const TIMING = Object.freeze({
  liftOffMs: 1400,
  fadeOutMs: 850,
  typeMsPerChar: 22,
  liveDataWaitMs: 3500,
  minigameEndMs: 1500,
});

/**
 * API DONKI de la NASA (Space Weather Database Of Notifications, Knowledge, Information).
 * Devuelve eventos SEP (tormentas de partículas solares) como una lista JSON.
 *  - Sin fechas, solo mira los últimos 30 días (por eso a veces llega vacía: []).
 *  - Con startDate / endDate (yyyy-MM-dd) puedes pedir un rango más amplio.
 */
export const DONKI = Object.freeze({
  timeoutMs: 5000,
  /** Ventanas de búsqueda, de la más corta a la más larga (en días). */
  lookbackDays: Object.freeze([30, 365, 1825]),
  cacheTtlMs: 6 * 60 * 60 * 1000,
  sources: Object.freeze([
    Object.freeze({
      id: 'ccmc',
      baseUrl: 'https://ccmc.gsfc.nasa.gov/DONKI-API/get/SEP',
      params: Object.freeze({ catalog: 'M2M_CATALOG', version: 'Latest' }),
      dateParams: Object.freeze({ start: 'startDate', end: 'endDate' }),
    }),
    Object.freeze({
      id: 'api-nasa-gov',
      baseUrl: 'https://api.nasa.gov/DONKI/SEP',
      // DEMO_KEY sirve para pruebas (límite bajo). Para publicar el juego, pide tu propia clave gratis en api.nasa.gov
      params: Object.freeze({ api_key: 'DEMO_KEY' }),
      dateParams: Object.freeze({ start: 'startDate', end: 'endDate' }),
    }),
  ]),
});
