/**
 * Utilidades para construir elementos del DOM de forma SEGURA.
 * Usamos createElement/textContent en lugar de innerHTML, así los textos que vienen
 * de fuera (por ejemplo, de la API de la NASA) nunca se interpretan como HTML.
 */

/**
 * @param {string} tag
 * @param {Record<string, unknown>} [attrs] class, dataset, on (eventos), o cualquier atributo
 * @param {...(Node|string|number|false|null|undefined|Array)} children
 * @returns {HTMLElement}
 */
export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs ?? {})) {
    if (value === undefined || value === null || value === false) continue;
    if (key === 'class') node.className = String(value);
    else if (key === 'dataset') Object.assign(node.dataset, value);
    else if (key === 'on') for (const [event, handler] of Object.entries(value)) node.addEventListener(event, handler);
    else if (value === true) node.setAttribute(key, '');
    else node.setAttribute(key, String(value));
  }
  node.append(...flatten(children));
  return node;
}

/** Igual que el(), pero para elementos SVG. */
export function svg(tag, attrs = {}, ...children) {
  const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, String(value));
  node.append(...flatten(children));
  return node;
}

function flatten(children) {
  return children
    .flat(Infinity)
    .filter((child) => child !== null && child !== undefined && child !== false)
    .map((child) => (child instanceof Node ? child : document.createTextNode(String(child))));
}

/** Reemplaza todo el contenido de un contenedor. */
export function mount(container, ...nodes) {
  container.replaceChildren(...nodes);
}

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const prefersReducedMotion = () =>
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

/** Mueve el foco a un título para que los lectores de pantalla anuncien la nueva pantalla. */
export function focusTitle(root) {
  const title = root.querySelector('[tabindex="-1"]');
  title?.focus({ preventScroll: true });
}
