import { prefersReducedMotion } from '../ui/dom.js';

/**
 * Dibuja "estática" de TV en un canvas pequeño (se ve pixelada al escalarla con CSS).
 * @param {HTMLCanvasElement} canvas
 * @returns {() => void} función para detenerla
 */
export function startStatic(canvas, { fps = 10, width = 96, height = 54 } = {}) {
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return () => {};
  const image = ctx.createImageData(width, height);

  const draw = () => {
    for (let i = 0; i < image.data.length; i += 4) {
      const v = Math.random() * 255;
      image.data[i] = v;
      image.data[i + 1] = v;
      image.data[i + 2] = v;
      image.data[i + 3] = 255;
    }
    ctx.putImageData(image, 0, 0);
  };

  draw();
  if (prefersReducedMotion()) return () => {};
  const timer = setInterval(draw, 1000 / fps);
  return () => clearInterval(timer);
}
