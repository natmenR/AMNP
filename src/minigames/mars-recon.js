
/**
 * 980 DAYS: MISSION MARS
 * ROUND 02 — MARS TERRAIN RECONNAISSANCE
 *
 * Visual interface for:
 * A — Manual rover driving
 * B — Autonomous route planning
 * C — Remote terrain mapping
 *
 * Uses the shared game model and repository UI utilities.
 */

import { TIMING } from '../config.js';
import { sound } from '../audio/sound.js';
import { el, focusTitle, mount, sleep } from '../ui/dom.js';

import {
  MARS_RECON,
  MARS_MAP,
  SCIENCE_SITES,
  RADAR_SECTORS,
  INITIAL_BATTERY,
  createMarsSession,
  isPassable,
  isRocky,
  isAtHabitat,
  moveMarsRover,
  scanMarsSite,
  toggleMarsWaypoint,
  evaluateMarsPlan,
  startMarsExpedition,
  stepMarsExpedition,
  aimMarsRadar,
  scanMarsSector,
  classifyMarsSector,
  getCorrectMarsSectors,
  endMarsSession,
  evaluateMarsMission,
} from './mars-recon-model.js';

// ============================================================
// 1. VISUAL CONFIGURATION
// ============================================================

const VIEW = {
  width: 960,
  height: 590,
  tile: MARS_RECON.tileSize,
  offsetX: 43,
  offsetY: 38,
  animationDelay: 75,
};

const ROUTES = {
  A: {
    title: 'Manual rover driving',
    subtitle: 'Drive, scan, and return',
    help:
      'Use WASD or arrow keys to drive. Press Space to scan ' +
      'each science site. Return to the habitat safely.',
  },

  B: {
    title: 'Autonomous route planning',
    subtitle: 'Plan a safe expedition',
    help:
      'Select all three science sites in order. Review ' +
      'the battery estimate, then execute your plan.',
  },

  C: {
    title: 'Remote terrain mapping',
    subtitle: 'Radar reconnaissance',
    help:
      'Align the antenna, scan four sectors, and classify ' +
      'the terrain. You have eight scan attempts.',
  },
};

const COLORS = {
  background: '#291d25',
  sand: '#b27659',
  sandDetail: '#d39b75',
  rocky: '#805147',
  rockDetail: '#c58a68',
  obstacle: '#3e343c',
  obstacleDetail: '#5b4546',
  habitat: '#72e7ed',
  science: '#ffcf79',
  scanned: '#7de7a9',
  rover: '#f4f6e8',
  roverDark: '#17263a',
  text: '#f7d9b2',
  radar: '#112b36',
  radarLine: '#6bc6c5',
};

// ============================================================
// 2. CANVAS UTILITIES
// ============================================================

