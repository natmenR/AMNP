/** Reacciones del astronauta en la cabina. @param {HTMLElement|null} node */
export function createAstronaut(node) {
  return {
    /** @param {'happy'|'hit'} mood */
    react(mood) {
      if (!node) return;
      node.classList.remove('is-happy', 'is-hit');
      void node.offsetWidth; // reinicia la animación
      node.classList.add(mood === 'happy' ? 'is-happy' : 'is-hit');
    },
  };
}
