
/**
 * 980 DAYS: MISSION MARS
 * ROUND 02 — MARS TERRAIN RECONNAISSANCE
 *
 * Game logic only. No DOM, Canvas, or CSS.
 *
 * Routes:
 * A — Manual rover driving
 * B — Autonomous route planning
 * C — Remote terrain mapping
 *
 * Compatible with the ES module architecture.
 */

// ============================================================
// 1. CONFIGURATION
// ============================================================

export const MARS_RECON = Object.freeze({
  width: 19,
  height: 11,
  tileSize: 46,

  home: Object.freeze([1, 1]),

  normalCost: 1,
  rockyCost: 3,

  batteryBuffer: 38,

  maxRadarScans: 8,
  radarTolerance: 15
});

export const SCIENCE_SITES = Object.freeze([
  {
    id: 0,
    name: 'ALPHA',
    position: Object.freeze([5, 3])
  },
  {
    id: 1,
    name: 'BETA',
    position: Object.freeze([12, 3])
  },
  {
    id: 2,
    name: 'GAMMA',
    position: Object.freeze([16, 8])
  }
]);

export const RADAR_SECTORS = Object.freeze([
  {
    id: 0,
    label: 'A',
    bearing: 40,
    type: 'regolith',
    signal: 'Fine, low-reflectance particles'
  },
  {
    id: 1,
    label: 'B',
    bearing: 125,
    type: 'rock',
    signal: 'Strong, irregular backscatter'
  },
  {
    id: 2,
    label: 'C',
    bearing: 220,
    type: 'dune',
    signal: 'Layered, shifting ridge pattern'
  },
  {
    id: 3,
    label: 'D',
    bearing: 310,
    type: 'slope',
    signal: 'Consistent elevation gradient'
  }
]);

// ============================================================
// 2. TERRAIN MAP
// ============================================================

const MAP_ROWS = [
  '###################',
  '#.....#...........#',
  '#.###.#.#####.###.#',
  '#...#...#...#...#.#',
  '###.#####.#.###.#.#',
  '#...#.....#.....#.#',
  '#.###.#########.#.#',
  '#...#...........#.#',
  '#.#.###.#######.#.#',
  '#.................#',
  '###################'
];

/**
 * Creates the original fixed maze.
 *
 * # = impassable obstacle
 * . = passable terrain
 *
 * @returns {string[][]}
 */
export function createMarsMap() {
  const map = MAP_ROWS.map((row) => row.split(''));

  const passages = [
    [5, 2], [5, 4], [6, 3], [9, 4],
    [12, 4], [13, 4], [16, 7], [15, 8],
    [12, 8], [5, 8], [4, 8], [4, 7],
    [7, 6], [12, 6], [13, 6], [17, 8]
  ];

  passages.forEach(([x, y]) => {
    map[y][x] = '.';
  });

  for (let x = 5; x <= 12; x++) {
    map[3][x] = '.';
  }

  for (let y = 3; y <= 5; y++) {
    map[y][9] = '.';
  }

  for (let x = 9; x <= 15; x++) {
    map[5][x] = '.';
  }

  for (let y = 5; y <= 8; y++) {
    map[y][15] = '.';
  }

  map[8][16] = '.';

  return map;
}

export const MARS_MAP = createMarsMap();

// ============================================================
// 3. TERRAIN UTILITIES
// ============================================================

export function samePosition(a, b) {
  return a[0] === b[0] && a[1] === b[1];
}

export function isPassable(x, y) {
  return (
    Number.isInteger(x) &&
    Number.isInteger(y) &&
    x >= 0 &&
    y >= 0 &&
    x < MARS_RECON.width &&
    y < MARS_RECON.height &&
    MARS_MAP[y][x] !== '#'
  );
}

export function isRocky(x, y) {
  return (
    isPassable(x, y) &&
    (x * 7 + y * 11) % 9 === 0
  );
}

export function movementCost(x, y) {
  if (!isPassable(x, y)) {
    return Infinity;
  }

  return isRocky(x, y)
    ? MARS_RECON.rockyCost
    : MARS_RECON.normalCost;
}