function drawBadge(ctx, x, y, color, label) {
  const tile = VIEW.tile;
  const px = x * tile + tile / 2;
  const py = y * tile + tile / 2;

  ctx.save();

  ctx.shadowColor = color;
  ctx.shadowBlur = 15;

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(px, py, 16, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.fillStyle = '#142333';
  ctx.font = 'bold 17px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(label, px, py + 6);

  ctx.restore();
}

function drawTerrainTile(ctx, x, y) {
  const size = VIEW.tile;
  const px = x * size;
  const py = y * size;

  const passable = isPassable(x, y);
  const rocky = isRocky(x, y);

  ctx.fillStyle = !passable
    ? COLORS.obstacle
    : rocky
      ? COLORS.rocky
      : COLORS.sand;

  ctx.fillRect(px + 1, py + 1, size - 2, size - 2);

  if (!passable) {
    ctx.fillStyle = COLORS.obstacleDetail;

    ctx.beginPath();
    ctx.moveTo(px + 4, py + 35);
    ctx.lineTo(px + 13, py + 8);
    ctx.lineTo(px + 32, py + 4);
    ctx.lineTo(px + 42, py + 29);
    ctx.lineTo(px + 28, py + 42);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#98736b';
    ctx.stroke();
    return;
  }

  ctx.fillStyle = rocky
    ? COLORS.rockDetail
    : COLORS.sandDetail;

  for (let i = 0; i < 3; i++) {
    const dx = (x * 13 + y * 7 + i * 17) % 37;
    const dy = (y * 19 + x * 5 + i * 11) % 36;

    ctx.fillRect(px + dx + 5, py + dy + 5, 3, 2);
  }
}

function drawGrid(ctx) {
  const size = VIEW.tile;

  ctx.strokeStyle = '#ffffff12';
  ctx.lineWidth = 1;

  for (let x = 0; x <= MARS_RECON.width; x++) {
    ctx.beginPath();
    ctx.moveTo(x * size, 0);
    ctx.lineTo(x * size, MARS_RECON.height * size);
    ctx.stroke();
  }

  for (let y = 0; y <= MARS_RECON.height; y++) {
    ctx.beginPath();
    ctx.moveTo(0, y * size);
    ctx.lineTo(MARS_RECON.width * size, y * size);
    ctx.stroke();
  }
}

function drawRover(ctx, x, y) {
  const size = VIEW.tile;
  const px = x * size + size / 2;
  const py = y * size + size / 2;

  ctx.save();
  ctx.translate(px, py);

  ctx.shadowColor = '#0a0e16';
  ctx.shadowBlur = 11;

  ctx.fillStyle = COLORS.rover;
  ctx.fillRect(-13, -10, 26, 20);

  ctx.fillStyle = COLORS.roverDark;
  ctx.fillRect(-10, -7, 20, 14);

  ctx.fillStyle = '#f6c981';
  ctx.fillRect(-5, -5, 10, 10);

  ctx.fillStyle = '#182638';
  ctx.fillRect(-17, -12, 6, 8);
  ctx.fillRect(11, -12, 6, 8);
  ctx.fillRect(-17, 4, 6, 8);
  ctx.fillRect(11, 4, 6, 8);

  ctx.restore();
}

function drawPlannedPath(ctx, session) {
  if (session.route !== 'B' || session.plan.length === 0) {
    return;
  }

  const estimate = evaluateMarsPlan(session);
  const size = VIEW.tile;

  ctx.save();

  ctx.strokeStyle = '#7be7e5';
  ctx.lineWidth = 5;
  ctx.setLineDash([8, 7]);

  ctx.beginPath();

  ctx.moveTo(
    MARS_RECON.home[0] * size + size / 2,
    MARS_RECON.home[1] * size + size / 2
  );

  for (const [x, y] of estimate.path) {
    ctx.lineTo(
      x * size + size / 2,
      y * size + size / 2
    );
  }

  ctx.stroke();
  ctx.restore();
}

// ============================================================
// 3. TERRAIN RENDERER
// ============================================================

function drawTerrain(ctx, session) {
  ctx.save();

  ctx.translate(VIEW.offsetX, VIEW.offsetY);

  for (let y = 0; y < MARS_RECON.height; y++) {
    for (let x = 0; x < MARS_RECON.width; x++) {
      drawTerrainTile(ctx, x, y);
    }
  }

  drawGrid(ctx);
  drawPlannedPath(ctx, session);

  drawBadge(
    ctx,
    ...MARS_RECON.home,
    COLORS.habitat,
    'H'
  );

  for (const site of SCIENCE_SITES) {
    const scanned = session.scanned.has(site.id);

    drawBadge(
      ctx,
      ...site.position,
      scanned ? COLORS.scanned : COLORS.science,
      scanned ? '✓' : String(site.id + 1)
    );
  }

  drawRover(ctx, session.x, session.y);

  ctx.restore();

  ctx.fillStyle = COLORS.text;
  ctx.font = 'bold 16px monospace';

  ctx.textAlign = 'left';
  ctx.fillText('MARS SURFACE · SOL 264', 43, 568);

  ctx.textAlign = 'right';
  ctx.fillText(
    session.route === 'A'
      ? 'MANUAL CONTROL'
      : 'AUTONOMOUS NAVIGATION',
    917,
    568
  );
}

// ============================================================
// 4. RADAR RENDERER
// ============================================================

function drawRadar(ctx, session) {
  const centerX = 470;
  const centerY = 283;
  const radius = 210;

  ctx.fillStyle = COLORS.radar;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius + 22, 0, Math.PI * 2);
  ctx.fill();

  // Concentric rings
  for (let ring = 1; ring <= 4; ring++) {
    ctx.strokeStyle = '#6bc6c533';
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.arc(
      centerX,
      centerY,
      (radius * ring) / 4,
      0,
      Math.PI * 2
    );
    ctx.stroke();
  }

  // Direction lines
  for (let angle = 0; angle < 360; angle += 30) {
    const radians = ((angle - 90) * Math.PI) / 180;

    ctx.strokeStyle = '#6bc6c52a';

    ctx.beginPath();
    ctx.moveTo(centerX, centerY);

    ctx.lineTo(
      centerX + radius * Math.cos(radians),
      centerY + radius * Math.sin(radians)
    );

    ctx.stroke();
  }

  // Sector markers
  for (const sector of RADAR_SECTORS) {
    const radians =
      ((sector.bearing - 90) * Math.PI) / 180;

    const x = centerX + 175 * Math.cos(radians);
    const y = centerY + 175 * Math.sin(radians);

    const correct =
      session.classified[sector.id]?.correct;

    ctx.fillStyle = correct
      ? COLORS.scanned
      : COLORS.science;

    ctx.beginPath();
    ctx.arc(x, y, 18, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#182839';
    ctx.textAlign = 'center';
    ctx.font = 'bold 18px monospace';

    ctx.fillText(
      correct ? '✓' : sector.label,
      x,
      y + 6
    );
  }

  // Antenna beam
  const radians =
    ((session.bearing - 90) * Math.PI) / 180;

  ctx.strokeStyle = '#75edf1';
  ctx.lineWidth = 5;

  ctx.beginPath();
  ctx.moveTo(centerX, centerY);

  ctx.lineTo(
    centerX + radius * Math.cos(radians),
    centerY + radius * Math.sin(radians)
  );

  ctx.stroke();

  ctx.fillStyle = '#a2f2f4';
  ctx.beginPath();
  ctx.arc(centerX, centerY, 9, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = COLORS.text;
  ctx.font = 'bold 16px monospace';

  ctx.textAlign = 'left';
  ctx.fillText('REMOTE RADAR · HABITAT', 35, 552);

  ctx.textAlign = 'right';
  ctx.fillText(
    `BEARING ${Math.round(session.bearing)}°`,
    917,
    552
  );
}

// ============================================================
// 5. SHARED CANVAS RENDERER
// ============================================================

function renderCanvas(ctx, session) {
  ctx.clearRect(0, 0, VIEW.width, VIEW.height);

  ctx.fillStyle = COLORS.background;
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);

  if (session.route === 'C') {
    drawRadar(ctx, session);
  } else {
    drawTerrain(ctx, session);
  }
}

// ============================================================
// 6. GAME INTERFACE
// ============================================================

/**
 * Runs one of the three Mars reconnaissance activities.
 *
 * @param {HTMLElement} container
 * @param {{route?: 'A'|'B'|'C'}} config
 * @returns {Promise<{result: 'win'|'lose', stats: object}>}
 */
export function runMarsRecon(container, { route = 'A' } = {}) {
  return new Promise((resolve) => {
    const selectedRoute = ROUTES[route] ? route : 'A';
    const session = createMarsSession(selectedRoute);
    const info = ROUTES[selectedRoute];

    let ended = false;
    let busy = false;
    let animationFrame = null;
    let holdTimer = null;

    // --------------------------------------------------------
    // Interface elements
    // --------------------------------------------------------

    const title = el(
      'h2',
      { class: 'mg-title', tabindex: '-1' },
      info.title
    );

    const help = el(
      'p',
      { class: 'mg-help' },
      info.help
    );

    const canvas = el('canvas', {
      class: 'mars-canvas',
      width: VIEW.width,
      height: VIEW.height,
      'aria-label': 'Mars reconnaissance terrain map'
    });

    const ctx = canvas.getContext('2d');

    const status = el(
      'p',
      {
        class: 'mg-status mars-status',
        role: 'status',
        'aria-live': 'polite'
      },
      'AURA: Mission systems ready.'
    );

    const batteryLabel = el(
      'span',
      { class: 'mars-stat-value' },
      ''
    );

    const batteryFill = el('div', {
      class: 'fill mars-battery-fill'
    });

    const batteryBar = el(
      'div',
      {
        class: 'bar',
        role: 'progressbar',
        'aria-label': 'Rover battery',
        'aria-valuemin': '0',
        'aria-valuemax': String(INITIAL_BATTERY)
      },
      batteryFill
    );

    const batteryPanel = el(
      'div',
      { class: 'mars-stat' },
      el(
        'div',
        { class: 'mars-stat-heading' },
        el('span', {}, 'ROVER BATTERY'),
        batteryLabel
      ),
      batteryBar
    );

    const progressLabel = el(
      'span',
      { class: 'mars-stat-value' },
      ''
    );

    const progressFill = el('div', {
      class: 'fill mars-progress-fill'
    });

    const progressBar = el(
      'div',
      {
        class: 'bar',
        role: 'progressbar',
        'aria-label': 'Mission progress',
        'aria-valuemin': '0',
        'aria-valuemax': selectedRoute === 'C' ? '4' : '3'
      },
      progressFill
    );

    const progressPanel = el(
      'div',
      { class: 'mars-stat' },
      el(
        'div',
        { class: 'mars-stat-heading' },
        el(
          'span',
          {},
          selectedRoute === 'C'
            ? 'SECTORS CLASSIFIED'
            : 'SCIENCE SITES'
        ),
        progressLabel
      ),
      progressBar
    );

    const controls = el('div', {
      class: 'mars-controls'
    });

    const skipButton = el(
      'button',
      {
        type: 'button',
        class: 'mg-skip mars-end'
      },
      'End & review (counts as a miss)'
    );

    const sidebar = el(
      'aside',
      { class: 'mars-sidebar' },
      el(
        'p',
        { class: 'mars-subtitle' },
        info.subtitle
      ),
      batteryPanel,
      progressPanel,
      controls,
      status,
      skipButton
    );

    if (selectedRoute === 'C') {
      batteryPanel.hidden = true;
    }

    const root = el(
      'div',
      {
        class: 'minigame mars-recon',
        'data-route': selectedRoute
      },
      title,
      help,
      el(
        'div',
        { class: 'mars-layout' },
        el(
          'div',
          { class: 'mars-board' },
          canvas,
          el(
            'p',
            { class: 'mars-legend' },
            'H = Habitat · 1–3 = Science sites · ' +
            'Dark rocks = Obstacles'
          )
        ),
        sidebar
      )
    );

    mount(container, root);
    focusTitle(root);

    // --------------------------------------------------------
    // Shared utilities
    // --------------------------------------------------------

    function message(text) {
      status.textContent = `AURA: ${text}`;
    }

    function render() {
      if (ended) return;

      renderCanvas(ctx, session);

      const batteryPercent =
        (session.battery / INITIAL_BATTERY) * 100;

      batteryLabel.textContent =
        `${session.battery} / ${INITIAL_BATTERY}`;

      batteryFill.style.width =
        `${Math.max(0, batteryPercent)}%`;

      batteryBar.setAttribute(
        'aria-valuenow',
        String(session.battery)
      );

      let progress = 0;
      let total = 3;

      if (selectedRoute === 'A') {
        progress = session.scanned.size;
      } else if (selectedRoute === 'B') {
        progress = session.scanned.size;
      } else {
        progress = getCorrectMarsSectors(session);
        total = 4;
      }

      progressLabel.textContent = `${progress} / ${total}`;

      progressFill.style.width =
        `${(progress / total) * 100}%`;

      progressBar.setAttribute(
        'aria-valuenow',
        String(progress)
      );
    }

    function stopMovement() {
      if (holdTimer !== null) {
        clearInterval(holdTimer);
        holdTimer = null;
      }
    }

    function cleanup() {
      stopMovement();

      if (animationFrame !== null) {
        cancelAnimationFrame(animationFrame);
        animationFrame = null;
      }

      document.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerup', stopMovement);
      window.removeEventListener('blur', stopMovement);
    }

    async function finish() {
      if (ended) return;

      ended = true;
      cleanup();

      const evaluation = evaluateMarsMission(session);

      const result = evaluation.status;

      skipButton.disabled = true;

      controls.querySelectorAll('button, select, input')
        .forEach((element) => {
          element.disabled = true;
        });

      if (result === 'win') {
        message('Mission accomplished. Reconnaissance complete.');
        sound.win();
      } else {
        message('Mission ended. Reviewing available survey data.');
        sound.lose();
      }

      await sleep(TIMING.minigameEndMs);

      resolve({
        result,
        stats: {
          ...evaluation,
          route: selectedRoute,
          reason: session.reason
        }
      });
    }

    function checkCompletion() {
      if (session.status !== 'running') {
        finish();
        return true;
      }

      return false;
    }

    // ========================================================
    // 7. ROUTE A — MANUAL DRIVING
    // ========================================================

    function move(dx, dy) {
      if (
        ended ||
        busy ||
        selectedRoute !== 'A'
      ) {
        return;
      }

      const result = moveMarsRover(session, dx, dy);

      if (!result.moved) {
        const messages = {
          obstacle: 'Obstacle ahead. Choose another corridor.',
          'battery-exhausted': 'Rover battery exhausted.',
          'invalid-direction': 'Invalid movement command.'
        };

        message(
          messages[result.reason] ??
          'Movement unavailable.'
        );

        render();
        checkCompletion();
        return;
      }

      sound.thrust();

      if (result.reserveWarning) {
        message(
          'WARNING: Battery reserve is below ' +
          'the estimated return requirement!'
        );
      } else if (result.site) {
        message(
          `Site ${result.site} reached. ` +
          'Press Space to scan.'
        );
      } else if (isAtHabitat(session)) {
        message('Rover returned to habitat.');
      } else {
        message(
          `Rover moved. Battery cost: ${result.cost}.`
        );
      }

      render();
      checkCompletion();
    }

    function scan() {
      if (
        ended ||
        selectedRoute !== 'A'
      ) {
        return;
      }

      const result = scanMarsSite(session);

      if (result.success) {
        sound.good();

        message(
          `Site ${result.site} scanned. ` +
          `${result.remaining} sites remaining.`
        );
      } else {
        sound.bad();

        message(
          result.reason === 'already-scanned'
            ? 'This site has already been scanned.'
            : 'Move onto a science marker before scanning.'
        );
      }

      render();
    }

    function createMoveButton(symbol, dx, dy, label) {
      const button = el(
        'button',
        {
          type: 'button',
          class: 'mg-button mars-arrow',
          'aria-label': label
        },
        symbol
      );

      button.addEventListener('pointerdown', (event) => {
        if (ended) return;

        event.preventDefault();

        stopMovement();
        move(dx, dy);

        holdTimer = setInterval(() => {
          move(dx, dy);
        }, 145);
      });

      [
        'pointerup',
        'pointerleave',
        'pointercancel'
      ].forEach((eventName) => {
        button.addEventListener(eventName, stopMovement);
      });

      return button;
    }

    function setupManualControls() {
      const up = createMoveButton('↑', 0, -1, 'Move up');
      const left = createMoveButton('←', -1, 0, 'Move left');
      const down = createMoveButton('↓', 0, 1, 'Move down');
      const right = createMoveButton('→', 1, 0, 'Move right');

      const arrows = el(
        'div',
        { class: 'mars-arrows' },
        el('span'),
        up,
        el('span'),
        left,
        down,
        right
      );

      const scanButton = el(
        'button',
        {
          type: 'button',
          class: 'mg-button mars-action'
        },
        'SCAN SITE · SPACE'
      );

      scanButton.addEventListener('click', scan);

      controls.append(
        el(
          'p',
          { class: 'mars-control-label' },
          'MANUAL ROVER CONTROLS'
        ),
        arrows,
        scanButton
      );
    }

    // ========================================================
    // 8. ROUTE B — AUTONOMOUS PLANNING
    // ========================================================

    function setupPlannerControls() {
      const choices = el(
        'div',
        { class: 'mars-waypoints' }
      );

      const estimate = el(
        'p',
        { class: 'mars-reading' }
      );

      const executeButton = el(
        'button',
        {
          type: 'button',
          class: 'mg-button mars-action'
        },
        'EXECUTE PLAN'
      );

      const clearButton = el(
        'button',
        {
          type: 'button',
          class: 'mg-button'
        },
        'CLEAR PLAN'
      );

      function renderPlanner() {
        choices.replaceChildren();

        for (const site of SCIENCE_SITES) {
          const position = session.plan.indexOf(site.id);
          const selected = position !== -1;

          const button = el(
            'button',
            {
              type: 'button',
              class: `mars-waypoint${selected ? ' selected' : ''}`
            },
            el('strong', {}, `SITE ${site.name}`),
            el(
              'span',
              {},
              selected ? `#${position + 1}` : '+ ADD'
            )
          );

          button.disabled = busy || ended;

          button.addEventListener('click', () => {
            if (busy || ended) return;

            toggleMarsWaypoint(session, site.id);
            sound.good();

            renderPlanner();
            render();
          });

          choices.append(button);
        }

        const plan = evaluateMarsPlan(session);

        estimate.textContent =
          `Estimated power: ${plan.cost} / ` +
          `${INITIAL_BATTERY} · Includes return trip`;

        executeButton.disabled =
          busy || ended || !plan.valid;

        clearButton.disabled =
          busy || ended || session.plan.length === 0;
      }

      function animateExpedition() {
        let lastFrame = 0;

        function stepFrame(timestamp) {
          if (ended || !busy) return;

          if (timestamp - lastFrame >= VIEW.animationDelay) {
            lastFrame = timestamp;

            const result = stepMarsExpedition(session);

            render();

            if (result.finished) {
              busy = false;
              animationFrame = null;

              if (!checkCompletion()) {
                message('Expedition ended without completion.');
              }

              return;
            }

            if (session.status !== 'running') {
              busy = false;
              animationFrame = null;
              checkCompletion();
              return;
            }
          }

          animationFrame = requestAnimationFrame(stepFrame);
        }

        animationFrame = requestAnimationFrame(stepFrame);
      }

      executeButton.addEventListener('click', () => {
        if (busy || ended) return;

        const result = startMarsExpedition(session);

        if (!result.success) {
          sound.bad();
          message('The planned route cannot be executed.');
          return;
        }

        busy = true;
        sound.good();

        message(
          'Autonomous rover expedition in progress.'
        );

        renderPlanner();
        animateExpedition();
      });

      clearButton.addEventListener('click', () => {
        if (busy || ended) return;

        session.plan = [];

        renderPlanner();
        render();
      });

      controls.append(
        el(
          'p',
          { class: 'mars-control-label' },
          'SELECT SCIENCE WAYPOINTS'
        ),
        choices,
        estimate,
        executeButton,
        clearButton
      );

      renderPlanner();
    }

    // ========================================================
    // 9. ROUTE C — REMOTE RADAR
    // ========================================================

    function setupRadarControls() {
      const sectorSelect = el(
        'select',
        {
          class: 'mars-select',
          'aria-label': 'Radar sector'
        },
        ...RADAR_SECTORS.map((sector) =>
          el(
            'option',
            { value: String(sector.id) },
            `Sector ${sector.label}`
          )
        )
      );

      const bearingLabel = el(
        'strong',
        { class: 'mars-bearing' },
        '0°'
      );

      const bearingSlider = el('input', {
        type: 'range',
        class: 'mars-slider',
        min: '0',
        max: '359',
        step: '1',
        value: '0',
        'aria-label': 'Antenna bearing'
      });

      const sectorHint = el(
        'p',
        { class: 'mars-reading' }
      );

      const radarReading = el(
        'p',
        { class: 'mars-reading' },
        'No valid signal recorded.'
      );

      const scanButton = el(
        'button',
        {
          type: 'button',
          class: 'mg-button mars-action'
        },
        'SCAN SECTOR'
      );

      const classification = el(
        'select',
        {
          class: 'mars-select',
          'aria-label': 'Terrain classification'
        },
        ...[
          'regolith',
          'rock',
          'dune',
          'slope'
        ].map((type) =>
          el(
            'option',
            { value: type },
            type.toUpperCase()
          )
        )
      );

      const saveButton = el(
        'button',
        {
          type: 'button',
          class: 'mg-button'
        },
        'SAVE CLASSIFICATION'
      );

      function selectedSector() {
        return Number(sectorSelect.value);
      }

      function renderRadarControls() {
        const sector = RADAR_SECTORS[selectedSector()];

        bearingLabel.textContent =
          `${Math.round(session.bearing)}°`;

        sectorHint.textContent =
          `Sector ${sector.label}: signal near ` +
          `${sector.bearing}° (±${MARS_RECON.radarTolerance}°). ` +
          `Scans remaining: ${
            MARS_RECON.maxRadarScans - session.attempts
          }`;

        radarReading.textContent =
          session.readings[sector.id]
            ? `SIGNAL: ${session.readings[sector.id]}`
            : 'No valid signal recorded for this sector.';

        scanButton.disabled =
          ended ||
          session.attempts >= MARS_RECON.maxRadarScans;

        saveButton.disabled =
          ended || !session.readings[sector.id];
      }

      bearingSlider.addEventListener('input', () => {
        if (ended) return;

        aimMarsRadar(
          session,
          Number(bearingSlider.value)
        );

        renderRadarControls();
        render();
      });

      sectorSelect.addEventListener('change', () => {
        renderRadarControls();
        render();
      });

      scanButton.addEventListener('click', () => {
        if (ended) return;

        const result = scanMarsSector(
          session,
          selectedSector()
        );

        if (result.success) {
          sound.good();
          message(
            'Radar signal acquired. Classify the terrain.'
          );
        } else {
          sound.bad();
          message(
            'Weak signal. Adjust the antenna bearing.'
          );
        }

        renderRadarControls();
        render();
      });

      saveButton.addEventListener('click', () => {
        if (ended) return;

        const result = classifyMarsSector(
          session,
          selectedSector(),
          classification.value
        );

        if (result.success) {
          sound.good();

          message(
            `Correct terrain classification. ` +
            `${result.correctCount}/4 sectors complete.`
          );
        } else {
          sound.bad();

          message(
            'Classification mismatch. Review the signal.'
          );
        }

        renderRadarControls();
        render();

        checkCompletion();
      });

      controls.append(
        el(
          'p',
          { class: 'mars-control-label' },
          'RADAR ALIGNMENT'
        ),
        sectorSelect,
        el(
          'div',
          { class: 'mars-stat-heading' },
          el('span', {}, 'ANTENNA BEARING'),
          bearingLabel
        ),
        bearingSlider,
        sectorHint,
        scanButton,
        radarReading,
        el(
          'p',
          { class: 'mars-control-label' },
          'TERRAIN CLASSIFICATION'
        ),
        classification,
        saveButton
      );

      renderRadarControls();
    }

    // ========================================================
    // 10. KEYBOARD CONTROLS
    // ========================================================

    const KEY_DIRECTIONS = {
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      w: [0, -1],
      s: [0, 1],
      a: [-1, 0],
      d: [1, 0]
    };

    function onKey(event) {
      if (
        ended ||
        busy ||
        selectedRoute !== 'A' ||
        event.repeat ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey
      ) {
        return;
      }

      const tag = event.target?.tagName;

      if (
        ['INPUT', 'SELECT', 'TEXTAREA'].includes(tag)
      ) {
        return;
      }

      const key = event.key.length === 1
        ? event.key.toLowerCase()
        : event.key;

      const direction = KEY_DIRECTIONS[key];

      if (direction) {
        event.preventDefault();
        move(...direction);
        return;
      }

      if (event.code === 'Space') {
        event.preventDefault();
        scan();
      }
    }

    // ========================================================
    // 11. INITIALIZATION AND END
    // ========================================================

    skipButton.addEventListener('click', () => {
      if (ended) return;

      endMarsSession(session);
      finish();
    });

    if (selectedRoute === 'A') {
      setupManualControls();
    } else if (selectedRoute === 'B') {
      setupPlannerControls();
    } else {
      setupRadarControls();
    }

    document.addEventListener('keydown', onKey);
    window.addEventListener('pointerup', stopMovement);
    window.addEventListener('blur', stopMovement);

    render();
  });
}

// ============================================================
// 12. ROUTE-SPECIFIC EXPORTS
// ============================================================

export function runMarsRoverDrive(container, config = {}) {
  return runMarsRecon(container, {
    ...config,
    route: 'A'
  });
}

export function runMarsRoutePlanner(container, config = {}) {
  return runMarsRecon(container, {
    ...config,
    route: 'B'
  });
}

export function runMarsRadarScan(container, config = {}) {
  return runMarsRecon(container, {
    ...config,
    route: 'C'
  });
}
