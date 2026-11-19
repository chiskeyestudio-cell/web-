// ==========================================================
// LA TARTA · contacto rápido por WhatsApp o llamada
// Se enlaza en cada página con:
//   <link rel="stylesheet" href="/tarta/tarta.css">
//   <script src="/tarta/tarta.js" defer></script>
// No va en la home (/) ni en /comanda/. No toca main.js ni styles.css.
// Sin cookies ni trackers: solo sessionStorage para el globito.
//
// MODO "SOLO GLOBO" (la home): <script src="/tarta/tarta.js" defer data-tarta-modo="globo">
// Sin tarta, sin mordida ni flotación: solo el globito "¿Antojo urgente?" (píldora como la de la comanda de servicios),
// siempre visible (aparece ~2 s después de cargar, sin límite de sesión ni
// auto-ocultado); al pulsarlo abre el mismo panel.
// Sin el atributo, todo funciona exactamente como antes.
// ==========================================================
(function () {
    const MODO = (document.currentScript && document.currentScript.dataset.tartaModo) || 'tarta';
    const SOLO_GLOBO = MODO === 'globo';
    const GLOBO_ESPERA_MS = 2000;    // modo globo: aparece este tiempo después de que la página esté lista

    // ── CONFIGURACIÓN EDITABLE ─────────────────────────────
    const RESPUESTA_MINUTOS = 30;   // plazo de respuesta dentro del horario laborable
    const MORDIDA_MS = 700;         // duración de la mordida antes de abrir el panel (máx. 800)

    // Horario laborable (hora de Madrid). Día: 1 = lunes … 7 = domingo. null = cerrado.
    const HORARIO_LABORABLE = {
        zona: 'Europe/Madrid',
        dias: {
            1: ['09:00', '20:00'],
            2: ['09:00', '20:00'],
            3: ['09:00', '20:00'],
            4: ['09:00', '20:00'],
            5: ['09:00', '20:00'],
            6: ['09:00', '15:00'],
            7: null,
        },
    };
    // true: cuenta como "dentro de horario" solo si faltan al menos RESPUESTA_MINUTOS para el cierre.
    // false: cuenta hasta el cierre exacto.
    const MARGEN_CIERRE = true;
    // COMPLETAR: días cerrados aunque toquen laborables (festivos, cierres). Formato 'AAAA-MM-DD'.
    const FESTIVOS_Y_CIERRES = [];
    // COMPLETAR si hace falta: fecha de vuelta 'AAAA-MM-DD' para una pausa (vacaciones).
    // Hasta ese día todo cuenta como fuera de horario. null = sin pausa.
    const PAUSA_MANUAL = null;

    // COMPLETAR: [WHATSAPP_NUMERO] solo dígitos con prefijo de país, sin "+" ni espacios
    // (ej. '34600000000'). Solo se usa como respaldo en el estado de error; vacío = no aparece.
    const WHATSAPP_NUMERO = '';
    const WHATSAPP_MENSAJE = 'Hola, quise pedir contacto desde la web de Chiskey y no se envió.';

    const FORMSPREE = 'https://formspree.io/f/xyzovndj';
    // respaldo: la misma URL que usa main.js en el overlay (se lee del DOM si existe)
    const PRIVACIDAD_RESPALDO = 'https://drive.google.com/file/d/1kc8CvPUErHeAkZhF5ti5Hdf0QyjXlfL8/view?usp=sharing';
    const GLOBITO_KEY = 'chiskey-tarta-globito';
    const GLOBITO_ESPERA = 8000;
    const GLOBITO_DURA = 8000;
    const MORDISCO_EN = 180;        // ms tras el clic en que aparece el mordisco

    // ── no aparece en la home ni en /comanda/ ──────────────
    const ruta = location.pathname.replace(/\/index\.html$/, '/');
    // (en modo globo sí va en la home: es la única página que lo pide)
    if ((ruta === '/' && !SOLO_GLOBO) || ruta.startsWith('/comanda')) return;
    if (document.querySelector('.tarta')) return;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    const movil = window.matchMedia('(max-width: 600px)');   // hoja inferior
    const html = document.documentElement;

    // ── MARCADO ─────────────────────────────────────────────
    const raiz = document.createElement('div');
    raiz.className = SOLO_GLOBO ? 'tarta tarta--globo' : 'tarta';
    // disparador: la tarta con su globito, o (modo globo) el globito como botón, siempre visible
    const disparador = SOLO_GLOBO ? `
      <div class="tarta-globito" id="tarta-globito" hidden>
        <button type="button" class="tarta-btn tarta-globo-btn" id="tarta-btn"
                aria-haspopup="dialog" aria-expanded="false" aria-controls="tarta-panel">¿Antojo urgente?</button>
      </div>` : `
      <div class="tarta-globito" id="tarta-globito" role="status" hidden>¿Antojo urgente?</div>
      <button type="button" class="tarta-btn" id="tarta-btn"
              aria-label="Pedir que te contactemos" aria-expanded="false" aria-controls="tarta-panel">
        <span class="tarta-sombra" aria-hidden="true"></span>
        <span class="tarta-flota">
          <picture>
            <source type="image/webp" srcset="/tarta/tarta-264.webp 264w, /tarta/tarta-528.webp 528w" sizes="(max-width: 600px) 64px, 88px">
            <img class="tarta-img" src="/tarta/tarta-264.png" width="264" height="188" alt="" decoding="async">
          </picture>
          <span class="tarta-migas" aria-hidden="true"><i></i><i></i><i></i><i></i></span>
        </span>
      </button>`;
    raiz.innerHTML = disparador + `
      <div class="tarta-fondo" id="tarta-fondo" hidden></div>
      <div class="tarta-panel" id="tarta-panel" role="dialog" aria-modal="true" aria-labelledby="tarta-titulo" tabindex="-1" hidden>
        <button type="button" class="tarta-cerrar" id="tarta-cerrar" aria-label="Cerrar">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>
        <h2 class="tarta-titulo" id="tarta-titulo">Una mordida rápida</h2>

        <div id="tarta-vista-form">
          <p class="tarta-texto">¿Antojo urgente? Te contactamos en máximo ${RESPUESTA_MINUTOS} minutos en horario laborable.</p>
          <form class="tarta-form" id="tarta-form" action="${FORMSPREE}" method="POST" novalidate>
            <div class="tarta-trampa" aria-hidden="true">
              <label for="tarta-gotcha">No rellenar</label>
              <input type="text" id="tarta-gotcha" name="_gotcha" tabindex="-1" autocomplete="off">
            </div>

            <fieldset class="tarta-canal">
              <legend>¿Cómo prefieres que te contactemos?</legend>
              <div class="tarta-pastillas">
                <input type="radio" id="tarta-canal-wa" name="canal" value="whatsapp" checked>
                <label for="tarta-canal-wa">WhatsApp</label>
                <input type="radio" id="tarta-canal-tel" name="canal" value="llamada">
                <label for="tarta-canal-tel">Llamada</label>
              </div>
            </fieldset>

            <div class="tarta-campo">
              <label for="tarta-nombre">Nombre</label>
              <input type="text" id="tarta-nombre" name="nombre" autocomplete="given-name"
                     placeholder="cómo te llamas" required aria-describedby="tarta-nombre-error">
              <p class="tarta-error" id="tarta-nombre-error" hidden></p>
            </div>
            <div class="tarta-campo">
              <label for="tarta-tel">Teléfono</label>
              <input type="tel" id="tarta-tel" name="telefono" inputmode="tel" autocomplete="tel"
                     placeholder="+34 600 000 000" required aria-describedby="tarta-tel-nota tarta-tel-error">
              <p class="tarta-nota" id="tarta-tel-nota">Ponlo con el número que usas en WhatsApp.</p>
              <p class="tarta-error" id="tarta-tel-error" hidden></p>
            </div>

            <label class="tarta-acepto">
              <input type="checkbox" id="tarta-acepto" required aria-describedby="tarta-acepto-error">
              <span>Usamos tus datos solo para contactarte por este pedido. <a id="tarta-privacidad" href="${PRIVACIDAD_RESPALDO}" target="_blank" rel="noopener noreferrer">Política de privacidad</a></span>
            </label>
            <p class="tarta-error" id="tarta-acepto-error" hidden></p>

            <p class="tarta-aviso" id="tarta-aviso" hidden></p>
            <button type="submit" class="tarta-enviar" id="tarta-enviar">Pedir contacto</button>

            <div class="tarta-fallo" id="tarta-fallo" role="alert" hidden>
              <p>No pudimos enviarlo. Inténtalo de nuevo en un momento.</p>
              <div class="tarta-fallo-acciones">
                <button type="button" class="tarta-reintentar" id="tarta-reintentar">Reintentar</button>
                <a class="tarta-fallo-wa" id="tarta-fallo-wa" target="_blank" rel="noopener noreferrer" hidden>Escríbenos por WhatsApp</a>
              </div>
            </div>
          </form>
        </div>

        <div class="tarta-exito" id="tarta-vista-exito" hidden>
          <p class="tarta-exito-texto" id="tarta-exito-texto" tabindex="-1"></p>
          <button type="button" class="tarta-listo" id="tarta-listo">Cerrar</button>
        </div>
      </div>`;
    document.body.appendChild(raiz);

    const $ = id => document.getElementById(id);
    const btn = $('tarta-btn');
    const panel = $('tarta-panel');
    const fondo = $('tarta-fondo');
    const globito = $('tarta-globito');
    const form = $('tarta-form');
    const canalWa = $('tarta-canal-wa');
    const nombre = $('tarta-nombre');
    const nombreError = $('tarta-nombre-error');
    const tel = $('tarta-tel');
    const telNota = $('tarta-tel-nota');
    const telError = $('tarta-tel-error');
    const acepto = $('tarta-acepto');
    const aceptoError = $('tarta-acepto-error');
    const aviso = $('tarta-aviso');
    const enviar = $('tarta-enviar');
    const fallo = $('tarta-fallo');
    const reintentar = $('tarta-reintentar');
    const falloWa = $('tarta-fallo-wa');
    const vistaForm = $('tarta-vista-form');
    const vistaExito = $('tarta-vista-exito');
    const exitoTexto = $('tarta-exito-texto');

    // política de privacidad: la misma URL que main.js pone en el overlay
    const privOverlay = document.querySelector('.overlay-footer-right a');
    if (privOverlay && privOverlay.href) $('tarta-privacidad').href = privOverlay.href;

    // respaldo de WhatsApp en el error: solo si hay número
    if (WHATSAPP_NUMERO) {
        falloWa.href = 'https://wa.me/' + WHATSAPP_NUMERO.replace(/\D/g, '') + '?text=' + encodeURIComponent(WHATSAPP_MENSAJE);
        falloWa.hidden = false;
    }

    // ── HORARIO (siempre en hora de Madrid, nunca la del dispositivo) ──
    const DIAS = ['', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
    const aMin = hhmm => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
    const horaLegible = hhmm => hhmm.replace(/^0/, '');               // '09:00' → '9:00'
    const iso = (y, m, d) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

    function ahoraEnMadrid() {
        const partes = new Intl.DateTimeFormat('en-GB', {
            timeZone: HORARIO_LABORABLE.zona, year: 'numeric', month: '2-digit', day: '2-digit',
            weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false,
        }).formatToParts(new Date());
        const p = t => (partes.find(x => x.type === t) || {}).value;
        const hora = Number(p('hour')) % 24;                          // algunos motores dan "24" a medianoche
        return {
            y: Number(p('year')), m: Number(p('month')), d: Number(p('day')),
            dia: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(p('weekday')) + 1,
            min: hora * 60 + Number(p('minute')),
        };
    }
    // tramo laborable de un día de calendario (o null si está cerrado)
    function tramo(fecha, dia) {
        if (FESTIVOS_Y_CIERRES.includes(fecha)) return null;
        if (PAUSA_MANUAL && fecha < PAUSA_MANUAL) return null;
        return HORARIO_LABORABLE.dias[dia] || null;
    }
    // día de calendario a +n días del de hoy en Madrid (aritmética en UTC: sin saltos de horario)
    function diaMas(a, n) {
        const f = new Date(Date.UTC(a.y, a.m - 1, a.d + n));
        return { fecha: iso(f.getUTCFullYear(), f.getUTCMonth() + 1, f.getUTCDate()), dia: f.getUTCDay() || 7, num: f.getUTCDate() };
    }
    function dentroDeHorario() {
        const a = ahoraEnMadrid();
        const t = tramo(diaMas(a, 0).fecha, a.dia);
        if (!t) return false;
        const cierre = aMin(t[1]) - (MARGEN_CIERRE ? RESPUESTA_MINUTOS : 0);
        return a.min >= aMin(t[0]) && (MARGEN_CIERRE ? a.min <= cierre : a.min < cierre);
    }
    // cuándo contactamos fuera de horario: "hoy a las 9:00", "mañana a las 9:00", "el lunes a las 9:00"
    function proximoTramo() {
        const a = ahoraEnMadrid();
        for (let n = 0; n <= 60; n++) {
            const { fecha, dia, num } = diaMas(a, n);
            const t = tramo(fecha, dia);
            if (!t) continue;
            if (n === 0 && a.min >= aMin(t[0])) continue;              // hoy ya abrimos: pasa al siguiente
            const hora = horaLegible(t[0]);
            if (n === 0) return `hoy a las ${hora}`;
            if (n === 1) return `mañana a las ${hora}`;
            // a una semana o más, el nombre del día solo es ambiguo: se añade el número
            return n < 7 ? `el ${DIAS[dia]} a las ${hora}` : `el ${DIAS[dia]} ${num} a las ${hora}`;
        }
        return 'el próximo día laborable a primera hora';
    }

    // ── MORDIDA Y MIGAS (solo al hacer clic, antes de abrir) ─
    let timers = [];
    const despues = (fn, ms) => timers.push(setTimeout(fn, ms));
    function limpiarTimers() { timers.forEach(clearTimeout); timers = []; }

    function ponerMordida(on) { btn.classList.toggle('is-mordida-1', !!on); }
    function reiniciarClase(clase) {
        btn.classList.remove(clase);
        void btn.offsetWidth;
        btn.classList.add(clase);
    }
    function morder() {
        if (SOLO_GLOBO) return 0;               // sin tarta no hay mordida: el panel abre directo
        if (reduce.matches) { ponerMordida(true); return 0; }
        reiniciarClase('is-mordiendo');
        reiniciarClase('is-migas');
        despues(() => ponerMordida(true), MORDISCO_EN);
        despues(() => btn.classList.remove('is-mordiendo', 'is-migas'), MORDIDA_MS);
        return MORDIDA_MS;
    }

    // ── BLOQUEO DEL SCROLL DE FONDO (solo con la hoja inferior) ──
    // Técnica compatible con iOS Safari: body fijo en -scrollY y restaurar al cerrar.
    let bloqueoY = null;
    function bloquearScroll() {
        if (!movil.matches || bloqueoY !== null) return;
        bloqueoY = window.scrollY;
        document.body.style.setProperty('--tarta-scroll-y', -bloqueoY + 'px');
        document.body.classList.add('tarta-lock');
    }
    function desbloquearScroll() {
        if (bloqueoY === null) return;
        const y = bloqueoY;
        bloqueoY = null;
        document.body.classList.remove('tarta-lock');
        document.body.style.removeProperty('--tarta-scroll-y');
        try { window.scrollTo({ top: y, left: 0, behavior: 'instant' }); } catch (e) { window.scrollTo(0, y); }
    }
    // el fondo atenuado tampoco desplaza nada
    fondo.addEventListener('touchmove', e => e.preventDefault(), { passive: false });
    // al cambiar de página o pasar a escritorio, el bloqueo no queda colgado
    window.addEventListener('pagehide', desbloquearScroll);
    movil.addEventListener('change', () => { if (!movil.matches) desbloquearScroll(); else if (abierto()) bloquearScroll(); });

    // la hoja no se mete bajo el header del sitio (z 91000)
    const cabecera = document.querySelector('.navbar, .navbar-tupedido');
    function ajustarHoja() {
        if (!movil.matches) { raiz.style.removeProperty('--t-hoja-max'); return; }
        const finHeader = cabecera ? Math.max(0, cabecera.getBoundingClientRect().bottom) : 0;
        raiz.style.setProperty('--t-hoja-max', Math.min(window.innerHeight * 0.88, window.innerHeight - finHeader - 8) + 'px');
    }

    // ── ABRIR / CERRAR (en dos tiempos: mordida → panel) ───
    let mordiendo = false;
    function abierto() { return !panel.hidden; }
    function quieta(on) { raiz.classList.toggle('tarta--quieta', on); }   // pausa la flotación

    function iniciarApertura() {
        if (mordiendo) return;                  // clics repetidos durante la mordida: se ignoran
        ocultarGlobito(!SOLO_GLOBO);            // modo globo: se esconde mientras está el panel, sin marcar la sesión
        quieta(true);
        const espera = morder();
        if (!espera) { abrirPanel(); return; }
        mordiendo = true;
        despues(() => { mordiendo = false; abrirPanel(); }, espera);
    }

    function abrirPanel() {
        if (bloqueado()) { ponerMordida(false); quieta(false); return; }
        mostrarFormulario();
        const fuera = !dentroDeHorario();
        aviso.textContent = fuera ? `Ahora estamos fuera de horario. Te contactamos ${proximoTramo()}.` : '';
        aviso.hidden = !fuera;
        ajustarHoja();
        bloquearScroll();
        panel.hidden = false;
        fondo.hidden = false;
        raiz.classList.add('tarta--panel');     // en móvil la tarta se desvanece detrás de la hoja
        btn.setAttribute('aria-expanded', 'true');
        (form.querySelector('input[name="canal"]:checked') || nombre).focus();
    }

    function cerrar(devolverFoco) {
        limpiarTimers();
        mordiendo = false;
        btn.classList.remove('is-mordiendo', 'is-migas');
        ponerMordida(false);                    // vuelve entera para repetir la secuencia
        raiz.classList.remove('tarta--panel');
        quieta(false);
        const estabaAbierto = abierto();
        panel.hidden = true;
        fondo.hidden = true;
        btn.setAttribute('aria-expanded', 'false');
        desbloquearScroll();
        if (SOLO_GLOBO && globoListo) globito.hidden = false;   // modo globo: el globito vuelve
        if (!estabaAbierto || devolverFoco === false) return;
        if (SOLO_GLOBO) raiz.classList.remove('tarta--sin-globo');   // visible para poder recibir el foco
        btn.focus({ preventScroll: true });      // con tarta o con globito, el foco vuelve al disparador
    }

    function mostrarFormulario() {
        vistaExito.hidden = true;
        vistaForm.hidden = false;
        fallo.hidden = true;
    }

    btn.addEventListener('click', () => (abierto() ? cerrar() : iniciarApertura()));
    $('tarta-cerrar').addEventListener('click', () => cerrar());
    $('tarta-listo').addEventListener('click', () => cerrar());
    fondo.addEventListener('click', () => cerrar());
    document.addEventListener('click', e => {
        if (abierto() && !raiz.contains(e.target)) cerrar(false);
    });

    document.addEventListener('keydown', e => {
        if (!abierto()) return;
        if (e.key === 'Escape') { e.preventDefault(); cerrar(); return; }
        if (e.key !== 'Tab') return;
        // el foco no sale del panel (un solo radio cuenta: el marcado)
        const focos = Array.from(panel.querySelectorAll('button, input:not([tabindex="-1"]), a[href]'))
            .filter(el => !el.disabled && el.offsetParent !== null && !(el.type === 'radio' && !el.checked));
        if (!focos.length) return;
        const primero = focos[0], ultimo = focos[focos.length - 1];
        if (e.shiftKey && (document.activeElement === primero || document.activeElement === panel)) { e.preventDefault(); ultimo.focus(); }
        else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primero.focus(); }
    });

    // nota "Ponlo con el número que usas en WhatsApp" solo con WhatsApp elegido
    function actualizarNota() {
        telNota.hidden = !canalWa.checked;
        tel.setAttribute('aria-describedby', (canalWa.checked ? 'tarta-tel-nota ' : '') + 'tarta-tel-error');
    }
    form.addEventListener('change', e => { if (e.target.name === 'canal') actualizarNota(); });
    actualizarNota();

    // ── GLOBITO ─────────────────────────────────────────────
    // con tarta: una vez por sesión, a los 8 s, y se oculta solo.
    // modo globo (home): siempre visible, sin límite de sesión, ~2 s después de cargar la página.
    let globitoTimer = null;
    let globoListo = false;
    function yaVisto() {
        try { return sessionStorage.getItem(GLOBITO_KEY) === '1'; } catch (e) { return true; }
    }
    function ocultarGlobito(marcar) {
        clearTimeout(globitoTimer);
        globito.hidden = true;
        if (marcar) { try { sessionStorage.setItem(GLOBITO_KEY, '1'); } catch (e) {} }
    }
    if (!SOLO_GLOBO && !yaVisto()) {
        setTimeout(() => {
            if (yaVisto() || abierto() || mordiendo || bloqueado()) return;
            globito.hidden = false;
            try { sessionStorage.setItem(GLOBITO_KEY, '1'); } catch (e) {}
            globitoTimer = setTimeout(() => ocultarGlobito(false), GLOBITO_DURA);
            // cualquier clic lo cierra
            document.addEventListener('click', () => ocultarGlobito(false), { once: true, capture: true });
        }, GLOBITO_ESPERA);
    }
    if (SOLO_GLOBO) {
        const mostrar = () => setTimeout(() => {
            globoListo = true;
            if (!abierto()) globito.hidden = false;
        }, GLOBO_ESPERA_MS);
        if (document.readyState === 'complete') mostrar();
        else window.addEventListener('load', mostrar, { once: true });
        // no tapa el footer ni sus iconos: mientras el footer está a la vista, el globo se aparta
        const pie = document.querySelector('.footer');
        if (pie && 'IntersectionObserver' in window) {
            // …salvo que tenga el foco de teclado o el panel esté abierto
            let pieVisible = false;
            const apartar = () => raiz.classList.toggle('tarta--sin-globo', pieVisible && !abierto() && !raiz.contains(document.activeElement));
            new IntersectionObserver(([e]) => { pieVisible = e.isIntersecting; apartar(); }).observe(pie);
            raiz.addEventListener('focusout', () => setTimeout(apartar, 0));
        }
    }

    // ── NO CHOCAR CON EL MENÚ NI CON LOS MODALES ───────────
    // main.js: el overlay pone body.overlay-open; el modal global cambia #myModal.style.display.
    // Capas propias del sitio: html.cmd-abierta (comanda de servicios) y html.py-visor-abierto.
    const modal = document.getElementById('myModal');
    function bloqueado() {
        return document.body.classList.contains('overlay-open')
            || (modal && getComputedStyle(modal).display !== 'none')
            || html.classList.contains('cmd-abierta')
            || html.classList.contains('py-visor-abierto');
    }
    function revisar() {
        const b = bloqueado();
        raiz.classList.toggle('tarta--oculta', b);
        if (b) { cerrar(false); if (!SOLO_GLOBO) ocultarGlobito(false); }   // cerrar() también suelta el bloqueo de scroll
    }
    const vigia = new MutationObserver(revisar);
    vigia.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    vigia.observe(html, { attributes: true, attributeFilter: ['class'] });
    if (modal) vigia.observe(modal, { attributes: true, attributeFilter: ['style', 'class'] });
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(revisar, 0));
    else setTimeout(revisar, 0);

    // ── VALIDACIÓN TOLERANTE ────────────────────────────────
    function telefonoValido(v) {
        if (!/^\+?[\d\s\-().]+$/.test(v.trim())) return false;
        const digitos = v.replace(/\D/g, '').length;
        return digitos >= 9 && digitos <= 15;
    }
    function marcarError(input, nodo, msg) {
        input.setAttribute('aria-invalid', msg ? 'true' : 'false');
        nodo.textContent = msg || '';
        nodo.hidden = !msg;
    }
    function validar() {
        const okNombre = nombre.value.trim().length > 0;
        const okTel = telefonoValido(tel.value);
        marcarError(nombre, nombreError, okNombre ? '' : 'Escribe tu nombre.');
        marcarError(tel, telError, okTel ? '' : 'Escribe un teléfono con al menos 9 números.');
        marcarError(acepto, aceptoError, acepto.checked ? '' : 'Marca la casilla para que podamos contactarte.');
        if (!okNombre) { nombre.focus(); return false; }
        if (!okTel) { tel.focus(); return false; }
        if (!acepto.checked) { acepto.focus(); return false; }
        return true;
    }
    nombre.addEventListener('input', () => { if (nombre.value.trim()) marcarError(nombre, nombreError, ''); });
    tel.addEventListener('input', () => { if (tel.getAttribute('aria-invalid') === 'true' && telefonoValido(tel.value)) marcarError(tel, telError, ''); });
    acepto.addEventListener('change', () => { if (acepto.checked) marcarError(acepto, aceptoError, ''); });

    // ── ENVÍO ───────────────────────────────────────────────
    async function enviarDatos() {
        if (!validar()) return;
        const canal = form.querySelector('input[name="canal"]:checked').value;
        const fuera = !dentroDeHorario();
        const cuando = fuera ? proximoTramo() : '';
        const quien = nombre.value.trim();

        const datos = new FormData();
        datos.append('nombre', quien);
        datos.append('telefono', tel.value.trim());
        datos.append('canal', canal);
        datos.append('fuera_de_horario', fuera ? 'si' : 'no');
        datos.append('pagina', location.pathname);
        datos.append('origen', 'tarta-contacto-rapido');
        datos.append('_subject', canal === 'whatsapp' ? 'Contacto rápido (WhatsApp) desde la tarta' : 'Contacto rápido (Llamada) desde la tarta');
        datos.append('_gotcha', $('tarta-gotcha').value);

        fallo.hidden = true;
        enviar.disabled = true;
        reintentar.disabled = true;
        enviar.textContent = 'Enviando…';
        try {
            const r = await fetch(FORMSPREE, { method: 'POST', body: datos, headers: { Accept: 'application/json' } });
            if (!r.ok) throw new Error('HTTP ' + r.status);
            const canalTexto = canal === 'whatsapp' ? 'WhatsApp' : 'llamada';
            exitoTexto.textContent = fuera
                ? `Listo, ${quien}. Te contactamos por ${canalTexto} ${cuando}.`
                : `Listo, ${quien}. Te contactamos por ${canalTexto} en máximo ${RESPUESTA_MINUTOS} minutos.`;
            form.reset();
            actualizarNota();
            vistaForm.hidden = true;
            vistaExito.hidden = false;
            exitoTexto.focus();
        } catch (err) {
            fallo.hidden = false;
        } finally {
            enviar.disabled = false;
            reintentar.disabled = false;
            enviar.textContent = 'Pedir contacto';
        }
        if (!fallo.hidden) reintentar.focus();   // ya habilitado: el foco sí entra
    }
    form.addEventListener('submit', e => { e.preventDefault(); enviarDatos(); });
    reintentar.addEventListener('click', enviarDatos);
})();