export function getTerrain(x, y) {
  if (!isPassable(x, y)) {
    return 'obstacle';
  }

  if (samePosition([x, y], MARS_RECON.home)) {
    return 'habitat';
  }

  if (
    SCIENCE_SITES.some((site) =>
      samePosition(site.position, [x, y])
    )
  ) {
    return 'science';
  }

  return isRocky(x, y)
    ? 'rocky'
    : 'normal';
}

// ============================================================
// 4. PATHFINDING — DIJKSTRA
// ============================================================

const DIRECTIONS = Object.freeze([
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1]
]);

/**
 * Finds the least expensive route between two positions.
 *
 * Rocky terrain has a higher movement cost.
 *
 * @param {number[]} start
 * @param {number[]} destination
 * @returns {{cost: number, path: number[][]}}
 */
export function shortestPath(start, destination) {
  if (
    !isPassable(...start) ||
    !isPassable(...destination)
  ) {
    return {
      cost: Infinity,
      path: []
    };
  }

  const distances = Array.from(
    { length: MARS_RECON.height },
    () => Array(MARS_RECON.width).fill(Infinity)
  );

  const previous = new Map();

  const queue = [
    {
      x: start[0],
      y: start[1],
      cost: 0
    }
  ];

  distances[start[1]][start[0]] = 0;

  while (queue.length > 0) {
    queue.sort((a, b) => a.cost - b.cost);

    const current = queue.shift();

    const { x, y, cost } = current;

    if (cost !== distances[y][x]) {
      continue;
    }

    if (samePosition([x, y], destination)) {
      const path = [];
      let position = [x, y];

      while (!samePosition(position, start)) {
        path.unshift(position);

        position = previous.get(
          position.join(',')
        );
      }

      return { cost, path };
    }

    for (const [dx, dy] of DIRECTIONS) {
      const nx = x + dx;
      const ny = y + dy;

      if (!isPassable(nx, ny)) {
        continue;
      }

      const nextCost =
        cost + movementCost(nx, ny);

      if (nextCost < distances[ny][nx]) {
        distances[ny][nx] = nextCost;

        previous.set(
          `${nx},${ny}`,
          [x, y]
        );

        queue.push({
          x: nx,
          y: ny,
          cost: nextCost
        });
      }
    }
  }

  return {
    cost: Infinity,
    path: []
  };
}

// ============================================================
// 5. COMPLETE EXPEDITION CALCULATION
// ============================================================

/**
 * Calculates:
 * Habitat -> selected sites -> Habitat.
 *
 * The return trip is always included.
 *
 * @param {number[]} order
 */
export function calculateTour(order) {
  let currentPosition = MARS_RECON.home;
  let totalCost = 0;

  const fullPath = [];

  for (const siteId of [...order, -1]) {
    const destination = siteId === -1
      ? MARS_RECON.home
      : SCIENCE_SITES[siteId]?.position;

    if (!destination) {
      return {
        cost: Infinity,
        path: []
      };
    }

    const segment = shortestPath(
      currentPosition,
      destination
    );

    if (!Number.isFinite(segment.cost)) {
      return {
        cost: Infinity,
        path: []
      };
    }

    totalCost += segment.cost;

    fullPath.push(...segment.path);

    currentPosition = destination;
  }

  return {
    cost: totalCost,
    path: fullPath
  };
}

/**
 * Returns all possible orders for three sites.
 */
export function getSiteOrders() {
  return [
    [0, 1, 2],
    [0, 2, 1],
    [1, 0, 2],
    [1, 2, 0],
    [2, 0, 1],
    [2, 1, 0]
  ];
}

/**
 * Finds the best complete expedition.
 */
export function minimumTour() {
  let best = {
    order: [],
    cost: Infinity,
    path: []
  };

  for (const order of getSiteOrders()) {
    const result = calculateTour(order);

    if (result.cost < best.cost) {
      best = {
        order: [...order],
        cost: result.cost,
        path: result.path
      };
    }
  }

  return best;
}

export const INITIAL_BATTERY =
  minimumTour().cost + MARS_RECON.batteryBuffer;

// ============================================================
// 6. CREATE GAME SESSION
// ============================================================

/**
 * @param {'A'|'B'|'C'} route
 */
