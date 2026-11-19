/* ==========================================================
   ENTRADA · interruptor de las animaciones de entrada
   Se carga en el <head> sin defer para que la clase exista antes del primer pintado.
   false = sin fundido común ni gestos (tickets de proyectos, línea de proceso,
   cortina y comanda de las páginas de proyecto): todo queda como sin animación.
   ========================================================== */
(function () {
    const ENTRADA_ACTIVA = true;
    const html = document.documentElement;
    if (!ENTRADA_ACTIVA) { html.classList.add('entrada-off'); return; }
    // al volver con atrás/adelante la entrada no se repite
    // (si la página sale de la caché de ida y vuelta, ni siquiera se vuelve a ejecutar esto)
    try {
        const nav = performance.getEntriesByType('navigation')[0];
        if (nav && nav.type === 'back_forward') html.classList.add('entrada-off');
    } catch (e) {}
})();
