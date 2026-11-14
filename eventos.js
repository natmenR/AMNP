// ─────────────────────────────────────────────────────────────
// Eventos del juego. Cada día se elige uno al azar.
//
// efecto: { e: energía, o: oxígeno, s: escudo }  (números positivos suben, negativos bajan)
// Una opción con "azar" es un riesgo: con probabilidad p sale "bien", si no sale "mal".
// "dato" es una curiosidad real que se muestra al final del día.
// ─────────────────────────────────────────────────────────────
const EVENTOS = [
  {
    titulo: 'Tormenta solar',
    texto: 'Una llamarada solar viaja hacia tu base. Los sensores avisan: llega en pocas horas.',
    dato: 'Las llamaradas solares son explosiones en el Sol. Las partículas que lanzan pueden tardar desde unas decenas de minutos hasta días en llegar.',
    opciones: [
      { texto: 'Mandar energía al escudo', efecto: { e: -14, s: 12 }, resultado: 'El escudo absorbe la tormenta. Las luces parpadean, pero resistes.' },
      { texto: 'Apagar todo y esperar', efecto: { e: 4, o: -4, s: -14 }, resultado: 'Sin protección extra, la radiación castiga el casco.' },
      { texto: 'Salir a orientar los paneles', azar: {
          p: 0.5,
          bien: { efecto: { e: 12, s: 6 }, resultado: '¡Perfecto! Los paneles aprovechan la tormenta para cargar las baterías.' },
          mal:  { efecto: { e: -8, o: -8, s: -8 }, resultado: 'La salida se complica: gastas aire y energía, y el escudo sufre.' } } }
    ]
  },
  {
    titulo: 'Fuga de oxígeno',
    texto: 'Una junta del módulo 2 silba. Se está escapando aire.',
    dato: 'En la Estación Espacial Internacional los astronautas vigilan la presión del aire y buscan fugas pequeñas cuando hace falta.',
    opciones: [
      { texto: 'Sellarla con resina', efecto: { e: -6, o: -2 }, resultado: 'La fuga se detiene, aunque pierdes algo de aire y tiempo.' },
      { texto: 'Cerrar el módulo dañado', efecto: { e: 3, o: -8 }, resultado: 'Aíslas el módulo, pero el aire que quedaba dentro se pierde.' },
      { texto: 'Usar el generador de reserva', efecto: { e: -16, o: 12 }, resultado: 'El generador repone aire, pero se traga mucha energía.' }
    ]
  },
  {
    titulo: 'Lluvia de micrometeoritos',
    texto: 'Partículas diminutas golpean el casco como granizo. Suena a mil agujas.',
    dato: 'En el espacio las partículas viajan tan rápido que incluso un grano de polvo puede dañar una superficie.',
    opciones: [
      { texto: 'Reparar el casco ahora', efecto: { e: -8, s: 12 }, resultado: 'Tapas las marcas antes de que crezcan.' },
      { texto: 'Seguir con lo tuyo', efecto: { e: 2, s: -14 }, resultado: 'Los impactos se acumulan y el escudo queda muy tocado.' },
      { texto: 'Girar la base para cubrir las zonas débiles', efecto: { e: -4, o: -4, s: 6 }, resultado: 'La maniobra ayuda un poco, pero cuesta aire y energía.' }
    ]
  },
  {
    titulo: 'Paneles cubiertos de polvo',
    texto: 'Una capa de polvo cubre los paneles solares y la producción de energía cae.',
    dato: 'Los rovers de la NASA en Marte han perdido energía por el polvo sobre sus paneles. A veces el viento los limpia solo.',
    opciones: [
      { texto: 'Limpiarlos a mano', efecto: { e: 14, o: -6 }, resultado: 'Los paneles brillan otra vez, pero la caminata te dejó sin aire.' },
      { texto: 'Mandar al robot limpiador', efecto: { e: 10, s: -4 }, resultado: 'El robot limpia, aunque choca con una antena.' },
      { texto: 'Esperar a que el viento los limpie', azar: {
          p: 0.4,
          bien: { efecto: { e: 16 }, resultado: '¡Una ráfaga barre el polvo y recuperas energía gratis!' },
          mal:  { efecto: { e: -8, o: -2 }, resultado: 'No pasa nada y las baterías siguen cayendo.' } } }
    ]
  },
  {
    titulo: 'El huerto dio frutos',
    texto: 'Tu cultivo hidropónico tiene hojas verdes y unos tomates diminutos.',
    dato: 'En la Estación Espacial Internacional los astronautas han cultivado lechugas y otras plantas.',
    opciones: [
      { texto: 'Cosechar y comer todo', efecto: { e: 14, o: -4 }, resultado: 'Comida fresca: recuperas fuerzas, aunque hay menos plantas que produzcan aire.' },
      { texto: 'Dejar crecer las plantas', efecto: { e: -4, o: 12 }, resultado: 'Las plantas siguen renovando el aire del módulo.' },
      { texto: 'Usar las hojas para reparar filtros', efecto: { e: -6, o: 8, s: 4 }, resultado: 'Una solución de ingenio: filtros mejores y una grieta menos.' }
    ]
  },
  {
    titulo: 'Falla del reciclador de agua',
    texto: 'El reciclador de agua se detiene con un clic. Sin él, todo se complica.',
    dato: 'En la Estación Espacial Internacional se recicla gran parte del agua, incluida la humedad del aire y la orina.',
    opciones: [
      { texto: 'Repararlo pieza por pieza', efecto: { e: -12, o: 6 }, resultado: 'Lleva horas, pero el reciclador vuelve a funcionar.' },
      { texto: 'Reiniciarlo y cruzar los dedos', azar: {
          p: 0.5,
          bien: { efecto: { e: -2, o: 10 }, resultado: '¡Arranca! Reiniciar era todo lo que necesitaba.' },
          mal:  { efecto: { e: -8, o: -10 }, resultado: 'Se atasca peor que antes y pierdes recursos.' } } },
      { texto: 'Racionar agua unos días', efecto: { e: 6, o: -4 }, resultado: 'Aguantas con poco, pero el aire se resiente.' }
    ]
  },
  {
    titulo: 'Mensaje desde la Tierra',
    texto: 'Control de Misión te envía un mensaje: tienen una propuesta para ti.',
    dato: 'Las señales de radio tardan alrededor de 1,3 segundos de la Luna a la Tierra, y entre 3 y 22 minutos desde Marte.',
    opciones: [
      { texto: 'Pedir ayuda a Control', efecto: { e: -3, o: 10 }, resultado: 'Los ingenieros te mandan instrucciones para optimizar el aire.' },
      { texto: 'Enviar tus datos científicos', efecto: { e: 6, s: 8 }, resultado: 'A cambio, Control te manda un parche para mejorar el escudo.' },
      { texto: 'Responder más tarde y descansar', efecto: { e: 10, s: -4 }, resultado: 'Descansas, pero el escudo no se vigila solo.' }
    ]
  },
  {
    titulo: 'Hielo en el cráter',
    texto: 'Tu dron detecta hielo de agua en un cráter cercano, a unos minutos de la base.',
    dato: 'La NASA ha detectado hielo de agua en cráteres de la Luna que casi nunca reciben luz del Sol.',
    opciones: [
      { texto: 'Extraerlo ahora', efecto: { e: -12, o: 14 }, resultado: 'Con el hielo derretido produces agua y aire, pero la excavadora gasta mucha energía.' },
      { texto: 'Explorarlo primero con el dron', azar: {
          p: 0.6,
          bien: { efecto: { e: -4, o: 16 }, resultado: '¡Jackpot! El dron encuentra una veta enorme y fácil de extraer.' },
          mal:  { efecto: { e: -10, s: -6 }, resultado: 'El dron se cae en el cráter y hay que ir a rescatarlo.' } } },
      { texto: 'Marcarlo y seguir con la base', efecto: { s: 6 }, resultado: 'Dedicas el día a reforzar la base. El hielo seguirá ahí.' }
    ]
  },
  {
    titulo: 'Noche larga',
    texto: 'El Sol se oculta y los paneles dejan de producir. La noche será larga.',
    dato: 'Un día lunar dura cerca de 29,5 días terrestres, así que cada noche en la Luna es larguísima.',
    opciones: [
      { texto: 'Usar las baterías de reserva', efecto: { e: -12, o: 2, s: 4 }, resultado: 'Pasas la noche con luz y calor, pero las baterías quedan flojas.' },
      { texto: 'Apagar los módulos que no hacen falta', efecto: { e: 2, o: -6, s: -6 }, resultado: 'Ahorras energía, pero se resienten el aire y el escudo.' },
      { texto: 'Quemar combustible en el generador', efecto: { e: 10, o: -8 }, resultado: 'Hay energía, pero el humo ensucia el aire.' }
    ]
  },
  {
    titulo: 'Antena rota',
    texto: 'Un golpe dobló la antena principal. Sin ella no hablas con Control.',
    dato: 'Las antenas gigantes de la Red del Espacio Profundo de la NASA se comunican con naves muy lejanas.',
    opciones: [
      { texto: 'Repararla con calma', efecto: { e: -10, s: 6 }, resultado: 'La antena vuelve a funcionar y aprovechas para revisar el casco.' },
      { texto: 'Usar la antena de emergencia', efecto: { e: -3, s: -6 }, resultado: 'Hablas con Control, pero la señal es débil y el equipo se sobrecarga.' },
      { texto: 'Reorientarla con un truco', azar: {
          p: 0.5,
          bien: { efecto: { e: 4, o: 4, s: 4 }, resultado: '¡Funciona! Con la antena enderezada, Control te envía buenas noticias.' },
          mal:  { efecto: { e: -6, s: -8 }, resultado: 'Se rompe aún más y tienes que reconstruirla.' } } }
    ]
  },
  {
    titulo: 'Filtro de CO₂ saturado',
    texto: 'El filtro que quita el dióxido de carbono del aire está al límite y respiras peor.',
    dato: 'En la Estación Espacial Internacional, los sistemas de soporte vital retiran el dióxido de carbono que exhalan los astronautas.',
    opciones: [
      { texto: 'Cambiarlo por el último repuesto', efecto: { e: -6, o: 14 }, resultado: 'El aire vuelve a ser limpio, pero ya no te quedan repuestos.' },
      { texto: 'Limpiarlo con cuidado', azar: {
          p: 0.6,
          bien: { efecto: { e: -2, o: 10 }, resultado: '¡Quedó casi como nuevo!' },
          mal:  { efecto: { e: -4, o: -8 }, resultado: 'Se rompe una pieza y respiras cada vez peor.' } } },
      { texto: 'Abrir la ventilación extra', efecto: { e: -8, o: 6, s: -4 }, resultado: 'Mejora un poco el aire, pero los ventiladores abren puntos débiles.' }
    ]
  },
  {
    titulo: 'Asteroide cercano',
    texto: 'Un asteroide pequeño pasará cerca de tu posición. Quizá desprenda fragmentos.',
    dato: 'La NASA vigila objetos cercanos a la Tierra. En 2022, la misión DART cambió la órbita de un asteroide pequeño.',
    opciones: [
      { texto: 'Reforzar el escudo y esperar', efecto: { e: -10, s: 10 }, resultado: 'El asteroide pasa de largo y tu escudo queda preparado.' },
      { texto: 'Observarlo de cerca', azar: {
          p: 0.5,
          bien: { efecto: { e: 8, o: 6 }, resultado: 'Pasa lejos y Control te agradece los datos con ayuda extra.' },
          mal:  { efecto: { e: -4, s: -14 }, resultado: 'Un fragmento golpea la base. ¡Eso dolió!' } } },
      { texto: 'Ignorar la alerta', efecto: { e: 2, o: 2, s: -10 }, resultado: 'Nada grave, pero algunos fragmentos rozan el casco.' }
    ]
  },
  {
    titulo: 'Se acaba el calor',
    texto: 'La calefacción falla y dentro de la base empieza a hacer mucho frío.',
    dato: 'En el espacio las temperaturas cambian muchísimo entre la luz directa del Sol y la sombra.',
    opciones: [
      { texto: 'Subir la calefacción', efecto: { e: -12, o: 4 }, resultado: 'Entras en calor y respiras mejor, pero la factura de energía es alta.' },
      { texto: 'Ponerte capas y aguantar', efecto: { e: 2, o: -6 }, resultado: 'Ahorras energía, aunque el frío te agota y respiras más rápido.' },
      { texto: 'Aislar los módulos con mantas', efecto: { e: -6, s: 8 }, resultado: 'Las mantas retienen calor y protegen los paneles de los golpes.' }
    ]
  },
  {
    titulo: 'El ordenador se congela',
    texto: 'El ordenador central deja de responder y varios sistemas se quedan sin control.',
    dato: 'La radiación puede provocar errores en la electrónica, por eso las naves usan equipos y sistemas especialmente protegidos.',
    opciones: [
      { texto: 'Reiniciar los sistemas', efecto: { e: -8, o: 6 }, resultado: 'Todo vuelve a funcionar, pero reiniciar consume energía.' },
      { texto: 'Pasar a control manual', efecto: { e: 4, o: -6, s: -4 }, resultado: 'Sobrevives, pero estar pendiente de todo te agota.' },
      { texto: 'Restaurar la copia de seguridad', efecto: { e: -4, o: -2, s: 6 }, resultado: 'Una copia reciente salva el día y repara el escudo.' }
    ]
  },
  {
    titulo: 'Noche de mal sueño',
    texto: 'Llevas varios días durmiendo poco. El cansancio te hace cometer errores.',
    dato: 'En microgravedad no hay arriba ni abajo: los astronautas duermen en sacos atados a la pared.',
    opciones: [
      { texto: 'Dormir ocho horas', efecto: { e: 10, o: -4 }, resultado: 'Duermes como un tronco. Despiertas descansado y con las ideas claras.' },
      { texto: 'Trabajar toda la noche', efecto: { e: -6, o: -4, s: 10 }, resultado: 'Dejas el escudo impecable, pero acabas agotado.' },
      { texto: 'Siesta corta y repasar los sistemas', efecto: { e: 3, o: 2, s: 2 }, resultado: 'Un poco de descanso y un chequeo rápido: nada mal.' }
    ]
  },
  {
    titulo: 'Hora de entrenar',
    texto: 'Tus músculos pierden fuerza sin gravedad. Hoy toca decidir cuánto ejercicio hacer.',
    dato: 'Los astronautas de la Estación Espacial Internacional hacen ejercicio unas dos horas al día para cuidar músculos y huesos.',
    opciones: [
      { texto: 'Hacer la rutina completa', efecto: { e: 8, o: -8, s: 4 }, resultado: 'Te sientes fuerte, aunque respiraste mucho aire.' },
      { texto: 'Hacer un poco', efecto: { e: 4, o: -3 }, resultado: 'Un entrenamiento ligero: nada de otro mundo, pero algo es algo.' },
      { texto: 'Saltarte hoy y arreglar el casco', efecto: { e: -4, o: -4, s: 10 }, resultado: 'Priorizas la base, aunque tu cuerpo lo notará.' }
    ]
  }
];

if (typeof module !== 'undefined') module.exports = EVENTOS;