export function createMarsSession(route = 'A') {
  if (!['A', 'B', 'C'].includes(route)) {
    throw new Error(
      `Invalid Mars reconnaissance route: ${route}`
    );
  }

  return {
    route,

    status: 'running',
    reason: null,

    x: MARS_RECON.home[0],
    y: MARS_RECON.home[1],

    battery: INITIAL_BATTERY,

    scanned: new Set(),
    visited: new Set([
      MARS_RECON.home.join(',')
    ]),

    // Route B
    plan: [],
    expedition: null,

    // Route C
    bearing: 0,
    attempts: 0,
    readings: {},
    classified: {}
  };
}

// ============================================================
// 7. SHARED MISSION STATUS
// ============================================================

function finishSession(
  session,
  status,
  reason = null
) {
  if (session.status !== 'running') {
    return false;
  }

  session.status = status;
  session.reason = reason;

  return true;
}

/**
 * Ends a session early without awarding a win.
 */
export function endMarsSession(session) {
  return finishSession(
    session,
    'lose',
    'ended-early'
  );
}

export function isAtHabitat(session) {
  return samePosition(
    [session.x, session.y],
    MARS_RECON.home
  );
}

// ============================================================
// 8. ROUTE A — MANUAL ROVER DRIVING
// ============================================================

/**
 * Moves the rover by one adjacent tile.
 *
 * @param {object} session
 * @param {number} dx
 * @param {number} dy
 */
export function moveMarsRover(session, dx, dy) {
  if (
    session.route !== 'A' ||
    session.status !== 'running'
  ) {
    return {
      moved: false,
      reason: 'not-running'
    };
  }

  if (
    !Number.isInteger(dx) ||
    !Number.isInteger(dy) ||
    Math.abs(dx) + Math.abs(dy) !== 1
  ) {
    return {
      moved: false,
      reason: 'invalid-direction'
    };
  }

  const nx = session.x + dx;
  const ny = session.y + dy;

  if (!isPassable(nx, ny)) {
    return {
      moved: false,
      reason: 'obstacle'
    };
  }

  const cost = movementCost(nx, ny);

  if (session.battery < cost) {
    finishSession(
      session,
      'lose',
      'battery-exhausted'
    );

    return {
      moved: false,
      reason: 'battery-exhausted'
    };
  }

  session.x = nx;
  session.y = ny;

  session.battery -= cost;
  session.visited.add(`${nx},${ny}`);

  const site = SCIENCE_SITES.find(
    (item) =>
      samePosition(item.position, [nx, ny])
  );

  const returnCost = shortestPath(
    [nx, ny],
    MARS_RECON.home
  ).cost;

  const reserveWarning =
    session.battery < returnCost;

  if (
    isAtHabitat(session) &&
    session.scanned.size === SCIENCE_SITES.length
  ) {
    finishSession(session, 'win');
  } else if (
    session.battery === 0 &&
    !isAtHabitat(session)
  ) {
    finishSession(
      session,
      'lose',
      'battery-exhausted'
    );
  }

  return {
    moved: true,
    position: [nx, ny],
    cost,
    battery: session.battery,
    site: site?.name ?? null,
    reserveWarning,
    returnCost,
    status: session.status
  };
}

/**
 * Scans a science site at the rover's position.
 */
export function scanMarsSite(session) {
  if (
    session.route !== 'A' ||
    session.status !== 'running'
  ) {
    return {
      success: false,
      reason: 'not-running'
    };
  }

  const site = SCIENCE_SITES.find(
    (item) =>
      samePosition(
        item.position,
        [session.x, session.y]
      )
  );

  if (!site) {
    return {
      success: false,
      reason: 'not-at-site'
    };
  }

  if (session.scanned.has(site.id)) {
    return {
      success: false,
      reason: 'already-scanned'
    };
  }

  session.scanned.add(site.id);

  return {
    success: true,
    site: site.name,
    scanned: session.scanned.size,
    remaining:
      SCIENCE_SITES.length - session.scanned.size
  };
}

// ============================================================
// 9. ROUTE B — AUTONOMOUS PLANNING
// ============================================================

