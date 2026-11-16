import { TIMING } from '../config.js';
import { sound } from '../audio/sound.js';
import { el, focusTitle, mount, sleep } from '../ui/dom.js';

const ZAP_GOAL = 6;
const GAME_DURATION = 18;

export function runShieldZap(container, _config = {}) {
  return new Promise((resolve) => {
    let zapped = 0;
    let timeLeft = GAME_DURATION;
    let ended = false;
    let spawnTimer = null;
    let countdownTimer = null;

    const status = el('p', { class: 'mg-status', role: 'status' });
    const zapCount = el('span', { class: 'sz-count' }, `0 / ${ZAP_GOAL}`);
    const timeBadge = el('span', { class: 'sz-time' }, `${timeLeft}s`);
    const field = el('div', { class: 'sz-field', 'aria-label': 'Shield field — click the space rays!' });
    const skipButton = el('button', { type: 'button', class: 'mg-skip' }, 'Skip (counts as a miss)');

    const root = el(
      'div',
      { class: 'minigame shield-zap' },
      el('h2', { class: 'mg-title', tabindex: '-1' }, 'Shield Zap'),
      el('p', { class: 'mg-help' }, `Space rays are coming! Click or tap each ray to zap it. Block ${ZAP_GOAL} rays before time runs out!`),
      el('div', { class: 'sz-hud' },
        el('span', {}, 'Zapped: ', zapCount),
        timeBadge,
      ),
      field,
      status,
      skipButton,
    );
    mount(container, root);
    focusTitle(root);

    const cleanup = () => {
      clearInterval(spawnTimer);
      clearInterval(countdownTimer);
    };

    const end = async (result) => {
      if (ended) return;
      ended = true;
      cleanup();
      skipButton.disabled = true;
      field.querySelectorAll('.sz-ray').forEach((r) => r.remove());
      if (result === 'win') {
        status.textContent = `Amazing! You blocked all ${ZAP_GOAL} rays! The shield held!`;
        sound.win();
      } else {
        status.textContent = 'Time is up! Some rays got through.';
        sound.lose();
      }
      await sleep(TIMING.minigameEndMs);
      resolve({ result, stats: { zapped, timeLeft: Math.max(0, Math.round(timeLeft)) } });
    };

    const spawnRay = () => {
      if (ended) return;
      const fromLeft = Math.random() < 0.5;
      const topPct = 10 + Math.random() * 80;
      const ray = el('div', {
        class: `sz-ray ${fromLeft ? 'from-left' : 'from-right'}`,
        role: 'button',
        tabindex: '0',
        'aria-label': 'Space ray — click to zap!',
      }, fromLeft ? '>>>' : '<<<');
      ray.style.top = `${topPct}%`;

      const zapRay = () => {
        if (ended || ray.classList.contains('sz-zapped')) return;
        ray.classList.add('sz-zapped');
        sound.good();
        zapped += 1;
        zapCount.textContent = `${zapped} / ${ZAP_GOAL}`;
        setTimeout(() => ray.remove(), 300);
        if (zapped >= ZAP_GOAL) end('win');
      };

      ray.addEventListener('pointerdown', (e) => { e.preventDefault(); zapRay(); });
      ray.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); zapRay(); } });
      field.append(ray);

      setTimeout(() => { if (!ray.classList.contains('sz-zapped')) ray.remove(); }, 3000);
    };

    countdownTimer = setInterval(() => {
      if (ended) return;
      timeLeft -= 1;
      timeBadge.textContent = `${timeLeft}s`;
      if (timeLeft <= 5) timeBadge.classList.add('sz-urgent');
      if (timeLeft <= 0) end('lose');
    }, 1000);

    spawnRay();
    spawnTimer = setInterval(spawnRay, 2000);

    skipButton.addEventListener('click', () => end('lose'));
  });
}
