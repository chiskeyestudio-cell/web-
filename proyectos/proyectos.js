// ==========================================================
// PROYECTOS · /proyectos/
// 1) Los tickets "se imprimen": caen con fundido al entrar en pantalla, una sola vez,
//    escalonados 80 ms entre los que entran juntos (CSS en proyectos.css).
//    Se apaga con ENTRADA_ACTIVA en /entrada.js (html.entrada-off).
// 2) Filtro por categoría de la carta (data-cat de cada ticket), con ?cat= en la URL.
//    La cápsula de menús de /servicios/, con sus flechas, en todos los tamaños.
// El hover, el panel de info y el foco de teclado son solo CSS.
// No toca el modal de Reservas: lo maneja main.js.
// ==========================================================
(function () {
    const galeria = document.querySelector('.pr-galeria');
    if (!galeria) return;

    const html = document.documentElement;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const tarjetas = Array.from(galeria.querySelectorAll('.ticket'));

    // ── 1) ENTRADA ──────────────────────────────────────────
    let obs = null;
    if (!reduce && !html.classList.contains('entrada-off') && 'IntersectionObserver' in window) {
        const PASO_MS = 80;
        galeria.classList.add('pr-anim');
        obs = new IntersectionObserver(entries => {
            // el observer respondió: la red de seguridad del <head> ya no hace falta
            html.classList.add('pr-armado');
            entries.filter(e => e.isIntersecting)
                .sort((a, b) => tarjetas.indexOf(a.target) - tarjetas.indexOf(b.target))
                .forEach((entry, i) => {
                    const t = entry.target;
                    t.style.transitionDelay = (i * PASO_MS) + 'ms';
                    t.classList.add('visible');
                    // al terminar, sin retraso: el hover responde al instante
                    t.addEventListener('transitionend', function limpiar(ev) {
                        if (ev.propertyName !== 'translate') return;
                        t.style.transitionDelay = '';
                        t.removeEventListener('transitionend', limpiar);
                    });
                    obs.unobserve(t);
                });
        }, { threshold: 0, rootMargin: '0px 0px -40px 0px' });
        tarjetas.forEach(t => obs.observe(t));
    }

    // un ticket que el filtro muestra por primera vez (estaba oculto al cargar) aparece ya
    // en su sitio, sin la caída de entrada: el filtro no reanima nada
    function asentar(t) {
        if (!obs || t.classList.contains('visible')) return;
        obs.unobserve(t);
        t.style.transition = 'none';
        t.classList.add('visible');
        void t.offsetWidth;                    // fija el estado final antes de devolver la transición
        t.style.transition = '';
    }

    // ── 2) FILTRO ───────────────────────────────────────────
    const nav = document.getElementById('pr-filtro');
    const opcionesEl = document.getElementById('pr-filtro-opciones');
    const estadoEl = document.getElementById('pr-filtro-estado');
    const vacioEl = document.getElementById('pr-filtro-vacio');
    if (!nav || !opcionesEl) return;

    // las categorías de la carta, en su orden (slug sin tildes → nombre como en la cápsula de servicios)
    const CATEGORIAS = [
        ['branding', 'Branding'],
        ['web', 'Web / App'],
        ['ecommerce', 'Ecommerce'],
        ['packaging', 'Packaging'],
        ['redes', 'Redes'],
        ['editorial', 'Editorial']
    ];
    const proyectos = tarjetas.filter(t => !t.classList.contains('ticket--vacio'));
    const vacias = tarjetas.filter(t => t.classList.contains('ticket--vacio'));
    const catsDe = t => (t.dataset.cat || '').toLowerCase().split(/\s+/).filter(Boolean);
    // todas las categorías de la carta (las que aún no tienen proyectos muestran el aviso)
    const opciones = [['todos', 'Todos']].concat(CATEGORIAS);
    const capsula = document.getElementById('pr-filtro-capsula');
    const flechaIzq = document.getElementById('pr-filtro-flecha-izq');
    const flechaDer = document.getElementById('pr-filtro-flecha-der');

    const botones = opciones.map(([slug, nombre]) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'pr-filtro-opcion';
        b.dataset.cat = slug;
        const sello = document.createElement('span');
        sello.className = 'pr-filtro-sello';
        sello.setAttribute('aria-hidden', 'true');
        sello.textContent = '*';
        b.append(sello, document.createTextNode(nombre));
        b.addEventListener('click', () => elegir(slug, true));
        opcionesEl.appendChild(b);
        return b;
    });

    // flechas entre opciones (Enter y espacio ya activan el botón)
    opcionesEl.addEventListener('keydown', e => {
        const i = botones.indexOf(document.activeElement);
        if (i < 0) return;
        let j = null;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') j = (i + 1) % botones.length;
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') j = (i - 1 + botones.length) % botones.length;
        else if (e.key === 'Home') j = 0;
        else if (e.key === 'End') j = botones.length - 1;
        if (j === null) return;
        e.preventDefault();
        botones[j].focus();
        botones[j].scrollIntoView({ block: 'nearest', inline: 'nearest' });
    });

    function elegir(slug, delUsuario) {
        if (!opciones.some(([s]) => s === slug)) slug = 'todos';   // categoría inválida = Todos
        const todos = slug === 'todos';
        let n = 0;
        proyectos.forEach(t => {
            const ve = todos || catsDe(t).includes(slug);
            if (ve) { n++; asentar(t); }
            t.hidden = !ve;
        });
        // las vacías solo se ven en "Todos" (y el interruptor data-vacias sigue mandando por CSS)
        vacias.forEach(t => { t.hidden = !todos; if (todos) asentar(t); });
        botones.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.cat === slug)));
        if (vacioEl) vacioEl.hidden = n > 0;

        if (delUsuario) {
            const nombre = (opciones.find(([s]) => s === slug) || [])[1];
            const palabra = n === 1 ? ' proyecto' : ' proyectos';
            estadoEl.textContent = todos ? 'Mostrando ' + n + palabra
                : (n ? 'Mostrando ' + n + palabra + ' de ' + nombre : 'Aún no hay proyectos en esta categoría.');
            // fundido corto de la rejilla, sin movimiento
            if (!reduce) {
                galeria.classList.remove('pr-filtrando');
                void galeria.offsetWidth;
                galeria.classList.add('pr-filtrando');
            }
            // estado en la URL (sin guardar nada en el navegador)
            const url = new URL(location.href);
            if (todos) url.searchParams.delete('cat'); else url.searchParams.set('cat', slug);
            history.replaceState(history.state, '', url.pathname + url.search + url.hash);
        }
    }
    galeria.addEventListener('animationend', () => galeria.classList.remove('pr-filtrando'));

    // ── flechas de "hay más opciones al lado" (como en la barra de /servicios/) ──
    function actualizarFlechas() {
        const max = opcionesEl.scrollWidth - opcionesEl.clientWidth;
        capsula.classList.toggle('puede-izq', opcionesEl.scrollLeft > 4);
        capsula.classList.toggle('puede-der', opcionesEl.scrollLeft < max - 4);
    }
    function mover(sentido) {
        opcionesEl.scrollBy({ left: sentido * opcionesEl.clientWidth * 0.6, behavior: reduce ? 'auto' : 'smooth' });
    }
    if (flechaIzq) flechaIzq.addEventListener('click', () => mover(-1));
    if (flechaDer) flechaDer.addEventListener('click', () => mover(1));
    opcionesEl.addEventListener('scroll', actualizarFlechas, { passive: true });
    window.addEventListener('resize', actualizarFlechas, { passive: true });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(actualizarFlechas);

    const inicial = (new URLSearchParams(location.search).get('cat') || 'todos').toLowerCase();
    elegir(inicial, false);
    nav.hidden = false;
    actualizarFlechas();
    // la opción elegida, a la vista dentro de la barra
    const activa = botones.find(b => b.getAttribute('aria-pressed') === 'true');
    if (activa && activa !== botones[0]) opcionesEl.scrollLeft = activa.offsetLeft - opcionesEl.clientWidth / 2 + activa.offsetWidth / 2;
})();