/**
 * Adds or removes a science site from the plan.
 */
export function toggleMarsWaypoint(session, siteId) {
  if (
    session.route !== 'B' ||
    session.status !== 'running' ||
    session.expedition !== null
  ) {
    return false;
  }

  if (
    !Number.isInteger(siteId) ||
    siteId < 0 ||
    siteId >= SCIENCE_SITES.length
  ) {
    return false;
  }

  const index = session.plan.indexOf(siteId);

  if (index >= 0) {
    session.plan.splice(index, 1);
  } else {
    session.plan.push(siteId);
  }

  return true;
}

/**
 * Returns battery estimates and plan validity.
 */
export function evaluateMarsPlan(session) {
  const tour = calculateTour(session.plan);

  const allSitesSelected =
    session.plan.length === SCIENCE_SITES.length &&
    new Set(session.plan).size === SCIENCE_SITES.length;

  return {
    ...tour,
    allSitesSelected,
    affordable: tour.cost <= session.battery,
    remainingBattery: session.battery - tour.cost,
    valid:
      allSitesSelected &&
      tour.cost <= session.battery
  };
}

/**
 * Starts an autonomous expedition.
 *
 * The UI can animate expedition.path.
 */
export function startMarsExpedition(session) {
  if (
    session.route !== 'B' ||
    session.status !== 'running' ||
    session.expedition !== null
  ) {
    return {
      success: false,
      reason: 'not-available'
    };
  }

  const estimate = evaluateMarsPlan(session);

  if (!estimate.allSitesSelected) {
    return {
      success: false,
      reason: 'missing-waypoints'
    };
  }

  if (!estimate.affordable) {
    return {
      success: false,
      reason: 'insufficient-battery'
    };
  }

  session.expedition = {
    path: estimate.path.map(
      (position) => [...position]
    ),
    index: 0,
    cost: estimate.cost
  };

  return {
    success: true,
    path: session.expedition.path,
    cost: estimate.cost
  };
}

/**
 * Advances one step of the autonomous animation.
 *
 * Returns the new position or completion status.
 */
export function stepMarsExpedition(session) {
  if (
    session.route !== 'B' ||
    session.status !== 'running' ||
    !session.expedition
  ) {
    return {
      moved: false,
      reason: 'not-running'
    };
  }

  const expedition = session.expedition;

  if (expedition.index >= expedition.path.length) {
    finishSession(session, 'win');

    return {
      moved: false,
      finished: true,
      status: session.status
    };
  }

  const [nx, ny] =
    expedition.path[expedition.index];

  const cost = movementCost(nx, ny);

  if (session.battery < cost) {
    finishSession(
      session,
      'lose',
      'battery-exhausted'
    );

    return {
      moved: false,
      reason: 'battery-exhausted'
    };
  }

  session.x = nx;
  session.y = ny;
  session.battery -= cost;

  session.visited.add(`${nx},${ny}`);

  const site = SCIENCE_SITES.find(
    (item) =>
      samePosition(item.position, [nx, ny])
  );

  if (site) {
    session.scanned.add(site.id);
  }

  expedition.index++;

  const finished =
    expedition.index >= expedition.path.length;

  if (finished) {
    if (
      isAtHabitat(session) &&
      session.scanned.size === SCIENCE_SITES.length
    ) {
      finishSession(session, 'win');
    } else {
      finishSession(
        session,
        'lose',
        'incomplete-expedition'
      );
    }
  }

  return {
    moved: true,
    position: [nx, ny],
    cost,
    battery: session.battery,
    finished,
    status: session.status
  };
}

// ============================================================
// 10. ROUTE C — REMOTE RADAR
// ============================================================

/**
 * Normalizes any angle to 0–359 degrees.
 */
export function normalizeBearing(angle) {
  if (!Number.isFinite(angle)) {
    return 0;
  }

  return ((angle % 360) + 360) % 360;
}

/**
 * Returns the smallest circular angular distance.
 */
export function bearingDifference(a, b) {
  const difference = Math.abs(
    normalizeBearing(a) - normalizeBearing(b)
  );

  return Math.min(
    difference,
    360 - difference
  );
}

/**
 * Updates antenna orientation.
 */
