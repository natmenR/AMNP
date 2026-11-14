// Dirección de tu pantalla de juego. Ejemplo: 'juego.html'
// Si lo cambias a null, se muestra un aviso en lugar de cambiar de página.
const URL_JUEGO = 'juego.html';

const botonJugar = document.getElementById('jugar');
const botonVolver = document.getElementById('volver');
const aviso = document.getElementById('aviso');
let empezando = false;

function iniciar() {
  if (empezando) return;
  empezando = true;
  document.body.classList.add('despegue');      // el astronauta sale volando
  setTimeout(() => {
    if (URL_JUEGO) {
      window.location.href = URL_JUEGO;
    } else {
      aviso.hidden = false;
    }
  }, 1000);
}

function volver() {
  aviso.hidden = true;
  document.body.classList.remove('despegue');
  empezando = false;
}

botonJugar.addEventListener('click', iniciar);
botonVolver.addEventListener('click', volver);
document.addEventListener('keydown', (e) => {
  if ((e.key === 'Enter' || e.key === ' ') && !empezando && document.activeElement !== botonVolver) {
    e.preventDefault();
    iniciar();
  }
});

// Si el jugador vuelve con el botón "atrás", dejamos la portada lista otra vez
window.addEventListener('pageshow', (e) => { if (e.persisted) volver(); });
