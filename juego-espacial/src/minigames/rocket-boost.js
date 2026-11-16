import { TIMING } from '../config.js';
import { sound } from '../audio/sound.js';
import { el, focusTitle, mount, sleep } from '../ui/dom.js';

const HITS_NEEDED = 3;
const MAX_MISSES = 3;
const NEEDLE_SPEED = 65;

export function runRocketBoost(container, _config = {}) {
  return new Promise((resolve) => {
    let needlePos = 15;
    let direction = 1;
    let hits = 0;
    let misses = 0;
    let frame = 0;
    let last = performance.now();
    let ended = false;

    const ZONE_MIN = 38;
    const ZONE_MAX = 62;

    const hitStars = el('span', { class: 'rb-stars' });
    const missMarks = el('span', { class: 'rb-misses' });
    const feedback = el('p', { class: 'mg-feedback', role: 'status' }, 'Press BLAST OFF when the needle is in the green zone!');
    const needle = el('div', { class: 'rb-needle', 'aria-hidden': 'true' });
    const meter = el('div', { class: 'rb-meter', 'aria-label': 'Power meter', role: 'img' },
      el('div', { class: 'rb-zone' }),
      needle,
    );
    const boostBtn = el('button', { type: 'button', class: 'rb-boost-btn' }, 'BLAST OFF!');
    const skipButton = el('button', { type: 'button', class: 'mg-skip' }, 'Skip (counts as a miss)');

    const renderHits = () => {
      hitStars.textContent = `Boosts: ${hits} / ${HITS_NEEDED}`;
      missMarks.textContent = `Misses: ${misses} / ${MAX_MISSES}`;
    };
    renderHits();

    const root = el(
      'div',
      { class: 'minigame rocket-boost' },
      el('h2', { class: 'mg-title', tabindex: '-1' }, 'Rocket Boost'),
      el('p', { class: 'mg-help' }, `Press BLAST OFF ${HITS_NEEDED} times when the needle lands in the green zone to blast home!`),
      el('div', { class: 'rb-scoreboard' }, hitStars, missMarks),
      meter,
      boostBtn,
      feedback,
      skipButton,
    );
    mount(container, root);
    focusTitle(root);
    boostBtn.focus();

    const cleanup = () => { cancelAnimationFrame(frame); };

    const end = async (result) => {
      if (ended) return;
      ended = true;
      cleanup();
      boostBtn.disabled = true;
      skipButton.disabled = true;
      if (result === 'win') {
        feedback.textContent = `${HITS_NEEDED} perfect boosts! Blasting off - heading HOME!`;
        sound.win();
      } else {
        feedback.textContent = 'Too many misses! The engine sputtered out.';
        sound.lose();
      }
      await sleep(TIMING.minigameEndMs);
      resolve({ result, stats: { hits, misses } });
    };

    const tryBoost = () => {
      if (ended) return;
      const inZone = needlePos >= ZONE_MIN && needlePos <= ZONE_MAX;
      if (inZone) {
        hits += 1;
        sound.good();
        needle.classList.add('rb-hit');
        setTimeout(() => needle.classList.remove('rb-hit'), 300);
        feedback.textContent = hits < HITS_NEEDED
          ? `Nice boost! ${HITS_NEEDED - hits} more to go!`
          : '';
        renderHits();
        if (hits >= HITS_NEEDED) end('win');
      } else {
        misses += 1;
        sound.bad();
        needle.classList.add('rb-miss');
        setTimeout(() => needle.classList.remove('rb-miss'), 300);
        feedback.textContent = `Miss! Try again - ${MAX_MISSES - misses} chances left.`;
        renderHits();
        if (misses >= MAX_MISSES) end('lose');
      }
    };

    const loop = (now) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      needlePos += direction * NEEDLE_SPEED * dt;
      if (needlePos >= 100) { needlePos = 100; direction = -1; }
      if (needlePos <= 0) { needlePos = 0; direction = 1; }
      needle.style.left = `${needlePos}%`;
      if (!ended) frame = requestAnimationFrame(loop);
    };

    boostBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); tryBoost(); });
    boostBtn.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tryBoost(); } });
    document.addEventListener('keydown', function onKey(e) {
      if (ended) { document.removeEventListener('keydown', onKey); return; }
      if (e.key === ' ' && document.activeElement !== boostBtn) { e.preventDefault(); tryBoost(); }
    });
    skipButton.addEventListener('click', () => end('lose'));

    frame = requestAnimationFrame((now) => { last = now; loop(now); });
  });
}
