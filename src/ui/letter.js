/**
 * Carta: cuadro de texto estilo pergamino con efecto de escritura, notas de ciencia,
 * flecha para continuar y puntos de página.
 *
 * @typedef {{ term?: string, text: string }} Note
 * @typedef {{ text: string, notes?: Note[], notesTitle?: string, extra?: () => Node }} LetterPage
 *   - extra: función que devuelve contenido adicional (por ejemplo, chips) que aparece al terminar de escribir.
 */
import { TIMING } from '../config.js';
import { sound } from '../audio/sound.js';
import { el, mount, prefersReducedMotion, svg } from './dom.js';

let activeLetter = null;

function arrowIcon() {
  const rects = [[5, 0, 1, 9], [6, 1, 1, 7], [7, 2, 1, 5], [8, 3, 1, 3], [9, 4, 1, 1], [0, 3, 5, 3]];
  return svg(
    'svg',
    { viewBox: '0 0 10 9', fill: 'currentColor', 'shape-rendering': 'crispEdges', 'aria-hidden': 'true' },
    ...rects.map(([x, y, width, height]) => svg('rect', { x, y, width, height })),
  );
}

/** Cierra la carta que esté abierta (quita sus temporizadores y atajos de teclado). */
export function closeLetter() {
  activeLetter?.dispose();
  activeLetter = null;
}

/**
 * Muestra una secuencia de páginas. La promesa se cumple cuando el jugador pulsa la flecha
 * en la última página.
 *
 * @param {object} options
 * @param {HTMLElement} options.container donde se dibuja la carta
 * @param {LetterPage[]} options.pages
 * @param {string} [options.speaker] quién habla (p. ej. "Ship System")
 * @param {string} [options.finalLabel] texto junto a la flecha en la última página
 * @param {boolean} [options.skippable] muestra la ✕ para saltar a la última página
 * @param {(index: number, total: number) => void} [options.onShow]
 * @returns {Promise<void>}
 */
export function openLetter({ container, pages, speaker, finalLabel = '', skippable = false, onShow }) {
  closeLetter();
  return new Promise((resolve) => {
    const last = pages.length - 1;
    const instant = prefersReducedMotion();
    let index = 0;
    let typing = false;
    let typedLength = 0;
    let timer = null;

    const live = el('p', { class: 'sr', 'aria-live': 'polite' });
    const extraLive = el('p', { class: 'sr', 'aria-live': 'polite' });
    const textEl = el('p', { class: 'letter-text', 'aria-hidden': 'true' });
    const notesEl = el('div', { class: 'letter-notes', 'aria-hidden': 'true' });
    const extraEl = el('div', { class: 'letter-extra' });
    const labelEl = el('span', { class: 'label' });
    const nextButton = el('button', { type: 'button', class: 'letter-next' }, labelEl, arrowIcon());
    const dots = pages.map(() => el('span', { class: 'dot' }));
    const skipButton = skippable
      ? el('button', { type: 'button', class: 'letter-skip', 'aria-label': 'Skip to the last page' }, '\u00D7')
      : null;

    const root = el(
      'div',
      { class: 'letter', role: 'dialog', 'aria-label': speaker ?? 'Message' },
      speaker ? el('span', { class: 'letter-speaker' }, speaker) : null,
      skipButton,
      live, textEl, notesEl, extraEl, extraLive,
      el('div', { class: 'letter-pager', 'aria-hidden': 'true' }, dots),
      nextButton,
    );
    mount(container, root);

    const paintText = (count) => {
      const full = pages[index].text;
      textEl.replaceChildren(el('span', {}, full.slice(0, count)), el('span', { class: 'hidden-text' }, full.slice(count)));
    };

    const finishTyping = () => {
      clearTimeout(timer);
      typing = false;
      paintText(pages[index].text.length);
      notesEl.removeAttribute('data-hidden');
      extraEl.removeAttribute('data-hidden');
      const extraText = extraEl.textContent?.trim();
      if (extraText) extraLive.textContent = extraText;
    };

    const typeNext = () => {
      const text = pages[index].text;
      if (typedLength >= text.length) { finishTyping(); return; }
      typedLength += 1;
      paintText(typedLength);
      const char = text[typedLength - 1];
      if (char !== ' ' && typedLength % 3 === 0) sound.tick();
      const pause = '.!?'.includes(char) ? 220 : char === ',' ? 100 : 0;
      timer = setTimeout(typeNext, TIMING.typeMsPerChar + pause);
    };

    const showPage = () => {
      const page = pages[index];
      const notes = page.notes ?? [];
      dots.forEach((dot, i) => dot.classList.toggle('active', i === index));
      notesEl.replaceChildren(
        ...(notes.length
          ? [el('p', { class: 'notes-title' }, page.notesTitle ?? 'Quick science'),
             ...notes.map((n) => el('p', {}, n.term ? el('b', {}, `${n.term}: `) : null, n.text))]
          : []),
      );
      notesEl.style.display = notes.length ? '' : 'none';
      notesEl.setAttribute('data-hidden', '');
      extraEl.replaceChildren(...(page.extra ? [page.extra()] : []));
      extraEl.setAttribute('data-hidden', '');
      extraLive.textContent = '';
      live.textContent = `Page ${index + 1} of ${pages.length}. ${page.text}${notes.map((n) => ` ${page.notesTitle ?? 'Quick science'}. ${n.term ? `${n.term}: ` : ''}${n.text}`).join('')}`;
      labelEl.textContent = index === last ? finalLabel : '';
      nextButton.setAttribute('aria-label', index === last ? (finalLabel || 'Continue') : 'Next page');
      if (skipButton) skipButton.style.display = index === last ? 'none' : '';
      typedLength = 0;
      onShow?.(index, pages.length);
      if (instant) { finishTyping(); return; }
      typing = true;
      paintText(0);
      timer = setTimeout(typeNext, 250);
    };

    const advance = () => {
      if (typing) { finishTyping(); return; }
      sound.page();
      if (index < last) { index += 1; showPage(); return; }
      closeLetter();
      resolve();
    };

    const skipToEnd = () => {
      sound.page();
      clearTimeout(timer);
      typing = false;
      index = last;
      showPage();
      finishTyping();
    };

    const onKey = (event) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (/^(BUTTON|A|INPUT)$/.test(event.target?.tagName ?? '')) return; // un botón enfocado ya reacciona a Enter/Espacio
      if (['Enter', ' ', 'ArrowRight'].includes(event.key)) { event.preventDefault(); advance(); }
    };

    nextButton.addEventListener('click', advance);
    skipButton?.addEventListener('click', skipToEnd);
    document.addEventListener('keydown', onKey);
    activeLetter = { dispose() { clearTimeout(timer); document.removeEventListener('keydown', onKey); } };

    showPage();
    nextButton.focus({ preventScroll: true });
  });
}
