/** Acceso seguro a localStorage (puede fallar en modo privado o sin permisos). */

/** @param {string} key @returns {string|null} */
export function readString(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** @param {string} key @param {string} value */
export function writeString(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

/** @param {string} key @param {unknown} fallback */
export function readJson(key, fallback = null) {
  const raw = readString(key);
  if (raw === null) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

/** @param {string} key @param {unknown} value */
export function writeJson(key, value) {
  return writeString(key, JSON.stringify(value));
}
