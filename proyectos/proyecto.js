// ==========================================================
// PÁGINA DE PROYECTO · /izate/ · /oliv_ia/ · /el_hogar/
// Solo comportamiento: las imágenes "salen a la mesa" una tras otra
// y el visor ampliado.
// Todo el contenido está en el HTML de cada página.
// No toca el modal de Reservas (#myModal): lo maneja main.js.
// ==========================================================
// ── CINTA DEL NOMBRE: misma velocidad (px/s) que la cinta "chiskey" de la home,
//    y en pausa fuera de pantalla o con la pestaña oculta ──
(function () {
    const cinta = document.querySelector('.py-cinta');
    if (!cinta) return;
    const grupo = cinta.querySelector('.py-cinta-grupo');
    // home: un grupo de 4 × "chiskey" (14,582em) tarda 26 s; su letra es 17,3vw en ≤768 y clamp(48px, 9,6vw, 256px) en escritorio
    const HOME_GRUPO_EM = 14.582, HOME_DURACION_S = 26;
    function velocidadHome() {
        const vw = window.innerWidth;
        const fs = vw <= 768 ? 0.173 * vw : Math.min(Math.max(48, 0.096 * vw), 256);
        return HOME_GRUPO_EM * fs / HOME_DURACION_S;            // px por segundo
    }
    function ajustar() {
        if (grupo.offsetWidth) cinta.style.setProperty('--py-cinta-dur', (grupo.offsetWidth / velocidadHome()).toFixed(2) + 's');
    }
    ajustar();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(ajustar);
    window.addEventListener('resize', ajustar, { passive: true });

    let visible = true;
    const revisar = () => cinta.classList.toggle('is-pausa', document.hidden || !visible);
    if ('IntersectionObserver' in window) new IntersectionObserver(([e]) => { visible = e.isIntersecting; revisar(); }).observe(cinta);
    document.addEventListener('visibilitychange', revisar);
})();

