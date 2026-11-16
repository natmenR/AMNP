/**
 * Punto de entrada de index.html (portada):
 * Play → desaparecen los textos → la nave sube → intro en carta → alerta roja → entra a la cabina.
 */
import { GAME, PAGES, TIMING } from '../config.js';
import { sound } from '../audio/sound.js';
import { buildIntroPages } from '../data/intro.js';
import { setAlert, isAlertOn } from '../ui/alert.js';
import { openLetter } from '../ui/letter.js';
import { initSoundToggle } from '../ui/sound-toggle.js';

const playButton = document.getElementById('play-button');
const intro = document.getElementById('intro');
let started = false;

initSoundToggle(document.getElementById('sound-toggle'));

async function showIntro() {
  document.body.classList.add('is-cruising');
  intro.hidden = false;
  await openLetter({
    container: intro,
    pages: buildIntroPages(GAME.playerName),
    skippable: true,
    finalLabel: 'Respond',
    onShow(index, total) {
      // En el último mensaje (el reto) se enciende la alerta.
      if (index === total - 1 && !isAlertOn()) {
        setAlert(true);
        sound.alarm();
      }
    },
  });
  document.body.classList.add('is-leaving'); // fundido a negro
  setTimeout(() => { window.location.href = PAGES.game; }, TIMING.fadeOutMs);
}

function start() {
  if (started) return;
  started = true;
  sound.init();
  sound.liftOff();
  document.body.classList.add('is-lifting-off'); // textos fuera y la nave sube
  setTimeout(showIntro, TIMING.liftOffMs);
}

playButton.addEventListener('click', start);
document.addEventListener('keydown', (event) => {
  if ((event.key === 'Enter' || event.key === ' ') && !started && document.activeElement?.id !== 'sound-toggle') {
    event.preventDefault();
    start();
  }
});

// Si vuelve con el botón "atrás", dejamos la portada como nueva.
window.addEventListener('pageshow', (event) => { if (event.persisted) window.location.reload(); });
