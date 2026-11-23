// ── VOLVER ARRIBA · botón flotante .subir-flecha (estilos en /subir.css) ──────
//    Solo aparece al llegar al pie: ahí la tarta se desvanece y la flecha ocupa su
//    sitio (clase .subir-tarta-cede en la tarta; transición en /subir.css). Mientras
//    se baja por la página no se ve. En páginas que miden menos de SUBIR_MIN_PAGINAS
//    alturas de ventana no aparece y la tarta se queda.
//    Sin listener de scroll: un IntersectionObserver sobre el pie y un ResizeObserver
//    sobre el body (servicios y proceso cambian de alto).
//    Se oculta con el menú overlay, el modal global, la comanda de Reservas o de
//    servicios, el visor de proyectos, el panel de la tarta, su globito o el aviso
//    breve de la comanda de servicios. Sin JS el botón no se ve.
const SUBIR_MIN_PAGINAS = 2;   // alto mínimo de la página, en alturas de ventana

(function () {
    const boton = document.querySelector('.subir-flecha');
    if (!boton) return;
    const html = document.documentElement;
    let ancla = document.getElementById('inicio');
    if (!ancla) {
        ancla = document.createElement('span');
        ancla.id = 'inicio';
        ancla.tabIndex = -1;
        document.body.prepend(ancla);
    }

    // ── acción ──
    const reducir = window.matchMedia('(prefers-reduced-motion: reduce)');
    boton.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: reducir.matches ? 'auto' : 'smooth' });
        ancla.focus({ preventScroll: true });
    });

    // ── estado ──
    let larga = false;       // la página mide más de SUBIR_MIN_PAGINAS ventanas
    let enPie = false;       // el pie está a la vista

    const modal = document.getElementById('myModal');
    function bloqueado() {
        const tarta = document.querySelector('.tarta');
        const globito = document.getElementById('tarta-globito');
        return document.body.classList.contains('overlay-open')
            || document.body.classList.contains('tarta-lock')
            || (modal && getComputedStyle(modal).display !== 'none')
            || html.classList.contains('cmd-abierta')          // Reservas y la comanda de servicios
            || html.classList.contains('py-visor-abierto')     // visor de imágenes de proyectos
            || (tarta && tarta.classList.contains('tarta--panel'))
            // el globito de la tarta (8 s, una vez por sesión) ocupa el mismo sitio; en la home el globo no
            || (tarta && !tarta.classList.contains('tarta--globo') && globito && !globito.hidden)
            // servicios: el aviso breve "…, a la comanda" ocupa ese sitio en móvil
            || !!document.querySelector('.cr-toast.is-visible');
    }
    function pintar() {
        // home: el globo se aparta solo en el pie (tarta--sin-globo); si sigue a la vista
        // (p. ej. con el foco del teclado dentro), la flecha no aparece en su sitio
        const globo = document.querySelector('.tarta--globo');
        const globoAparte = !globo || (globo.classList.contains('tarta--sin-globo') && !globo.contains(document.activeElement));
        const relevo = larga && enPie && globoAparte && !bloqueado();
        const ver = relevo;
        boton.classList.toggle('is-visible', ver);
        // la tarta cede su sitio (en la home no hay tarta: el globo ya se aparta solo en el pie)
        const tarta = document.querySelector('.tarta:not(.tarta--globo)');
        if (tarta) {
            tarta.classList.toggle('subir-tarta-cede', relevo);
            tarta.inert = relevo;      // cedida: ni foco ni clics (sin cambiar cómo se ve)
        }
        if (!ver && document.activeElement === boton) ancla.focus({ preventScroll: true });
    }

    function medir() {
        larga = html.scrollHeight > window.innerHeight * SUBIR_MIN_PAGINAS;
        pintar();
    }
    let pendiente = false;
    function programar() {
        if (pendiente) return;
        pendiente = true;
        requestAnimationFrame(() => { pendiente = false; medir(); });
    }
    const pie = document.querySelector('footer.footer');
    if (pie && 'IntersectionObserver' in window) {
        new IntersectionObserver(([e]) => { enPie = e.isIntersecting; pintar(); }).observe(pie);
    }
    if ('ResizeObserver' in window) new ResizeObserver(programar).observe(document.body);
    window.addEventListener('resize', programar);

    // ── capas abiertas: clases y atributos que ya existen ──
    const vigia = new MutationObserver(pintar);
    vigia.observe(document.body, { attributes: true, attributeFilter: ['class'], childList: true });
    vigia.observe(html, { attributes: true, attributeFilter: ['class'] });
    if (modal) vigia.observe(modal, { attributes: true, attributeFilter: ['style', 'class'] });
    let vigilandoTarta = false;
    function vigilarTarta() {
        const tarta = document.querySelector('.tarta');
        if (!tarta || vigilandoTarta) return;
        vigilandoTarta = true;
        vigia.observe(tarta, { attributes: true, attributeFilter: ['class'] });
        // home: con el foco de teclado dentro, el globo se ve aunque esté en el pie
        tarta.addEventListener('focusin', pintar);
        tarta.addEventListener('focusout', () => setTimeout(pintar, 0));
        const globito = document.getElementById('tarta-globito');
        if (globito) vigia.observe(globito, { attributes: true, attributeFilter: ['hidden'] });
    }
    vigilarTarta();
    // servicios: el aviso de la comanda (existe desde la carga en /servicios/)
    const toast = document.querySelector('.cr-toast');
    if (toast) vigia.observe(toast, { attributes: true, attributeFilter: ['class', 'hidden'] });
    // la tarta la crea /tarta/tarta.js; si aún no existe, se engancha cuando aparezca
    if (!vigilandoTarta) new MutationObserver((_, o) => { vigilarTarta(); if (vigilandoTarta) { o.disconnect(); pintar(); } })
        .observe(document.body, { childList: true });

    medir();
})();
