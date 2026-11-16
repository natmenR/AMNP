/** Generador de números aleatorios con semilla, para pruebas repetibles. */
export function seededRandom(seed) {
  let a = seed;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Caché en memoria para no tocar localStorage en las pruebas. */
export function memoryCache() {
  let saved = null;
  return { load: () => saved, save: (result) => { saved = result; }, get saved() { return saved; } };
}
