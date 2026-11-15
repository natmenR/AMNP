import { sound } from '../audio/sound.js';

/** Conecta el botón "Sound: on/off". @param {HTMLElement} button */
export function initSoundToggle(button) {
  const paint = () => {
    button.textContent = `Sound: ${sound.isMuted() ? 'off' : 'on'}`;
    button.setAttribute('aria-pressed', String(!sound.isMuted()));
  };
  button.addEventListener('click', () => { sound.toggle(); paint(); });
  paint();
}
