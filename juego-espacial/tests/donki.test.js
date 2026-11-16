import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildUrl, getLatestSepEvents, normalizeEvent, normalizeResponse, summarizeStorm, toApiDate } from '../src/services/donki.js';
import { DONKI } from '../src/config.js';
import { memoryCache } from './helpers.js';

const NOW = new Date('2026-11-15T12:00:00Z');
const rawEvent = (id, time, linked = []) => ({
  sepID: id,
  eventTime: time,
  instruments: [{ displayName: 'GOES-P: SEPEM' }],
  linkedEvents: linked.map((activityID) => ({ activityID })),
});
const okResponse = (json) => ({ ok: true, status: 200, json: async () => json });
const options = (fetchImpl, extra = {}) => ({ fetchImpl, now: NOW, cache: memoryCache(), timeoutMs: 1000, ...extra });

test('toApiDate y buildUrl arman la URL con fechas yyyy-MM-dd y los parámetros de la fuente', () => {
  assert.equal(toApiDate(NOW), '2026-11-15');
  const url = new URL(buildUrl(DONKI.sources[0], new Date('2026-10-16T00:00:00Z'), NOW));
  assert.equal(url.origin + url.pathname, 'https://ccmc.gsfc.nasa.gov/DONKI-API/get/SEP');
  assert.equal(url.searchParams.get('catalog'), 'M2M_CATALOG');
  assert.equal(url.searchParams.get('version'), 'Latest');
  assert.equal(url.searchParams.get('startDate'), '2026-10-16');
  assert.equal(url.searchParams.get('endDate'), '2026-11-15');
});

test('normalizeEvent limpia un evento y descarta los inválidos', () => {
  const event = normalizeEvent(rawEvent('2024-05-10T05:30:00-SEP-001', '2024-05-10T05:30Z', ['2024-05-10T03:00:00-FLR-001']));
  assert.equal(event.id, '2024-05-10T05:30:00-SEP-001');
  assert.equal(event.time.toISOString(), '2024-05-10T05:30:00.000Z');
  assert.deepEqual(event.instruments, ['GOES-P: SEPEM']);
  assert.deepEqual(event.linkedEvents, ['2024-05-10T03:00:00-FLR-001']);
  assert.equal(normalizeEvent(null), null);
  assert.equal(normalizeEvent({ eventTime: '2024-01-01T00:00Z' }), null);
  assert.equal(normalizeEvent({ sepID: 'x', eventTime: 'not a date' }).time, null);
});

test('normalizeResponse ordena del más reciente al más antiguo y rechaza respuestas que no son listas', () => {
  const events = normalizeResponse([rawEvent('a', '2020-01-01T00:00Z'), rawEvent('b', '2024-01-01T00:00Z')]);
  assert.deepEqual(events.map((e) => e.id), ['b', 'a']);
  assert.throws(() => normalizeResponse({ error: 'nope' }));
});

test('si la ventana de 30 días viene vacía, amplía la búsqueda', async () => {
  const calls = [];
  const fetchImpl = async (url) => {
    calls.push(url);
    return okResponse(calls.length === 1 ? [] : [rawEvent('x', '2026-03-01T10:00Z', ['f1', 'f2'])]);
  };
  const result = await getLatestSepEvents(options(fetchImpl));
  assert.equal(result.status, 'live');
  assert.equal(result.windowDays, 365);
  assert.equal(result.events.length, 1);
  assert.equal(calls.length, 2);
  assert.ok(calls[1].includes('startDate=2025-11-15'));
});

test('si una fuente falla, usa la siguiente', async () => {
  const fetchImpl = async (url) => {
    if (url.startsWith('https://ccmc.gsfc.nasa.gov')) throw new TypeError('Failed to fetch (CORS)');
    return okResponse([rawEvent('y', '2026-10-30T00:00Z')]);
  };
  const result = await getLatestSepEvents(options(fetchImpl));
  assert.equal(result.status, 'live');
  assert.equal(result.sourceId, 'api-nasa-gov');
});

test('si todo falla devuelve "unavailable" sin lanzar errores', async () => {
  const failing = async () => { throw new Error('offline'); };
  const result = await getLatestSepEvents(options(failing));
  assert.equal(result.status, 'unavailable');
  assert.deepEqual(result.events, []);
  const badStatus = async () => ({ ok: false, status: 500, json: async () => ({}) });
  assert.equal((await getLatestSepEvents(options(badStatus))).status, 'unavailable');
});

test('si la fuente responde pero nunca hay eventos, devuelve "live" con lista vacía', async () => {
  const result = await getLatestSepEvents(options(async () => okResponse([])));
  assert.equal(result.status, 'live');
  assert.equal(result.events.length, 0);
});

test('usa la caché y no vuelve a pedir datos', async () => {
  const cache = memoryCache();
  let calls = 0;
  const fetchImpl = async () => { calls += 1; return okResponse([rawEvent('z', '2026-10-01T00:00Z')]); };
  await getLatestSepEvents({ fetchImpl, now: NOW, cache });
  const second = await getLatestSepEvents({ fetchImpl, now: NOW, cache });
  assert.equal(calls, 1);
  assert.equal(second.status, 'cached');
});

test('summarizeStorm: la fuerza depende de las erupciones ligadas', () => {
  const make = (linked) => ({ status: 'live', windowDays: 30, sourceId: 'x', events: [normalizeEvent(rawEvent('e', '2026-01-01T00:00Z', linked))] });
  assert.equal(summarizeStorm(make([])).level, 'mild');
  assert.equal(summarizeStorm(make(['a'])).level, 'medium');
  assert.equal(summarizeStorm(make(['a', 'b'])).level, 'strong');
  const none = summarizeStorm({ status: 'unavailable', events: [], windowDays: null, sourceId: null });
  assert.equal(none.level, 'medium');
  assert.equal(none.hasLiveData, false);
});
