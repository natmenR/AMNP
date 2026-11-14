// ─────────────────────────────────────────────────────────────
// Sobrevive en el espacio — lógica de la pantalla de misión
// Los eventos están en eventos.js. Aquí se ajusta la dificultad:
// ─────────────────────────────────────────────────────────────
(() => {
  'use strict';

  const TOTAL_DIAS = 15;                       // días que hay que sobrevivir
  const INICIO  = { e: 70, o: 70, s: 70 };     // recursos al empezar
  const CONSUMO = { e: 3,  o: 5,  s: 2 };      // lo que gasta la base cada día
  const MAX = 100;
  const RECURSOS = ['e', 'o', 's'];
  const NOMBRE = { e: 'Energía', o: 'Oxígeno', s: 'Escudo' };
  const ABREV  = { e: 'EN', o: 'O₂', s: 'ESC' };
  const CAUSA = {
    e: 'Se agotó la energía: sin electricidad la base quedó a oscuras y sin soporte vital.',
    o: 'Se acabó el oxígeno: la base ya no pudo mantener el aire respirable.',
    s: 'El escudo cayó: la radiación y los impactos dejaron la base inservible.'
  };
  const CLAVE_RECORD = 'sobrevive-espacio-record';

  const escena = document.getElementById('escena');
  const astro = document.getElementById('astro');
  let estado = null;

  // ── Utilidades ────────────────────────────────────────────
  function barajar(lista) {
    const a = lista.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  const limitar = (v) => Math.max(0, Math.min(MAX, v));
  const signo = (n) => (n > 0 ? '+' + n : '−' + Math.abs(n));

  function leerRecord() {
    try { return JSON.parse(localStorage.getItem(CLAVE_RECORD)) || { mejor: 0, victorias: 0 }; }
    catch (e) { return { mejor: 0, victorias: 0 }; }
  }
  function guardarRecord(r) {
    try { localStorage.setItem(CLAVE_RECORD, JSON.stringify(r)); } catch (e) { /* sin almacenamiento */ }
  }

  function reaccion(clase) {
    if (!astro) return;
    astro.classList.remove('golpe', 'feliz');
    void astro.offsetWidth;                       // reinicia la animación
    astro.classList.add(clase);
  }

  // ── Medidores ─────────────────────────────────────────────
  function pintarMedidores() {
    RECURSOS.forEach((r) => {
      const li = document.querySelector('[data-r="' + r + '"]');
      const v = estado[r];
      li.querySelector('.valor').textContent = v;
      li.querySelector('.relleno').style.width = v + '%';
      li.querySelector('.barra').setAttribute('aria-valuenow', v);
      li.classList.toggle('bajo', v <= 25);
    });
    document.getElementById('dia').textContent = 'Día ' + estado.dia;
    document.getElementById('progreso').style.width = ((estado.dia - 1) / TOTAL_DIAS * 100) + '%';
  }

  // ── Pistas de cada opción (flechas, sin números) ──────────
  function pistas(op) {
    if (op.azar) {
      return '<span class="pista riesgo"><span aria-hidden="true">¿?</span><span class="sr">Resultado incierto: puede salir bien o mal</span></span>';
    }
    return RECURSOS.filter((r) => Math.abs(op.efecto[r] || 0) >= 3).map((r) => {
      const d = op.efecto[r];
      const sube = d > 0;
      const fuerte = Math.abs(d) >= 10;
      const flechas = (sube ? '▲' : '▼').repeat(fuerte ? 2 : 1);
      return '<span class="pista ' + (sube ? 'sube' : 'baja') + '">' +
        '<span aria-hidden="true">' + ABREV[r] + ' ' + flechas + '</span>' +
        '<span class="sr">' + NOMBRE[r] + (sube ? ' sube' : ' baja') + (fuerte ? ' mucho' : '') + '</span></span>';
    }).join('');
  }

  // ── Pantallas ─────────────────────────────────────────────
  function mostrarEvento() {
    estado.fase = 'eleccion';
    const ev = estado.cola[estado.dia - 1];
    estado.evento = ev;
    escena.innerHTML =
      '<article class="tarjeta evento">' +
        '<h2 class="evento-titulo" tabindex="-1">' + ev.titulo + '</h2>' +
        '<p class="evento-texto">' + ev.texto + '</p>' +
        '<ul class="opciones">' +
          ev.opciones.map((op, i) =>
            '<li><button type="button" class="opcion" data-i="' + i + '">' +
              '<span class="op-tecla" aria-hidden="true">' + (i + 1) + '</span>' +
              '<span class="op-texto">' + op.texto + '</span>' +
              '<span class="pistas">' + pistas(op) + '</span>' +
            '</button></li>').join('') +
        '</ul>' +
        (estado.dia === 1
          ? '<p class="ayuda">Elige una opción por día. <b>▲</b> sube, <b>▼</b> baja y <b>¿?</b> es un riesgo. Puedes usar las teclas 1, 2 y 3.</p>'
          : '') +
      '</article>';
    escena.querySelectorAll('.opcion').forEach((b) =>
      b.addEventListener('click', () => elegir(Number(b.dataset.i))));
    escena.querySelector('.evento-titulo').focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }

  function elegir(i) {
    if (!estado || estado.fase !== 'eleccion') return;
    estado.fase = 'resultado';
    const ev = estado.evento;
    const op = ev.opciones[i];

    let efecto = op.efecto;
    let texto = op.resultado;
    if (op.azar) {
      const sale = Math.random() < op.azar.p ? op.azar.bien : op.azar.mal;
      efecto = sale.efecto;
      texto = sale.resultado;
    }

    const cambios = {};
    const gasto = {};
    RECURSOS.forEach((r) => {
      const antes = estado[r];
      estado[r] = limitar(antes + (efecto[r] || 0));
      cambios[r] = estado[r] - antes;
    });
    RECURSOS.forEach((r) => {
      const antes = estado[r];
      estado[r] = limitar(antes - CONSUMO[r]);
      gasto[r] = estado[r] - antes;
    });

    const agotado = RECURSOS.find((r) => estado[r] <= 0) || null;
    const neto = RECURSOS.reduce((t, r) => t + cambios[r], 0);
    reaccion(neto >= 0 ? 'feliz' : 'golpe');
    pintarMedidores();
    estado.agotado = agotado;

    const chips = RECURSOS.filter((r) => cambios[r] !== 0).map((r) =>
      '<li class="cambio ' + (cambios[r] > 0 ? 'sube' : 'baja') + '">' +
        NOMBRE[r] + ' <b>' + signo(cambios[r]) + '</b></li>').join('');
    const consumo = RECURSOS.map((r) =>
      '<li class="cambio baja">' + NOMBRE[r] + ' <b>' + signo(gasto[r]) + '</b></li>').join('');

    let etiqueta;
    if (agotado) etiqueta = 'Ver qué pasó';
    else if (estado.dia >= TOTAL_DIAS) etiqueta = 'Ver resultado final';
    else etiqueta = 'Pasar al día ' + (estado.dia + 1);

    escena.innerHTML =
      '<article class="tarjeta resultado">' +
        '<h2 class="evento-titulo">' + ev.titulo + '</h2>' +
        '<p class="elegiste">Elegiste: ' + op.texto + '</p>' +
        '<p class="res-texto">' + texto + '</p>' +
        '<p class="mini-titulo">Efecto de tu decisión</p>' +
        '<ul class="cambios">' + (chips || '<li class="cambio">Sin cambios</li>') + '</ul>' +
        '<p class="mini-titulo">Consumo diario de la base</p>' +
        '<ul class="cambios">' + consumo + '</ul>' +
        '<p class="dato"><b>¿Sabías que…?</b> ' + ev.dato + '</p>' +
        '<button type="button" class="btn medio" id="siguiente">' + etiqueta + '</button>' +
      '</article>';
    const btn = document.getElementById('siguiente');
    btn.addEventListener('click', siguiente);
    btn.focus({ preventScroll: true });
  }

  function siguiente() {
    if (estado.fase !== 'resultado') return;
    if (estado.agotado) return terminar(false);
    if (estado.dia >= TOTAL_DIAS) return terminar(true);
    estado.dia += 1;
    pintarMedidores();
    mostrarEvento();
  }

  function terminar(victoria) {
    estado.fase = 'fin';
    const sobrevividos = victoria ? TOTAL_DIAS : estado.dia - 1;
    const rec = leerRecord();
    const esRecord = sobrevividos > rec.mejor;
    if (esRecord) rec.mejor = sobrevividos;
    if (victoria) rec.victorias += 1;
    guardarRecord(rec);

    let html;
    if (victoria) {
      // Las estrellas dependen del recurso que quedó más bajo: ¡hay que cuidar los tres!
      const minimo = Math.min(estado.e, estado.o, estado.s);
      const estrellas = minimo >= 20 ? 3 : minimo >= 10 ? 2 : 1;
      reaccion('feliz');
      html =
        '<article class="tarjeta final ganaste">' +
          '<h2 class="evento-titulo" tabindex="-1">¡Sobreviviste ' + TOTAL_DIAS + ' días!</h2>' +
          '<p class="estrellas" role="img" aria-label="' + estrellas + ' de 3 estrellas">' +
            '<span aria-hidden="true">' + '★'.repeat(estrellas) + '<span class="vacia">' + '★'.repeat(3 - estrellas) + '</span></span></p>' +
          '<p class="res-texto">Llega la nave de rescate. Tu base quedó con ' +
            estado.e + ' de energía, ' + estado.o + ' de oxígeno y ' + estado.s + ' de escudo.</p>';
    } else {
      reaccion('golpe');
      html =
        '<article class="tarjeta final perdiste">' +
          '<h2 class="evento-titulo" tabindex="-1">Misión terminada</h2>' +
          '<p class="res-texto">' + CAUSA[estado.agotado] + '</p>' +
          '<p class="dato">Aguantaste <b>' + sobrevividos + '</b> de ' + TOTAL_DIAS + ' días.</p>';
    }
    html +=
        '<p class="record">' + (esRecord && sobrevividos > 0 ? '¡Nuevo récord! ' : '') +
          'Tu mejor marca: <b>' + rec.mejor + '</b> de ' + TOTAL_DIAS + ' días · Misiones cumplidas: <b>' + rec.victorias + '</b></p>' +
        '<div class="acciones">' +
          '<button type="button" class="btn medio" id="otra">Jugar otra vez</button>' +
          '<a class="btn medio secundario" href="index.html">Volver al inicio</a>' +
        '</div>' +
      '</article>';
    escena.innerHTML = html;
    document.getElementById('otra').addEventListener('click', nuevaPartida);
    escena.querySelector('.evento-titulo').focus({ preventScroll: true });
  }

  function nuevaPartida() {
    estado = Object.assign({}, INICIO, {
      dia: 1,
      cola: barajar(EVENTOS).slice(0, TOTAL_DIAS),
      fase: 'eleccion',
      evento: null,
      agotado: null
    });
    document.getElementById('dia-total').textContent = ' de ' + TOTAL_DIAS;
    pintarMedidores();
    mostrarEvento();
  }

  // Teclas 1, 2 y 3 para elegir
  document.addEventListener('keydown', (e) => {
    if (!estado || estado.fase !== 'eleccion' || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key >= '1' && e.key <= '3') {
      const b = escena.querySelector('.opcion[data-i="' + (Number(e.key) - 1) + '"]');
      if (b) b.click();
    }
  });

  nuevaPartida();
})();
