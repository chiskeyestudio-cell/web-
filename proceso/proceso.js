/* CÓMO COCINAMOS · /proceso/
   1. Los botones "Escribirnos" abren el modal de Reservas usando el mismo
      botón de la cabecera (así no se duplica la lógica de main.js).
   2. Entrada, una sola vez: la línea punteada se dibuja de arriba abajo
      (--linea, ver proceso.css) y cada paso entra cuando la línea lo alcanza.
      Sin listeners de scroll: IntersectionObserver por paso y uno para la lista,
      que cubre el salto directo al final (ancla o scroll rápido).
      Se apaga con ENTRADA_ACTIVA en /entrada.js (html.entrada-off). */
(function () {
  document.querySelectorAll('[data-abrir-reservas]').forEach(function (b) {
    b.addEventListener('click', function (e) {
      e.preventDefault();
      var r = document.querySelector('.reservas-btn');
      if (r) r.click();
    });
  });

  var lista = document.querySelector('.pc-pasos');
  var pasos = Array.prototype.slice.call(document.querySelectorAll('.pc-paso'));
  var quieto = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var apagada = document.documentElement.classList.contains('entrada-off');
  if (quieto || apagada || !lista || !pasos.length || !('IntersectionObserver' in window)) return;

  var AVANCE_MS = 500;   // lo mismo que la transición de --linea en proceso.css
  var MARGEN = 40;       // px por encima del borde inferior para contar como "visto"
  var alcanzado = -1;    // último paso al que llegó la línea
  var lineaPx = 0;

  // dónde cae el punto del paso i (centro de la primera línea del título), en px desde arriba de la lista
  function posicion(i) {
    var t = pasos[i].querySelector('.pc-paso-titulo') || pasos[i];
    var alto = parseFloat(getComputedStyle(t).lineHeight) || 24;
    return t.getBoundingClientRect().top - lista.getBoundingClientRect().top + alto / 2;
  }

  var turno = -1e9;      // momento (performance.now) en que aparece el último paso programado
  function avanzar(k) {
    var ahora = performance.now();
    var desde = lineaPx;
    var ultimo = k === pasos.length - 1;
    var hasta = ultimo ? lista.offsetHeight : posicion(k);
    var tramo = Math.max(hasta - desde, 1);
    for (var i = alcanzado + 1; i <= k; i++) {
      // cuando la línea llega a su punto, y nunca antes que el paso anterior
      var cuando = ahora + Math.max(0, Math.min(1, (posicion(i) - desde) / tramo)) * AVANCE_MS;
      turno = Math.max(cuando, turno + 60);
      (function (p, ms) { setTimeout(function () { p.classList.add('pc-visto'); }, ms); })(pasos[i], turno - ahora);
    }
    alcanzado = k;
    lineaPx = hasta;
    lista.style.setProperty('--linea', ultimo ? '100%' : hasta + 'px');
    if (ultimo) { io.disconnect(); window.removeEventListener('resize', reajustar); }
  }

  // el último paso que ya está en pantalla o por encima (aunque se haya saltado)
  function revisar() {
    var k = -1;
    pasos.forEach(function (p, i) { if (p.getBoundingClientRect().top < window.innerHeight - MARGEN) k = i; });
    if (k > alcanzado) avanzar(k);
  }

  function reajustar() {
    if (alcanzado < 0) return;
    lineaPx = posicion(alcanzado);
    lista.style.setProperty('--linea', lineaPx + 'px');
  }

  document.body.classList.add('pc-revelar');
  var io = new IntersectionObserver(revisar, { threshold: [0, 0.25, 0.5, 0.75, 1], rootMargin: '0px 0px -' + MARGEN + 'px 0px' });
  io.observe(lista);
  pasos.forEach(function (p) { io.observe(p); });
  // si se salta la lista entera (p. ej. un ancla al final), lo de abajo también avisa
  document.querySelectorAll('.pc-faq, .pc-cierre, footer').forEach(function (el) { io.observe(el); });
  window.addEventListener('resize', reajustar, { passive: true });
  // si la maqueta cambia sin que nada entre o salga de pantalla (p. ej. un salto
  // al final antes de que carguen las fuentes), se vuelve a mirar una vez
  window.addEventListener('load', revisar, { once: true });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(revisar);
})();
