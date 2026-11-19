// ==========================================================
// INICIO · la home (/)
// La puerta de carga (Outfit + tarta, tope 1,2 s) está en el script del
// <head> y añade "inicio-listo" en <html>. Aquí:
//  - pausa las cintas y el giro de la tarta cuando no están en pantalla
//    o la pestaña está oculta;
//  - el rebote de entrada de la tarta sale cuando la tarta entra en pantalla
//    (no con la carga), una sola vez; al terminar, "inicio-fin" quita su will-change.
// Sin librerías. No toca main.js.
// ==========================================================
(function () {
    const html = document.documentElement;
    const piezas = [document.querySelector('.inicio-cintas'), document.querySelector('.inicio-tarta')].filter(Boolean);

    // ── PAUSA: fuera de pantalla o pestaña oculta ──
    const enPantalla = new Map(piezas.map(p => [p, true]));
    function revisar() {
        piezas.forEach(p => p.classList.toggle('is-pausa', document.hidden || !enPantalla.get(p)));
    }
    if ('IntersectionObserver' in window) {
        const io = new IntersectionObserver(entradas => {
            entradas.forEach(e => enPantalla.set(e.target, e.isIntersecting));
            revisar();
        });
        piezas.forEach(p => io.observe(p));
    }
    document.addEventListener('visibilitychange', revisar);

    // ── ENTRADA DE LA TARTA: cuando se ve, una sola vez ──
    // El rebote se dispara al cumplirse las tres cosas: puerta abierta (inicio-listo),
    // imagen decodificada (is-lista, la pone el <head>) y tarta en pantalla.
    // Si ya se ve al cargar, el observer avisa enseguida y sale sin esperar scroll.
    const contenedor = document.querySelector('.inicio-tarta');
    const entrada = document.querySelector('.inicio-tarta-entrada');
    function terminar() { html.classList.add('inicio-fin'); }
    if (!contenedor || !entrada || window.matchMedia('(prefers-reduced-motion: reduce)').matches) { terminar(); return; }

    let vista = false;
    let disparada = false;
    let io = null;
    function intentar() {
        if (disparada || !vista || !html.classList.contains('inicio-listo') || !entrada.classList.contains('is-lista')) return;
        disparada = true;
        if (io) io.unobserve(contenedor);
        entrada.addEventListener('animationend', e => { if (e.animationName === 'inicio-tarta-entra') terminar(); }, { once: true });
        entrada.classList.add('inicio-tarta-entra');
    }
    if ('IntersectionObserver' in window) {
        io = new IntersectionObserver(entradas => {
            if (entradas.some(e => e.isIntersecting)) { vista = true; intentar(); }
        }, { rootMargin: '0px 0px -15% 0px', threshold: 0.2 });
        io.observe(contenedor);
    } else {
        vista = true;
    }
    // la puerta y la imagen pueden llegar antes o después que este archivo
    document.addEventListener('inicio:listo', intentar);
    new MutationObserver(intentar).observe(entrada, { attributes: true, attributeFilter: ['class'] });
    intentar();
})();
