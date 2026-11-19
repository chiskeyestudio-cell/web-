// ==========================================================
// RESERVA · la comanda que abre el botón "Reservas" (y "Escribirnos")
// Es la misma hoja que La comanda de /servicios/.
//  - Si en la carta ya se eligieron platos (se guardan en el navegador,
//    clave "chiskey-comanda"), aparecen aquí con sus importes y totales.
//  - Si no, la tabla ofrece "Ver la carta"; se puede enviar sin elegir nada
//    (entonces Indicaciones es obligatoria).
//  - "Ver la carta" está siempre a mano para añadir o cambiar platos.
// En /servicios/ no se carga: allí Reservas abre la comanda de la carta (servicios.js).
// main.js llama a Reserva.abrir() desde openModal().
// Estilos: /reserva/reserva.css (todo bajo .rsv-capa).
// ==========================================================
(function () {
    const FORMSPREE = 'https://formspree.io/f/xyzovndj';   // el mismo destino de siempre
    // lo mismo que usa /servicios/servicios.js
    const DATA_URL = '/servicios/menus-data.json';
    const STORAGE_KEY = 'chiskey-comanda';
    const IVA_KEY = 'chiskey-comanda-iva';
    const IVA = 0.21;

    let capa = null, papel = null, form = null, vistaForm = null, vistaGracias = null;
    let errorEl = null, enviarEl = null, tituloGracias = null;
    let filasEl = null, pieEl = null, indicacionesEl = null, indicReqEl = null, pedidoEl = null;
    let ivaEl = null, subtotalEl = null, ivaFilaEl = null, ivaValorEl = null, totalEl = null, mensualFilaEl = null, mensualEl = null;
    let abierta = false, opener = null;

    // ── platos guardados desde la carta ─────────────────────
    let itemsPorId = null;      // se llena con menus-data.json la primera vez que hace falta
    let cargando = null;
    let seleccion = [];

    function leerGuardado() {
        try {
            const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
            return Array.isArray(raw) ? raw : [];
        } catch (e) { return []; }
    }
    function cargarCarta() {
        if (itemsPorId) return Promise.resolve();
        if (!cargando) {
            cargando = fetch(DATA_URL)
                .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
                .then(data => {
                    itemsPorId = {};
                    (data.menus || []).forEach(menu => {
                        const menuNombre = String(menu.titulo || '').replace(/^Menú\s+/i, '');
                        const reg = (item, tipo) => { itemsPorId[item.id] = { item, menuNombre, tipo }; };
                        (menu.packs || []).forEach(p => reg(p, 'pack'));
                        (menu.platos || []).forEach(p => reg(p, 'plato'));
                        ((menu.extra && menu.extra.platos) || []).forEach(p => reg(p, 'plato'));
                    });
                })
                .catch(() => { cargando = null; });
        }
        return cargando;
    }
    // acepta el formato viejo (lista de ids) y el nuevo ({ id, qty }), igual que servicios.js
    function seleccionValida() {
        if (!itemsPorId) return [];
        const vistos = new Set();
        return leerGuardado()
            .map(x => typeof x === 'string' ? { id: x, qty: 1 } : x)
            .filter(x => x && itemsPorId[x.id] && !vistos.has(x.id) && vistos.add(x.id))
            .map(x => ({ id: x.id, qty: Math.max(1, Math.min(99, parseInt(x.qty, 10) || 1)) }));
    }
    // si hay platos guardados, la carta se pide en segundo plano para que esté lista al abrir
    if (leerGuardado().length) {
        const pedir = () => cargarCarta();
        if ('requestIdleCallback' in window) requestIdleCallback(pedir, { timeout: 2500 }); else setTimeout(pedir, 800);
    }

    // ── utilidades (las mismas cuentas que servicios.js) ────
    function euros(n) {
        const r = Math.round(n * 100) / 100;
        const entero = Math.trunc(r);
        const dec = Math.round(Math.abs(r - entero) * 100);
        const miles = String(Math.abs(entero)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
        return (r < 0 ? '-' : '') + miles + (dec ? ',' + String(dec).padStart(2, '0') : '') + ' €';
    }
    function nombreEnComanda(e) { return e.tipo === 'pack' ? 'Pack ' + e.item.nombre : e.item.nombre; }
    function importe(e, qty) {
        if (typeof e.item.monto !== 'number') return e.item.precio || 'a cotizar';
        return euros(e.item.monto * qty) + (e.item.periodo === 'mes' ? '/mes' : '');
    }
    function calcular() {
        let unico = 0, mensual = 0, sinMonto = 0;
        seleccion.forEach(({ id, qty }) => {
            const { item } = itemsPorId[id];
            if (typeof item.monto !== 'number') { sinMonto += qty; return; }
            if (item.periodo === 'mes') mensual += item.monto * qty;
            else unico += item.monto * qty;
        });
        const conIva = !!(ivaEl && ivaEl.checked);
        const iva = conIva ? Math.round(unico * IVA * 100) / 100 : 0;
        return { unico, iva, total: unico + iva, mensual, mensualFinal: conIva ? Math.round(mensual * (1 + IVA) * 100) / 100 : mensual, sinMonto, conIva };
    }
    function fechaHoy() {
        const d = new Date();
        return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear();
    }
    // texto legible del pedido: va en el campo "pedido", como en servicios
    function textoPedido() {
        const lineas = ['LA COMANDA · Chiskey · Folio 2027', 'Fecha: ' + fechaHoy(), '----------------------------------------'];
        if (!seleccion.length) {
            lineas.push('(sin platos elegidos: ver Indicaciones)');
            return lineas.join('\n');
        }
        const c = calcular();
        seleccion.forEach(({ id, qty }) => {
            const e = itemsPorId[id];
            lineas.push(qty + ' × ' + nombreEnComanda(e) + ' [' + e.menuNombre + '] — ' + importe(e, qty));
        });
        lineas.push('----------------------------------------');
        if (c.unico || !c.mensual) {
            lineas.push('Subtotal: ' + euros(c.unico));
            lineas.push(c.conIva ? 'IVA (21%): ' + euros(c.iva) : 'IVA (21%): no incluido');
            lineas.push('Total: ' + euros(c.total) + (c.conIva ? ' (IVA incluido)' : ' + IVA'));
        }
        if (c.mensual) lineas.push('Mensual: ' + euros(c.mensualFinal) + '/mes' + (c.conIva ? ' (IVA incluido)' : ' + IVA'));
        if (c.sinMonto) lineas.push('A cotizar en la mesa: ' + c.sinMonto + (c.sinMonto === 1 ? ' plato' : ' platos'));
        lineas.push('Estimado orientativo. Cerramos el precio final al sentarnos a la mesa.');
        return lineas.join('\n');
    }

    // ── piezas de la hoja ───────────────────────────────────
    function crear(tag, clase, texto) {
        const el = document.createElement(tag);
        if (clase) el.className = clase;
        if (texto != null) el.textContent = texto;
        return el;
    }
    function campo(clase, id, etiqueta, input, obligatorio) {
        const div = crear('div', 'rsv-campo rsv-campo--' + clase);
        const label = crear('label', null, etiqueta);
        label.htmlFor = id;
        if (obligatorio) {
            label.appendChild(document.createTextNode(' '));
            const req = crear('span', 'rsv-req', '*');
            req.setAttribute('aria-hidden', 'true');
            label.appendChild(req);
            if (clase === 'indicaciones') indicReqEl = req;
        }
        input.id = id;
        div.append(label, input);
        return div;
    }
    function entrada(tipo, nombre, placeholder, extra) {
        const i = document.createElement('input');
        i.type = tipo;
        i.name = nombre;
        if (placeholder) i.placeholder = placeholder;
        Object.keys(extra || {}).forEach(k => i.setAttribute(k, extra[k]));
        return i;
    }
    function verCarta() {
        const a = crear('a', 'rsv-ver-carta', 'Ver la carta');
        a.href = '/servicios/';
        // si la carta ya está en esta página (/servicios/), no recarga: cierra la comanda y sube a la carta
        a.addEventListener('click', e => {
            const carta = document.querySelector('.cr-carta');
            if (!carta) return;
            e.preventDefault();
            cerrar();
            const quieta = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
            carta.scrollIntoView({ behavior: quieta ? 'auto' : 'smooth', block: 'start' });
        });
        return a;
    }

    // ── la hoja (se construye la primera vez que se abre) ───
    function construir() {
        capa = crear('div', 'rsv-capa');
        capa.hidden = true;
        const fondo = crear('div', 'rsv-fondo');
        fondo.setAttribute('data-rsv-cerrar', '');
        const scroll = crear('div', 'rsv-scroll');
        scroll.setAttribute('data-rsv-cerrar', '');

        papel = crear('div', 'rsv-papel');
        papel.setAttribute('role', 'dialog');
        papel.setAttribute('aria-modal', 'true');
        papel.setAttribute('aria-labelledby', 'rsv-titulo');
        papel.tabIndex = -1;

        const barra = crear('div', 'rsv-barra');
        const cerrarBtn = crear('button', 'rsv-cerrar');
        cerrarBtn.type = 'button';
        cerrarBtn.setAttribute('aria-label', 'Cerrar la comanda');
        cerrarBtn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>';
        cerrarBtn.addEventListener('click', cerrar);
        barra.appendChild(cerrarBtn);

        // vista del formulario
        vistaForm = crear('div', 'rsv-vista-form');
        const cab = crear('div', 'rsv-cabecera');
        const h2 = crear('h2', 'rsv-titulo', 'La comanda');
        h2.id = 'rsv-titulo';
        cab.append(h2, crear('span', 'rsv-folio', 'Folio 2027'));
        vistaForm.append(cab, crear('p', 'rsv-respuesta', 'Tiempo de respuesta: 2 horas'));

        form = crear('form', 'rsv-form');
        form.action = FORMSPREE;
        form.method = 'POST';
        const asunto = entrada('hidden', '_subject');
        asunto.value = 'Reserva desde la web (' + (location.pathname || '/') + ')';
        pedidoEl = entrada('hidden', 'pedido');
        form.append(asunto, pedidoEl);

        const campos = crear('div', 'rsv-campos');
        indicacionesEl = document.createElement('textarea');
        indicacionesEl.name = 'indicaciones';
        indicacionesEl.rows = 1;
        indicacionesEl.placeholder = 'qué necesitan o qué ya tienen';
        campos.append(
            campo('comensal', 'rsv-nombre', 'Comensal', entrada('text', 'nombre', 'nombre', { autocomplete: 'name', required: '' }), true),
            campo('mail', 'rsv-correo', 'Mail', entrada('email', 'correo', 'correo', { autocomplete: 'email', required: '' }), true),
            campo('tel', 'rsv-movil', 'Teléfono', entrada('tel', 'movil', 'móvil', { autocomplete: 'tel', required: '' }), true),
            campo('marca', 'rsv-marca', 'Marca', entrada('text', 'marca', 'o proyecto', { autocomplete: 'organization' })),
            campo('indicaciones', 'rsv-indicaciones', 'Indicaciones', indicacionesEl, true)
        );
        form.appendChild(campos);

        // tabla Cantidad / Concepto / Importe
        const wrap = crear('div', 'rsv-tabla-wrap');
        const tabla = crear('table', 'rsv-tabla');
        tabla.appendChild(crear('caption', 'rsv-sr', 'Platos de la comanda'));
        const cols = crear('colgroup');
        cols.append(crear('col', 'rsv-col-cant'), crear('col'), crear('col', 'rsv-col-imp'));
        tabla.appendChild(cols);
        const thead = crear('thead');
        const trh = crear('tr');
        ['Cantidad', 'Concepto', 'Importe'].forEach(t => { const th = crear('th', null, t); th.scope = 'col'; trh.appendChild(th); });
        thead.appendChild(trh);
        tabla.appendChild(thead);
        filasEl = crear('tbody');
        tabla.appendChild(filasEl);
        wrap.appendChild(tabla);
        form.appendChild(wrap);

        // con platos: "Ver la carta" + IVA + totales (los mismos de servicios)
        pieEl = crear('div', 'rsv-pie');
        const izq = crear('div', 'rsv-pie-izq');
        izq.appendChild(verCarta());
        const ivaLabel = crear('label', 'rsv-iva');
        ivaEl = entrada('checkbox', '', '');
        ivaEl.removeAttribute('name');
        ivaEl.id = 'rsv-iva';
        ivaLabel.append(ivaEl, crear('span', null, 'incluir IVA (21%)'));
        izq.appendChild(ivaLabel);
        const totales = crear('dl', 'rsv-totales');
        const filaTotal = (dt, clase) => { const d = crear('div', 'rsv-total-fila' + (clase ? ' ' + clase : '')); const dd = crear('dd', null, '0 €'); d.append(crear('dt', null, dt), dd); totales.appendChild(d); return [d, dd]; };
        subtotalEl = filaTotal('Subtotal')[1];
        [ivaFilaEl, ivaValorEl] = filaTotal('IVA (21%)');
        totalEl = filaTotal('Total', 'rsv-total-fila--total')[1];
        [mensualFilaEl, mensualEl] = filaTotal('Mensual');
        pieEl.append(izq, totales);
        form.appendChild(pieEl);
        const honesto = crear('p', 'rsv-honesto', 'Estimado orientativo. Cerramos el precio final al sentarnos a la mesa.');
        form.appendChild(honesto);
        pieEl.honesto = honesto;
        ivaEl.addEventListener('change', () => {
            try { localStorage.setItem(IVA_KEY, ivaEl.checked ? '1' : '0'); } catch (e) {}
            pintarTotales();
        });

        errorEl = crear('p', 'rsv-error');
        errorEl.setAttribute('role', 'alert');
        errorEl.hidden = true;
        form.appendChild(errorEl);

        const acciones = crear('div', 'rsv-acciones');
        enviarEl = crear('button', 'rsv-enviar', 'Enviar comanda');
        enviarEl.type = 'submit';
        acciones.appendChild(enviarEl);
        form.appendChild(acciones);
        form.addEventListener('submit', enviar);
        vistaForm.appendChild(form);

        // vista de gracias
        vistaGracias = crear('div', 'rsv-gracias');
        vistaGracias.hidden = true;
        const img = crear('img', 'rsv-gracias-img');
        img.src = 'https://res.cloudinary.com/dxsip0hvb/image/upload/v1764262991/Adobe_Express_-_chiskeygif_pnho3f.gif';
        img.alt = '';
        tituloGracias = crear('h2', 'rsv-gracias-titulo', 'Comanda en cocina');
        tituloGracias.tabIndex = -1;
        const volver = crear('button', 'rsv-volver', 'Cerrar');
        volver.type = 'button';
        volver.addEventListener('click', cerrar);
        vistaGracias.append(img, tituloGracias,
            crear('p', null, 'Gracias por tu reserva. Te contestaremos lo antes posible.'),
            crear('p', 'rsv-respuesta', 'Tiempo de respuesta: 2 horas'),
            volver);

        papel.append(barra, vistaForm, vistaGracias);
        scroll.appendChild(papel);
        capa.append(fondo, scroll);
        capa.addEventListener('click', e => { if (e.target.hasAttribute('data-rsv-cerrar')) cerrar(); });
        document.body.appendChild(capa);
    }

    // ── pintar lo pedido ────────────────────────────────────
    function pintarTotales() {
        if (!seleccion.length) return;
        const c = calcular();
        subtotalEl.textContent = euros(c.unico);
        ivaFilaEl.hidden = !c.conIva;
        ivaValorEl.textContent = euros(c.iva);
        totalEl.textContent = euros(c.total);
        mensualFilaEl.hidden = !c.mensual;
        mensualEl.textContent = euros(c.mensualFinal) + '/mes';
        pedidoEl.value = textoPedido();
    }

    function pintarPedido() {
        seleccion = seleccionValida();
        filasEl.textContent = '';
        if (!seleccion.length) {
            // sin platos: el aviso con "Ver la carta"
            const tr = crear('tr');
            const td = crear('td');
            td.appendChild(crear('span', 'rsv-vacia', 'Todavía no hay pedidos. Pueden elegirlos en la carta o contarnos todo en Indicaciones.'));
            td.appendChild(verCarta());
            tr.append(crear('td'), td, crear('td'));
            filasEl.appendChild(tr);
        } else {
            seleccion.forEach(({ id, qty }) => {
                const e = itemsPorId[id];
                const tr = crear('tr');
                tr.appendChild(crear('td', 'rsv-td-cant', String(qty)));
                const td = crear('td');
                td.append(crear('span', 'rsv-concepto-nombre', nombreEnComanda(e)), crear('span', 'rsv-concepto-menu', e.menuNombre));
                tr.append(td, crear('td', 'rsv-td-importe', importe(e, qty)));
                filasEl.appendChild(tr);
            });
        }
        // sin renglones vacíos: la tabla solo tiene el aviso o lo pedido (crece con lo que se agrega)

        const hay = seleccion.length > 0;
        pieEl.hidden = !hay;
        pieEl.honesto.hidden = !hay;
        try { ivaEl.checked = localStorage.getItem(IVA_KEY) === '1'; } catch (e) {}
        // sin platos, Indicaciones es la consulta: obligatoria
        indicacionesEl.required = !hay;
        indicReqEl.hidden = hay;
        pedidoEl.value = textoPedido();
        pintarTotales();
    }

    // ── abrir / cerrar ──────────────────────────────────────
    function mostrarFormulario() {
        vistaGracias.hidden = true;
        vistaForm.hidden = false;
        errorEl.hidden = true;
    }

    function abrir() {
        if (!capa) construir();
        if (abierta) return;
        opener = document.activeElement;
        if (!vistaGracias.hidden) mostrarFormulario();
        abierta = true;
        capa.hidden = false;
        // cmd-abierta: la tarta flotante se aparta igual que con la comanda de servicios
        document.documentElement.classList.add('rsv-abierta', 'cmd-abierta');
        capa.querySelector('.rsv-scroll').scrollTop = 0;
        pintarPedido();
        papel.focus({ preventScroll: true });
        // si hay platos guardados y la carta aún no llegó, se pintan en cuanto llegue
        if (leerGuardado().length && !itemsPorId) cargarCarta().then(() => { if (abierta && vistaGracias.hidden) pintarPedido(); });
    }

    function cerrar() {
        if (!abierta) return;
        abierta = false;
        capa.hidden = true;
        document.documentElement.classList.remove('rsv-abierta', 'cmd-abierta');
        if (!vistaGracias.hidden) mostrarFormulario();
        if (opener && document.contains(opener)) opener.focus();
        opener = null;
    }

    document.addEventListener('keydown', e => {
        if (!abierta) return;
        if (e.key === 'Escape') { e.preventDefault(); cerrar(); return; }
        if (e.key !== 'Tab') return;
        // el foco no sale de la hoja
        const focos = Array.from(papel.querySelectorAll(
            'button, input:not([type="hidden"]):not([tabindex="-1"]), textarea, [href], [tabindex]:not([tabindex="-1"])'
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
    async function enviar(e) {
        e.preventDefault();
        if (!form.checkValidity()) { form.reportValidity(); return; }
        pedidoEl.value = textoPedido();
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
            // como en servicios: enviada la comanda, los platos elegidos se vacían
            if (seleccion.length) { try { localStorage.setItem(STORAGE_KEY, '[]'); } catch (e2) {} }
            vistaForm.hidden = true;
            vistaGracias.hidden = false;
            capa.querySelector('.rsv-scroll').scrollTop = 0;
            tituloGracias.focus();
        } catch (err) {
            errorEl.textContent = 'No pudimos enviar la comanda. Revisen la conexión e intenten de nuevo, o escríbannos a estudio@chiskey.com.';
            errorEl.hidden = false;
        } finally {
            enviarEl.disabled = false;
            enviarEl.textContent = 'Enviar comanda';
        }
    }

    window.Reserva = { abrir, cerrar };
})();