export function aimMarsRadar(session, angle) {
  if (
    session.route !== 'C' ||
    session.status !== 'running'
  ) {
    return false;
  }

  session.bearing = normalizeBearing(angle);

  return true;
}

/**
 * Scans one radar sector.
 *
 * A valid scan requires the correct bearing.
 */
export function scanMarsSector(session, sectorId) {
  if (
    session.route !== 'C' ||
    session.status !== 'running'
  ) {
    return {
      success: false,
      reason: 'not-running'
    };
  }

  const sector = RADAR_SECTORS[sectorId];

  if (!sector) {
    return {
      success: false,
      reason: 'invalid-sector'
    };
  }

  if (session.attempts >= MARS_RECON.maxRadarScans) {
    return {
      success: false,
      reason: 'no-attempts'
    };
  }

  session.attempts++;

  const difference = bearingDifference(
    session.bearing,
    sector.bearing
  );

  const aligned =
    difference <= MARS_RECON.radarTolerance;

  if (aligned) {
    session.readings[sectorId] = sector.signal;
  }

  return {
    success: aligned,
    sector: sector.label,
    signal: aligned ? sector.signal : null,
    difference,
    attempts: session.attempts,
    remaining:
      MARS_RECON.maxRadarScans - session.attempts
  };
}

/**
 * Saves a terrain classification.
 *
 * A sector must be scanned before classification.
 */
export function classifyMarsSector(
  session,
  sectorId,
  terrainType
) {
  if (
    session.route !== 'C' ||
    session.status !== 'running'
  ) {
    return {
      success: false,
      reason: 'not-running'
    };
  }

  const sector = RADAR_SECTORS[sectorId];

  if (!sector) {
    return {
      success: false,
      reason: 'invalid-sector'
    };
  }

  if (!session.readings[sectorId]) {
    return {
      success: false,
      reason: 'not-scanned'
    };
  }

  const correct = terrainType === sector.type;

  session.classified[sectorId] = {
    type: terrainType,
    correct
  };

  const correctCount = getCorrectMarsSectors(session);

  if (correctCount === RADAR_SECTORS.length) {
    finishSession(session, 'win');
  }

  return {
    success: correct,
    sector: sector.label,
    correctCount,
    total: RADAR_SECTORS.length,
    status: session.status
  };
}

export function getCorrectMarsSectors(session) {
  return Object.values(session.classified)
    .filter((item) => item.correct)
    .length;
}

// ============================================================
// 11. MISSION EVALUATION
// ============================================================

/**
 * Returns the outcome for the selected route.
 *
 * Does not change the campaign HUD.
 * The campaign controller applies resource effects.
 */
export function evaluateMarsMission(session) {
  if (session.route === 'A') {
    const returnedHome = isAtHabitat(session);

    const success =
      session.status === 'win' &&
      returnedHome &&
      session.scanned.size === SCIENCE_SITES.length;

    const partial =
      !success &&
      returnedHome &&
      session.scanned.size > 0;

    return {
      route: 'A',
      success,
      partial,
      status: success
        ? 'win'
        : 'lose',
      scanned: session.scanned.size,
      batteryRemaining: session.battery,
      mapQuality: success
        ? 'full'
        : partial
          ? 'partial'
          : 'none'
    };
  }

  if (session.route === 'B') {
    const success =
      session.status === 'win' &&
      isAtHabitat(session) &&
      session.scanned.size === SCIENCE_SITES.length;

    return {
      route: 'B',
      success,
      partial: false,
      status: success ? 'win' : 'lose',
      scanned: session.scanned.size,
      batteryRemaining: session.battery,
      mapQuality: success ? 'full' : 'none'
    };
  }

  const correctCount = getCorrectMarsSectors(session);

  const success =
    session.status === 'win' &&
    correctCount === RADAR_SECTORS.length;

  const partial =
    !success && correctCount >= 2;

  return {
    route: 'C',
    success,
    partial,
    status: success ? 'win' : 'lose',
    classified: correctCount,
    attempts: session.attempts,
    batteryRemaining: null,
    mapQuality:
      success || partial ? 'partial' : 'none'
  };
}