(function () {
    const galeria = document.querySelector('.py-galeria');
    if (!galeria) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

    // ── aparición al hacer scroll: una tras otra, cada 80 ms ─
    const PASO_MS = 80;
    const items = Array.from(galeria.querySelectorAll('.py-g'));
    if (!reduce.matches && 'IntersectionObserver' in window) {
        galeria.classList.add('py-anim');
        let cola = 0;                       // las que entran juntas se sirven escalonadas
        const obs = new IntersectionObserver(entries => {
            const entrando = entries.filter(e => e.isIntersecting)
                .sort((a, b) => items.indexOf(a.target) - items.indexOf(b.target));
            entrando.forEach(entry => {
                const espera = cola++ * PASO_MS;
                setTimeout(() => { entry.target.classList.add('visible'); cola = Math.max(0, cola - 1); }, espera);
                obs.unobserve(entry.target);
            });
        }, { threshold: 0.06 });
        items.forEach(it => obs.observe(it));
    }

    // ── visor ampliado ──────────────────────────────────────
    const botones = Array.from(galeria.querySelectorAll('.py-g-btn'));
    const fotos = botones.map(btn => {
        const img = btn.querySelector('img');
        return { img, src: img.dataset.full || img.src, alt: img.alt };
    });
    if (!fotos.length) return;

    const icono = d => '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + d + '"/></svg>';
    const visor = document.createElement('div');
    visor.className = 'py-visor';
    visor.hidden = true;
    visor.setAttribute('role', 'dialog');
    visor.setAttribute('aria-modal', 'true');
    visor.setAttribute('aria-label', 'Galería ampliada');
    visor.innerHTML =
        '<button type="button" class="py-visor-cerrar" aria-label="Cerrar galería">' + icono('M18 6 6 18M6 6l12 12') + '</button>' +
        '<button type="button" class="py-visor-ant" aria-label="Imagen anterior">' + icono('M15 5l-7 7 7 7') + '</button>' +
        '<figure class="py-visor-fig">' +
            '<img class="py-visor-img" alt="">' +
            '<figcaption class="py-visor-pie"><span class="py-visor-alt"></span><span class="py-visor-contador" aria-live="polite"></span></figcaption>' +
        '</figure>' +
        '<button type="button" class="py-visor-sig" aria-label="Imagen siguiente">' + icono('M9 5l7 7-7 7') + '</button>';
    document.body.appendChild(visor);

    const imgEl = visor.querySelector('.py-visor-img');
    const contadorEl = visor.querySelector('.py-visor-contador');
    const altEl = visor.querySelector('.py-visor-alt');
    const cerrarEl = visor.querySelector('.py-visor-cerrar');
    let actual = 0;
    let opener = null;

    function mostrar(i) {
        actual = (i + fotos.length) % fotos.length;
        const f = fotos[actual];
        // primero la versión que ya cargó la galería (instantánea), luego la grande
        imgEl.src = f.img.currentSrc || f.img.src;
        imgEl.alt = f.alt;
        if (f.src !== imgEl.src) {
            const grande = new Image();
            grande.onload = () => { if (fotos[actual] === f && !visor.hidden) imgEl.src = f.src; };
            grande.src = f.src;
        }
        contadorEl.textContent = (actual + 1) + ' / ' + fotos.length;
        altEl.textContent = f.alt;
    }

    function abrir(i) {
        opener = document.activeElement;
        mostrar(i);
        visor.hidden = false;
        document.documentElement.classList.add('py-visor-abierto');
        cerrarEl.focus();
    }

    function cerrar() {
        if (visor.hidden) return;
        visor.hidden = true;
        document.documentElement.classList.remove('py-visor-abierto');
        imgEl.removeAttribute('src');
        if (opener && document.contains(opener)) opener.focus();
        opener = null;
    }

    botones.forEach((btn, i) => btn.addEventListener('click', () => abrir(i)));
    cerrarEl.addEventListener('click', cerrar);
    visor.querySelector('.py-visor-ant').addEventListener('click', () => mostrar(actual - 1));
    visor.querySelector('.py-visor-sig').addEventListener('click', () => mostrar(actual + 1));
    // clic en el fondo (fuera de la imagen y los botones) cierra
    visor.addEventListener('click', e => {
        if (e.target === visor || e.target.classList.contains('py-visor-fig')) cerrar();
    });

    document.addEventListener('keydown', e => {
        if (visor.hidden) return;
        if (e.key === 'Escape') { e.preventDefault(); cerrar(); return; }
        if (e.key === 'ArrowLeft') { e.preventDefault(); mostrar(actual - 1); return; }
        if (e.key === 'ArrowRight') { e.preventDefault(); mostrar(actual + 1); return; }
        if (e.key === 'Tab') {
            // el foco no sale del visor
            const focos = Array.from(visor.querySelectorAll('button'));
            const primero = focos[0], ultimo = focos[focos.length - 1];
            if (e.shiftKey && document.activeElement === primero) { e.preventDefault(); ultimo.focus(); }
            else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primero.focus(); }
            else if (!visor.contains(document.activeElement)) { e.preventDefault(); primero.focus(); }
        }
    });
})();

// ── PÍLDORAS DE SERVICIOS (solo ≤768 px) ──────────────────
//    Fuente única: la tabla de la comanda (columna Concepto de las filas con contenido).
//    Se genera una <ul> de píldoras bajo la cinta, antes del texto inicial; por breakpoint solo
//    existe una versión accesible: la otra lleva el atributo hidden (fuera de la vista
//    y del lector de pantalla). Sin JS no hay píldoras y la comanda se ve siempre.
(function () {
    const comanda = document.querySelector('.proyecto-comanda');
    if (!comanda) return;
    const servicios = Array.from(comanda.querySelectorAll('.proyecto-comanda-tabla tbody tr'))
        .filter(tr => tr.getAttribute('aria-hidden') !== 'true')
        .map(tr => (tr.cells[1] ? tr.cells[1].textContent.trim() : ''))
        .filter(Boolean);
    if (!servicios.length) return;          // sin servicios: sin píldoras (la comanda queda como está)

    const lista = document.createElement('ul');
    lista.className = 'py-pildoras';
    const caption = comanda.querySelector('caption');
    lista.setAttribute('aria-label', caption ? caption.textContent.trim() : 'Servicios servidos');
    servicios.forEach(s => {
        const li = document.createElement('li');
        li.className = 'py-pildora';
        li.textContent = s;
        lista.appendChild(li);
    });
    // bajo la cinta del nombre, antes del texto inicial (también primero en el orden de lectura)
    const intro = document.querySelector('.py-intro');
    if (intro) intro.before(lista); else comanda.after(lista);

    const movil = window.matchMedia('(max-width: 768px)');
    function aplicar() {
        comanda.hidden = movil.matches;
        lista.hidden = !movil.matches;
    }
    aplicar();
    movil.addEventListener('change', aplicar);
})();
