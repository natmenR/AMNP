/**
 * Cliente de la API DONKI de la NASA (eventos SEP).
 *
 * Qué hace:
 *  1. Pide los eventos SEP más recientes (ampliando el rango de fechas si no hay nada).
 *  2. Si una fuente falla (sin internet, CORS, error del servidor), prueba la siguiente.
 *  3. Si todo falla, devuelve status "unavailable" y el juego sigue con valores por defecto.
 *  4. Guarda el resultado unas horas en caché para no repetir peticiones.
 */
import { DONKI, STORAGE_KEYS } from '../config.js';
import { readJson, writeJson } from './storage.js';

const DAY_MS = 86_400_000;

/**
 * @typedef {{ id: string, time: Date|null, instruments: string[], linkedEvents: string[] }} SepEvent
 * @typedef {{ status: 'live'|'cached'|'unavailable', events: SepEvent[], windowDays: number|null, sourceId: string|null }} SepResult
 * @typedef {'mild'|'medium'|'strong'} StormLevel
 */

/** @param {Date} date @returns {string} fecha en formato yyyy-MM-dd (UTC) */
export function toApiDate(date) {
  return date.toISOString().slice(0, 10);
}

/**
 * @param {typeof DONKI.sources[number]} source
 * @param {Date} start
 * @param {Date} end
 */
export function buildUrl(source, start, end) {
  const url = new URL(source.baseUrl);
  for (const [key, value] of Object.entries(source.params)) url.searchParams.set(key, value);
  url.searchParams.set(source.dateParams.start, toApiDate(start));
  url.searchParams.set(source.dateParams.end, toApiDate(end));
  return url.toString();
}

/** Convierte un evento "crudo" de la API en un objeto limpio. Devuelve null si no sirve. */
export function normalizeEvent(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const id = raw.sepID ?? raw.id;
  if (typeof id !== 'string' || id === '') return null;

  const timeText = raw.eventTime ?? raw.event_time;
  const parsed = timeText ? new Date(timeText) : null;
  const time = parsed && !Number.isNaN(parsed.getTime()) ? parsed : null;

  const names = (list, pick) =>
    (Array.isArray(list) ? list : [])
      .map((item) => (typeof item === 'string' ? item : item?.[pick]))
      .filter((value) => typeof value === 'string' && value !== '');

  return {
    id,
    time,
    instruments: names(raw.instruments, 'displayName'),
    linkedEvents: names(raw.linkedEvents, 'activityID'),
  };
}

/** @returns {SepEvent[]} eventos válidos, del más reciente al más antiguo */
export function normalizeResponse(json) {
  if (!Array.isArray(json)) throw new Error('Unexpected DONKI response: expected a list');
  return json
    .map(normalizeEvent)
    .filter(Boolean)
    .sort((a, b) => (b.time?.getTime() ?? 0) - (a.time?.getTime() ?? 0));
}

async function fetchJson(url, { fetchImpl, timeoutMs }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, { signal: controller.signal, headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`DONKI request failed with status ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

// ── Caché ────────────────────────────────────────────────────
const defaultCache = {
  load(now) {
    const saved = readJson(STORAGE_KEYS.sepCache);
    if (!saved || typeof saved.savedAt !== 'number' || now.getTime() - saved.savedAt > DONKI.cacheTtlMs) return null;
    try {
      const events = saved.result.events.map(normalizeEvent).filter(Boolean);
      return events.length ? { ...saved.result, events } : null;
    } catch {
      return null;
    }
  },
  save(result, now) {
    const events = result.events.map((e) => ({
      sepID: e.id,
      eventTime: e.time ? e.time.toISOString() : null,
      instruments: e.instruments,
      linkedEvents: e.linkedEvents,
    }));
    writeJson(STORAGE_KEYS.sepCache, { savedAt: now.getTime(), result: { ...result, events } });
  },
};

/**
 * Busca los eventos SEP más recientes.
 * @param {object} [options] (todo es opcional; las opciones existen para poder hacer pruebas)
 * @returns {Promise<SepResult>}
 */
export async function getLatestSepEvents(options = {}) {
  const {
    fetchImpl = globalThis.fetch?.bind(globalThis),
    now = new Date(),
    sources = DONKI.sources,
    lookbackDays = DONKI.lookbackDays,
    timeoutMs = DONKI.timeoutMs,
    cache = defaultCache,
  } = options;

  const cached = cache.load(now);
  if (cached) return { ...cached, status: 'cached' };
  if (!fetchImpl) return { status: 'unavailable', events: [], windowDays: null, sourceId: null };

  for (const source of sources) {
    try {
      for (const days of lookbackDays) {
        const start = new Date(now.getTime() - days * DAY_MS);
        const json = await fetchJson(buildUrl(source, start, now), { fetchImpl, timeoutMs });
        const events = normalizeResponse(json);
        if (events.length > 0) {
          /** @type {SepResult} */
          const result = { status: 'live', events, windowDays: days, sourceId: source.id };
          cache.save(result, now);
          return result;
        }
      }
      // La fuente responde bien, pero no hay eventos ni en la ventana más larga.
      return { status: 'live', events: [], windowDays: lookbackDays[lookbackDays.length - 1], sourceId: source.id };
    } catch {
      // Esta fuente falló: probamos la siguiente.
    }
  }
  return { status: 'unavailable', events: [], windowDays: null, sourceId: null };
}

/**
 * Resume el resultado para el juego.
 * Regla del juego (no es una medida científica): cuantas más erupciones solares estén
 * ligadas al evento real, más fuerte y "ruidosa" es la tormenta del minijuego.
 * @param {SepResult} result
 * @returns {{ latest: SepEvent|null, count: number, windowDays: number|null, level: StormLevel, hasLiveData: boolean }}
 */
export function summarizeStorm(result) {
  const latest = result.events[0] ?? null;
  let level = /** @type {StormLevel} */ ('medium');
  if (latest) {
    const linked = latest.linkedEvents.length;
    level = linked >= 2 ? 'strong' : linked === 1 ? 'medium' : 'mild';
  }
  return { latest, count: result.events.length, windowDays: result.windowDays, level, hasLiveData: latest !== null };
}
