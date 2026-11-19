/* ============================================================
   SERVICIOS · INICIO (solo /servicios/)
   La comanda para negocios nuevos: la abre la tarjeta
   "¿Tu negocio apenas arranca?" (#servicios-inicio-abrir).
   Envío a Formspree con fetch; estados enviando / gracias / error
   dentro de la hoja. Convive con las otras capas del sitio:
   - no se abre si el Índice o la comanda de la carta están abiertos;
   - si el panel de la tarta está abierto, lo cierra antes (con su Esc);
   - mientras está abierta pone html.cmd-abierta, así la tarta se aparta
     igual que con las otras comandas, y html.servicios-inicio-abierta
     para bloquear el scroll de fondo.
   ============================================================ */
(function () {
    const $ = id => document.getElementById(id);
    const abrirBtn = $('servicios-inicio-abrir');
    const capa = $('servicios-inicio-capa');
    if (!abrirBtn || !capa) return;

    const papel = $('servicios-inicio-papel');
    const scroll = capa.querySelector('.servicios-inicio-scroll');
    const vistaForm = $('servicios-inicio-vista-form');
    const vistaGracias = $('servicios-inicio-gracias');
    const tituloGracias = $('servicios-inicio-gracias-titulo');
    const form = $('servicios-inicio-form');
    const errorEl = $('servicios-inicio-error');
    const enviarEl = $('servicios-inicio-enviar');
    const html = document.documentElement;

    let abierta = false;
    let opener = null;

    function otraCapaAbierta() {
        return document.body.classList.contains('overlay-open')   // Índice
            || html.classList.contains('cmd-abierta');             // comanda de la carta u otra hoja
    }

    function mostrarFormulario() {
        vistaGracias.hidden = true;
        vistaForm.hidden = false;
        errorEl.hidden = true;
    }

    function abrir() {
        if (abierta || otraCapaAbierta()) return;
        // panel de la tarta abierto: se cierra con su propio Esc antes de abrir la hoja
        if (document.querySelector('.tarta--panel')) {
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        }
        opener = document.activeElement;
        mostrarFormulario();
        abierta = true;
        capa.hidden = false;
        html.classList.add('servicios-inicio-abierta', 'cmd-abierta');
        scroll.scrollTop = 0;
        papel.focus({ preventScroll: true });
    }

    function cerrar() {
        if (!abierta) return;
        abierta = false;
        capa.hidden = true;
        html.classList.remove('servicios-inicio-abierta', 'cmd-abierta');
        if (!vistaGracias.hidden) mostrarFormulario();
        if (opener && document.contains(opener)) opener.focus();
        opener = null;
    }

    abrirBtn.addEventListener('click', abrir);
    $('servicios-inicio-cerrar').addEventListener('click', cerrar);
    $('servicios-inicio-volver').addEventListener('click', cerrar);
    capa.addEventListener('click', e => {
        if (e.target.hasAttribute('data-servicios-inicio-cerrar')) cerrar();
    });

    document.addEventListener('keydown', e => {
        if (!abierta) return;
        if (e.key === 'Escape') { e.preventDefault(); cerrar(); return; }
        if (e.key !== 'Tab') return;
        // el foco no sale de la hoja
        const focos = Array.from(papel.querySelectorAll(
            'button, input:not([type="hidden"]):not([tabindex="-1"]), select, textarea, [href], [tabindex]:not([tabindex="-1"])'
        )).filter(el => !el.disabled && el.offsetParent !== null);
        if (!focos.length) return;
        const primero = focos[0], ultimo = focos[focos.length - 1];
        if (e.shiftKey && (document.activeElement === primero || document.activeElement === papel)) {
            e.preventDefault();
            ultimo.focus();
        } else if (!e.shiftKey && document.activeElement === ultimo) {
            e.preventDefault();
            primero.focus();
        }
    });

    // ── envío a Formspree ───────────────────────────────────
    form.addEventListener('submit', async e => {
        e.preventDefault();
        if (!form.checkValidity()) { form.reportValidity(); return; }
        errorEl.hidden = true;
        enviarEl.disabled = true;
        enviarEl.textContent = 'Enviando…';
        try {
            const r = await fetch(form.action, {
                method: 'POST',
                body: new FormData(form),
                headers: { 'Accept': 'application/json' }
            });
            if (!r.ok) throw new Error('HTTP ' + r.status);
            form.reset();
            vistaForm.hidden = true;
            vistaGracias.hidden = false;
            scroll.scrollTop = 0;
            tituloGracias.focus();
        } catch (err) {
            errorEl.textContent = 'No pudimos enviar la comanda. Revisen la conexión e intenten de nuevo, o escríbannos a estudio@chiskey.com.';
            errorEl.hidden = false;
        } finally {
            enviarEl.disabled = false;
            enviarEl.textContent = 'Enviar comanda';
        }
    });
})();
