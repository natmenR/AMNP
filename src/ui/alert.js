/** Luces rojas y señales de alerta (los estilos viven en css/alert.css). */
export function setAlert(on) {
  document.body.classList.toggle('is-alert', on);
}

export function isAlertOn() {
  return document.body.classList.contains('is-alert');
}
