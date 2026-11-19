// ==========================================================
// LA CARTA · /servicios/
// Pinta los menús desde menus-data.json (precios y textos tal
// cual), arma La comanda (una sola hoja: revisar, completar y
// enviar a Formspree) y el botón flotante.
// No usa los ids del modal global (#myModal, #reservaForm…):
// ese sigue siendo el de Reservas y lo maneja main.js.
// ==========================================================
(function () {
    const DATA_URL = '/servicios/menus-data.json';
    const STORAGE_KEY = 'chiskey-comanda';
    const IVA_KEY = 'chiskey-comanda-iva';
    const IVA = 0.21;
    const FILAS_LIBRES = 1; // líneas vacías bajo lo pedido
    // dos páginas, una base: <body data-modo="menus"> (/servicios/, solo packs)
    // o data-modo="completo" (/servicios-completos/, packs y platos individuales)
    const MODO_MENUS = document.body.dataset.modo === 'menus';
    // en modo menús, un texto del JSON puede tener su versión *_menus ("" = no se muestra)
    const texto = (menu, campo) => (MODO_MENUS && (campo + '_menus') in menu) ? menu[campo + '_menus'] : menu[campo];

    const $ = id => document.getElementById(id);
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

    // carta
    const tabsEl = $('cr-tabs');
    const panelEl = $('cr-panel');
    const notaGlobalEl = $('cr-nota-global');
    const flotanteEl = $('cr-flotante');
    const flotanteResumenEl = $('cr-flotante-resumen');
    const flotanteBadgeEl = $('cr-flotante-badge');
    const toastEl = $('cr-toast');

    // el botón "Tu comanda" se desvanece cuando el footer entra en pantalla,
    // así el footer queda en su sitio (como en todas las páginas) sin quedar tapado
    const pie = document.querySelector('.footer');
    if (pie && flotanteEl && 'IntersectionObserver' in window) {
        new IntersectionObserver(([e]) => flotanteEl.classList.toggle('is-oculto', e.isIntersecting))
            .observe(pie);
    }

    // comanda
    const capaEl = $('cmd-capa');
    const papelEl = $('cmd-papel');
    const vistaFormEl = $('cmd-vista-form');
    const vistaGraciasEl = $('cmd-vista-gracias');
    const formEl = $('cmd-form');
    const filasEl = $('cmd-filas');
    const pedidoEl = $('cmd-pedido');
    const indicacionesEl = $('cmd-indicaciones');
    const indicacionesReqEl = $('cmd-indicaciones-req');
    const ivaEl = $('cmd-iva');
    const subtotalEl = $('cmd-subtotal');
    const ivaFilaEl = $('cmd-iva-fila');
    const ivaValorEl = $('cmd-iva-valor');
    const totalEl = $('cmd-total');
    const mensualFilaEl = $('cmd-mensual-fila');
    const mensualEl = $('cmd-mensual');
    const errorEl = $('cmd-error');
    const enviarEl = $('cmd-enviar');
    const copiarEl = $('cmd-copiar');

    let menus = [];
    const itemsPorId = {};   // id → { item, menu, menuNombre, tipo }
    let seleccion = [];      // [{ id, qty }] en el orden en que se agregaron
    let activo = null;
    let abierta = false;
    let opener = null;
    const nuevos = new Set(); // platos agregados desde la última vez que se vio la comanda

    // ── utilidades ──────────────────────────────────────────
    // 1550 → "1.550 €" · 325.5 → "325,50 €"
    function euros(n) {
        const r = Math.round(n * 100) / 100;
        const entero = Math.trunc(r);
        const dec = Math.round(Math.abs(r - entero) * 100);
        const miles = String(Math.abs(entero)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
        return (r < 0 ? '-' : '') + miles + (dec ? ',' + String(dec).padStart(2, '0') : '') + ' €';
    }

    // "Menú Web / App" → "Web / App"
    function nombreCorto(menu) {
        return menu.titulo.replace(/^Menú\s+/i, '');
    }

    function crear(tag, clase, texto) {
        const el = document.createElement(tag);
        if (clase) el.className = clase;
        if (texto != null) el.textContent = texto;
        return el;
    }

    const SVG_NS = 'http://www.w3.org/2000/svg';
    function svg(clase, viewBox, d) {
        const s = document.createElementNS(SVG_NS, 'svg');
        if (clase) s.setAttribute('class', clase);
        s.setAttribute('viewBox', viewBox);
        s.setAttribute('aria-hidden', 'true');
        s.setAttribute('focusable', 'false');
        const p = document.createElementNS(SVG_NS, 'path');
        p.setAttribute('d', d);
        s.appendChild(p);
        return s;
    }
    const MAS = 'M12 5v14M5 12h14';
    const MENOS = 'M5 12h14';

    function reiniciarAnimacion(el, clase) {
        if (reduce.matches || !el) return;
        el.classList.remove(clase);
        void el.offsetWidth;
        el.classList.add(clase);
        el.addEventListener('animationend', () => el.classList.remove(clase), { once: true });
    }

    // ── guardado ────────────────────────────────────────────
    function guardar() {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(seleccion)); } catch (e) {}
    }
    // acepta el formato viejo (lista de ids) y el nuevo ({ id, qty })
    function cargarGuardado() {
        try {
            const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
            if (!Array.isArray(raw)) return [];
            const vistos = new Set();
            return raw
                .map(x => typeof x === 'string' ? { id: x, qty: 1 } : x)
                .filter(x => x && itemsPorId[x.id] && !vistos.has(x.id) && vistos.add(x.id))
                .map(x => ({ id: x.id, qty: Math.max(1, Math.min(99, parseInt(x.qty, 10) || 1)) }));
        } catch (e) {
            return [];
        }
    }

    function qtyDe(id) {
        const e = seleccion.find(x => x.id === id);
        return e ? e.qty : 0;
    }

    function nombreEnComanda(entrada) {
        return entrada.tipo === 'pack' ? 'Pack ' + entrada.item.nombre : entrada.item.nombre;
    }

    // ── cápsula de menús ────────────────────────────────────
    function pintarTabs() {
        menus.forEach(menu => {
            const tab = crear('button', 'cr-tab');
            tab.type = 'button';
            tab.id = 'cr-tab-' + menu.id;
            tab.dataset.menu = menu.id;
            tab.setAttribute('role', 'tab');
            tab.setAttribute('aria-controls', 'cr-panel');
            tab.setAttribute('aria-selected', 'false');
            tab.tabIndex = -1;
            // un asterisco junto a cada menú (decorativo)
            const sello = crear('span', 'cr-sello', '*');
            sello.setAttribute('aria-hidden', 'true');
            tab.appendChild(sello);
            tab.appendChild(crear('span', null, nombreCorto(menu)));
            tab.addEventListener('click', () => activarMenu(menu.id, { usuario: true }));
            tabsEl.appendChild(tab);
        });

        // flechas, Inicio y Fin para moverse entre menús
        tabsEl.addEventListener('keydown', e => {
            const tabs = Array.from(tabsEl.querySelectorAll('.cr-tab'));
            const i = tabs.indexOf(document.activeElement);
            if (i === -1) return;
            let destino = null;
            if (e.key === 'ArrowRight') destino = tabs[(i + 1) % tabs.length];
            if (e.key === 'ArrowLeft') destino = tabs[(i - 1 + tabs.length) % tabs.length];
            if (e.key === 'Home') destino = tabs[0];
            if (e.key === 'End') destino = tabs[tabs.length - 1];
            if (destino) {
                e.preventDefault();
                destino.focus();
                activarMenu(destino.dataset.menu, { usuario: true });
            }
        });
    }

    // flechas de la cápsula: se muestran solo del lado donde quedan opciones ocultas
    const capsulaEl = document.querySelector('.cr-capsula');
    function actualizarFlechas() {
        const max = tabsEl.scrollWidth - tabsEl.clientWidth;
        capsulaEl.classList.toggle('puede-izq', tabsEl.scrollLeft > 4);
        capsulaEl.classList.toggle('puede-der', tabsEl.scrollLeft < max - 4);
    }
    function moverTabs(sentido) {
        tabsEl.scrollBy({ left: sentido * tabsEl.clientWidth * 0.6, behavior: reduce.matches ? 'auto' : 'smooth' });
    }
    tabsEl.addEventListener('scroll', actualizarFlechas, { passive: true });
    window.addEventListener('resize', actualizarFlechas);
    $('cr-flecha-der').addEventListener('click', () => moverTabs(1));
    $('cr-flecha-izq').addEventListener('click', () => moverTabs(-1));

    // centra la pestaña activa dentro de la cápsula (solo scroll horizontal)
    function centrarTab(tab, suave) {
        const r = tab.getBoundingClientRect();
        const c = tabsEl.getBoundingClientRect();
        const delta = (r.left - c.left) - (c.width - r.width) / 2;
        if (Math.abs(delta) > 2) {
            tabsEl.scrollBy({ left: delta, behavior: suave && !reduce.matches ? 'smooth' : 'auto' });
        }
    }

    let cambioPendiente = null;
    function activarMenu(id, opciones) {
        const usuario = opciones && opciones.usuario;
        if (id === activo) return;
        const menu = menus.find(m => m.id === id);
        if (!menu) return;
        const primera = activo === null;
        activo = id;

        tabsEl.querySelectorAll('.cr-tab').forEach(tab => {
            const sel = tab.dataset.menu === id;
            tab.setAttribute('aria-selected', sel ? 'true' : 'false');
            tab.tabIndex = sel ? 0 : -1;
            if (sel) centrarTab(tab, usuario);
        });
        panelEl.setAttribute('aria-labelledby', 'cr-tab-' + id);

        // permite compartir un menú directo: /servicios/#redes
        if (usuario) {
            try { history.replaceState(null, '', '#' + id); } catch (e) {}
        }

        clearTimeout(cambioPendiente);
        if (primera || reduce.matches) {
            pintarPanel(menu);
            if (usuario) llevarArriba();
            return;
        }
        panelEl.classList.remove('is-entrando');
        panelEl.classList.add('is-saliendo');
        cambioPendiente = setTimeout(() => {
            pintarPanel(menu);
            panelEl.classList.remove('is-saliendo');
            reiniciarAnimacion(panelEl, 'is-entrando');
            if (usuario) llevarArriba();
        }, 140);
    }

    // si el título quedó arriba de la pantalla, vuelve a él (debajo de la cápsula)
    function llevarArriba() {
        const capsula = document.querySelector('.cr-capsula-wrap');
        const alto = capsula ? capsula.getBoundingClientRect().height + 20 : 80;
        const top = panelEl.getBoundingClientRect().top;
        if (top < alto) {
            window.scrollTo({ top: window.scrollY + top - alto, behavior: reduce.matches ? 'auto' : 'smooth' });
        }
    }

    // ── contenido del menú activo ───────────────────────────
    function bloqueHead(titulo) {
        const head = crear('div', 'cr-bloque-head');
        head.appendChild(crear('h2', 'cr-bloque-titulo', titulo));
        return head;
    }

    function pintarPack(pack, menu) {
        const art = crear('article', 'cr-pack');
        art.dataset.item = pack.id;
        art.appendChild(crear('h3', 'cr-pack-nombre', pack.nombre));
        if (pack.app) {
            // packs de Web / App: la descripción y, debajo, su línea propia de app móvil
            // (en el mismo bloque, así ocupan juntas el área "desc" de la tarjeta)
            const desc = crear('div', 'cr-pack-desc');
            const web = crear('p', 'cr-pack-desc-texto');
            web.append(crear('strong', null, 'Web: '), document.createTextNode(pack.descripcion));
            desc.appendChild(web);
            const app = crear('p', 'cr-pack-app');
            app.append(crear('strong', null, 'App móvil: '), document.createTextNode(pack.app));
            desc.appendChild(app);
            art.appendChild(desc);
        } else {
            art.appendChild(crear('p', 'cr-pack-desc', pack.descripcion));
        }
        // precio de pack: "Desde" pequeño encima de la cifra
        const precio = crear('span', 'cr-pack-precio');
        precio.append(crear('span', 'cr-pack-desde', 'Desde '), document.createTextNode(pack.precio));
        art.appendChild(precio);

        // "plato por plato" vs pack (solo si el pack trae `suelto` y sale más caro suelto)
        // (en modo menús no hay platos sueltos en la página: no se compara con ellos)
        if (!MODO_MENUS && typeof pack.suelto === 'number' && typeof pack.monto === 'number' && pack.suelto > pack.monto) {
            const ah = crear('p', 'cr-pack-ahorro');
            ah.appendChild(document.createTextNode('Plato por plato '));
            ah.appendChild(crear('s', null, euros(pack.suelto)));
            ah.appendChild(document.createTextNode(' · '));
            ah.appendChild(crear('strong', null, 'Ahorran ' + euros(pack.suelto - pack.monto)));
            art.appendChild(ah);
        }

        const ctl = crear('div', 'cr-ctl');
        ctl.dataset.ctl = pack.id;
        art.appendChild(ctl);
        pintarCtl(ctl, pack.id);
        return art;
    }

    function pintarPlatos(platos) {
        const ul = crear('ul', 'cr-platos');
        platos.forEach(plato => {
            const li = crear('li', 'cr-plato');
            li.dataset.item = plato.id;
            const texto = crear('div', 'cr-plato-texto');
            texto.appendChild(crear('h3', 'cr-plato-nombre', plato.nombre));
            if (plato.descripcion) texto.appendChild(crear('p', 'cr-plato-desc', plato.descripcion));
            li.appendChild(texto);
            li.appendChild(crear('span', 'cr-plato-precio', plato.precio));
            const ctl = crear('div', 'cr-ctl');
            ctl.dataset.ctl = plato.id;
            li.appendChild(ctl);
            pintarCtl(ctl, plato.id);
            ul.appendChild(li);
        });
        return ul;
    }

    let cabeceraPintada = false;
    function pintarPanel(menu) {
        panelEl.textContent = '';

        const cab = crear('header', 'cr-cabecera');
        // fundido común de entrada (/entrada.css): solo en el primer pintado,
        // así no se repite al cambiar de menú
        if (!cabeceraPintada) cab.classList.add('fade-entrada');
        cabeceraPintada = true;
        // "Menú" en regular y el nombre del menú en bold
        const h1 = crear('h1', 'cr-titulo');
        h1.id = 'cr-titulo';
        const partes = menu.titulo.match(/^(Menú)\s+(.+)$/i);
        // el título grande con solo la primera letra en mayúscula: "Menú branding"
        // (solo aquí: el dato sigue igual para pestañas, comanda y email)
        const minus = s => s.toLocaleLowerCase('es');
        const frase = s => { const m = minus(s); return m.charAt(0).toLocaleUpperCase('es') + m.slice(1); };
        if (partes) {
            h1.appendChild(crear('span', 'cr-titulo-menu', frase(partes[1])));
            h1.appendChild(document.createTextNode(' ' + minus(partes[2])));
        } else {
            h1.textContent = frase(menu.titulo);
        }
        cab.appendChild(h1);
        const intro = texto(menu, 'intro'), aclaracion = texto(menu, 'aclaracion');
        if (intro) cab.appendChild(crear('p', 'cr-intro', intro));
        if (aclaracion) cab.appendChild(crear('p', 'cr-aclaracion', aclaracion));

        if (menu.nota) {
            const nota = crear('div', 'cr-nota');
            if (menu.nota.titulo) nota.appendChild(crear('strong', null, menu.nota.titulo));
            nota.appendChild(document.createTextNode(menu.nota.texto || ''));
            // si la nota menciona otro menú ("Menú Web"), ofrece ir a él
            const destino = menus.find(m => m.id !== menu.id &&
                (menu.nota.texto || '').includes('Menú ' + nombreCorto(m).split(/[\s/]/)[0]));
            if (destino) {
                const ir = crear('button', 'cr-nota-link', 'Ver el ' + destino.titulo + ' →');
                ir.type = 'button';
                ir.addEventListener('click', () => {
                    activarMenu(destino.id, { usuario: true });
                    const t = $('cr-tab-' + destino.id);
                    if (t) t.focus();
                });
                nota.appendChild(document.createElement('br'));
                nota.appendChild(ir);
            }
            cab.appendChild(nota);
        }
        panelEl.appendChild(cab);

        if (menu.packs && menu.packs.length) {
            const sec = crear('section', 'cr-bloque');
            sec.appendChild(bloqueHead('Packs'));
            menu.packs.forEach(p => sec.appendChild(pintarPack(p, menu)));
            panelEl.appendChild(sec);
        }
        // platos individuales y extra (app): solo en /servicios-completos/
        if (MODO_MENUS) return;
        if (menu.platos && menu.platos.length) {
            const sec = crear('section', 'cr-bloque');
            sec.appendChild(bloqueHead('Platos individuales'));
            sec.appendChild(pintarPlatos(menu.platos));
            panelEl.appendChild(sec);
        }
        if (menu.extra && menu.extra.platos && menu.extra.platos.length) {
            const sec = crear('section', 'cr-bloque');
            sec.appendChild(bloqueHead(menu.extra.titulo || 'Extra'));
            sec.appendChild(pintarPlatos(menu.extra.platos));
            panelEl.appendChild(sec);
        }
    }

    // control de cada pack/plato: Agregar o "+" → stepper − n +
    function pintarCtl(ctl, id) {
        const e = itemsPorId[id];
        const qty = qtyDe(id);
        const nombre = nombreEnComanda(e) + ' de ' + e.menuNombre;
        ctl.textContent = '';

        const fila = ctl.closest('[data-item]');
        if (fila) fila.classList.toggle('is-added', qty > 0);

        if (!qty) {
            let btn;
            if (e.tipo === 'pack') {
                btn = crear('button', 'cr-agregar', 'Agregar');
            } else {
                btn = crear('button', 'cr-mas');
                btn.appendChild(svg(null, '0 0 24 24', MAS));
            }
            btn.type = 'button';
            btn.dataset.act = 'sumar';
            btn.dataset.id = id;
            btn.setAttribute('aria-label', 'Agregar ' + nombre + ' a la comanda, ' + e.item.precio);
            ctl.appendChild(btn);
            return;
        }

        const grupo = crear('div', 'cr-stepper');
        grupo.setAttribute('role', 'group');
        grupo.setAttribute('aria-label', nombre + ' en la comanda');
        const menos = crear('button', 'cr-paso');
        menos.type = 'button';
        menos.dataset.act = 'restar';
        menos.dataset.id = id;
        menos.setAttribute('aria-label', qty === 1 ? 'Quitar ' + nombre + ' de la comanda' : 'Restar uno de ' + nombre);
        menos.appendChild(svg(null, '0 0 24 24', MENOS));
        const cant = crear('span', 'cr-cant', String(qty));
        cant.setAttribute('aria-label', 'Cantidad: ' + qty);
        const mas = crear('button', 'cr-paso');
        mas.type = 'button';
        mas.dataset.act = 'sumar';
        mas.dataset.id = id;
        mas.setAttribute('aria-label', 'Sumar otro ' + nombre);
        mas.appendChild(svg(null, '0 0 24 24', MAS));
        grupo.append(menos, cant, mas);
        ctl.appendChild(grupo);
    }

    // ── cambios en la comanda ───────────────────────────────
    function cambiar(id, delta) {
        const e = itemsPorId[id];
        if (!e) return;
        const antes = qtyDe(id);
        const despues = Math.max(0, Math.min(99, antes + delta));
        if (despues === antes) return;

        if (despues === 0) {
            seleccion = seleccion.filter(x => x.id !== id);
            nuevos.delete(id);
            toast('Fuera de la comanda: ' + nombreEnComanda(e));
        } else if (antes === 0) {
            seleccion.push({ id, qty: despues });
            nuevos.add(id);
            toast(nombreEnComanda(e) + ' · ' + e.menuNombre + ', a la comanda');
        } else {
            seleccion.find(x => x.id === id).qty = despues;
        }
        guardar();
        refrescarCtl(id, antes, despues);
        pintarComanda();
        reiniciarAnimacion(flotanteEl, 'is-bump');
    }

    // repinta el control en la carta sin perder el foco del teclado
    function refrescarCtl(id, antes, despues) {
        panelEl.querySelectorAll('[data-ctl="' + id + '"]').forEach(ctl => {
            const tenia = ctl.contains(document.activeElement) ? document.activeElement.dataset.act : null;
            pintarCtl(ctl, id);
            if ((antes === 0) !== (despues === 0)) reiniciarAnimacion(ctl, 'is-recien');
            else reiniciarAnimacion(ctl.querySelector('.cr-cant'), 'is-pop');
            if (tenia) {
                const destino = ctl.querySelector('[data-act="' + tenia + '"]') || ctl.querySelector('[data-act]');
                if (destino) destino.focus();
            }
        });
    }

    function vaciar() {
        seleccion = [];
        nuevos.clear();
        guardar();
        panelEl.querySelectorAll('[data-ctl]').forEach(ctl => pintarCtl(ctl, ctl.dataset.ctl));
        pintarComanda();
    }

    // ── cuentas ─────────────────────────────────────────────
    function calcular() {
        let unico = 0, mensual = 0, sinMonto = 0, platos = 0;
        seleccion.forEach(({ id, qty }) => {
            const { item } = itemsPorId[id];
            platos += qty;
            if (typeof item.monto !== 'number') { sinMonto += qty; return; }
            if (item.periodo === 'mes') mensual += item.monto * qty;
            else unico += item.monto * qty;
        });
        const conIva = ivaEl.checked;
        const iva = conIva ? Math.round(unico * IVA * 100) / 100 : 0;
        const total = unico + iva;
        const mensualFinal = conIva ? Math.round(mensual * (1 + IVA) * 100) / 100 : mensual;
        return { unico, iva, total, mensual, mensualFinal, sinMonto, platos, conIva };
    }

    function importe(e, qty) {
        if (typeof e.item.monto !== 'number') return e.item.precio || 'a cotizar';
        return euros(e.item.monto * qty) + (e.item.periodo === 'mes' ? '/mes' : '');
    }

    function resumenCorto(c) {
        const partes = [];
        if (c.unico || !c.mensual) partes.push(euros(c.total));
        if (c.mensual) partes.push((c.unico ? '+ ' : '') + euros(c.mensualFinal) + '/mes');
        return 'desde ' + partes.join(' ');   // los precios son "desde": el final se cierra en la mesa
    }

    // texto legible: va en el campo "pedido" y es lo que copia "copiar resumen"
    function textoPedido() {
        const c = calcular();
        const lineas = ['LA COMANDA · Chiskey · Folio 2027', 'Fecha: ' + fechaHoy(), '----------------------------------------'];
        if (!seleccion.length) {
            lineas.push('(sin platos elegidos: ver Indicaciones)');
        } else {
            seleccion.forEach(({ id, qty }) => {
                const e = itemsPorId[id];
                lineas.push(qty + ' × ' + nombreEnComanda(e) + ' [' + e.menuNombre + '] — ' + importe(e, qty));
            });
        }
        lineas.push('----------------------------------------');
        if (c.unico || !c.mensual) {
            lineas.push('Subtotal: ' + euros(c.unico));
            lineas.push(c.conIva ? 'IVA (21%): ' + euros(c.iva) : 'IVA (21%): no incluido');
            lineas.push('Total: ' + (seleccion.length ? 'desde ' : '') + euros(c.total) + (c.conIva ? ' (IVA incluido)' : ' + IVA'));
        }
        if (c.mensual) lineas.push('Mensual: desde ' + euros(c.mensualFinal) + '/mes' + (c.conIva ? ' (IVA incluido)' : ' + IVA'));
        if (c.sinMonto) lineas.push('A cotizar en la mesa: ' + c.sinMonto + (c.sinMonto === 1 ? ' plato' : ' platos'));
        lineas.push('Estimado orientativo. Cerramos el precio final al sentarnos a la mesa.');
        return lineas.join('\n');
    }

    function fechaHoy() {
        const d = new Date();
        return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear();
    }

    // ── la hoja de la comanda ───────────────────────────────
    function filaVacia(texto) {
        const tr = crear('tr', 'cmd-fila cmd-fila--vacia');
        tr.appendChild(crear('td'));
        const td = crear('td', 'cmd-td-concepto');
        if (texto) td.appendChild(crear('span', 'cmd-vacia', texto));
        tr.appendChild(td);
        tr.appendChild(crear('td', 'cmd-td-importe'));
        return tr;
    }

    function pintarComanda() {
        const c = calcular();

        // conservar el foco si estaba en un stepper de la tabla
        const act = document.activeElement;
        const focoId = act && filasEl.contains(act) ? act.dataset.id : null;
        const focoAct = focoId ? act.dataset.cmdAct : null;
        const focoIndex = focoId ? seleccion.findIndex(x => x.id === focoId) : -1;

        filasEl.textContent = '';
        seleccion.forEach(({ id, qty }) => {
            const e = itemsPorId[id];
            const nombre = nombreEnComanda(e) + ' de ' + e.menuNombre;
            const tr = crear('tr', 'cmd-fila');
            tr.dataset.id = id;
            if (abierta && nuevos.has(id)) tr.classList.add('cmd-fila--nueva');

            const tdCant = crear('td', 'cmd-td-cant');
            const st = crear('div', 'cmd-stepper');
            const menos = crear('button', 'cmd-paso');
            menos.type = 'button';
            menos.dataset.cmdAct = 'restar';
            menos.dataset.id = id;
            menos.setAttribute('aria-label', qty === 1 ? 'Quitar ' + nombre : 'Restar uno de ' + nombre);
            menos.appendChild(svg(null, '0 0 24 24', MENOS));
            const cant = crear('span', 'cmd-cant', String(qty));
            const mas = crear('button', 'cmd-paso');
            mas.type = 'button';
            mas.dataset.cmdAct = 'sumar';
            mas.dataset.id = id;
            mas.setAttribute('aria-label', 'Sumar otro ' + nombre);
            mas.appendChild(svg(null, '0 0 24 24', MAS));
            st.append(menos, cant, mas);
            tdCant.appendChild(st);

            const tdConc = crear('td', 'cmd-td-concepto');
            tdConc.appendChild(crear('span', 'cmd-concepto-nombre', nombreEnComanda(e)));
            tdConc.appendChild(crear('span', 'cmd-concepto-menu', e.menuNombre));

            tr.append(tdCant, tdConc, crear('td', 'cmd-td-importe', importe(e, qty)));
            filasEl.appendChild(tr);
        });
        // la tabla crece con lo pedido: siempre una línea rayada libre al final
        if (!seleccion.length) {
            const vacia = filaVacia('Todavía no hay platos. Elíjanlos en la carta o cuéntennos todo en Indicaciones.');
            // "Ver la carta" (como en la comanda de Reservas): aquí cierra la hoja y lleva a la carta
            const ver = crear('button', 'cmd-ver-carta', 'Ver la carta');
            ver.type = 'button';
            ver.addEventListener('click', () => {
                cerrar();
                const carta = document.querySelector('.cr-carta');
                if (carta) carta.scrollIntoView({ behavior: reduce.matches ? 'auto' : 'smooth', block: 'start' });
            });
            vacia.querySelector('.cmd-td-concepto').appendChild(ver);
            filasEl.appendChild(vacia);
        }
        for (let i = 0; i < FILAS_LIBRES; i++) filasEl.appendChild(filaVacia(''));
        if (abierta) nuevos.clear();

        if (focoId) {
            let destino = filasEl.querySelector('[data-id="' + focoId + '"][data-cmd-act="' + focoAct + '"]');
            if (!destino) {
                const vecino = seleccion[Math.min(focoIndex, seleccion.length - 1)];
                destino = vecino ? filasEl.querySelector('[data-id="' + vecino.id + '"][data-cmd-act="restar"]') : ivaEl;
            }
            if (destino) destino.focus();
        }

        // totales
        subtotalEl.textContent = euros(c.unico);
        ivaFilaEl.hidden = !c.conIva;
        ivaValorEl.textContent = euros(c.iva);
        // total y mensual con "desde" pequeño delante (solo si hay algo pedido)
        const conDesde = (el, texto) => {
            el.textContent = '';
            if (seleccion.length) el.appendChild(crear('span', 'cmd-desde', 'desde '));
            el.appendChild(document.createTextNode(texto));
        };
        const totalTexto = (seleccion.length ? 'desde ' : '') + euros(c.total);
        if (totalEl.textContent !== totalTexto) {
            conDesde(totalEl, euros(c.total));
            if (abierta) reiniciarAnimacion(totalEl, 'is-pop');
        }
        mensualFilaEl.hidden = !c.mensual;
        conDesde(mensualEl, euros(c.mensualFinal) + '/mes');

        // sin platos, Indicaciones pasa a ser obligatoria (consulta general)
        indicacionesEl.required = seleccion.length === 0;
        indicacionesReqEl.hidden = seleccion.length > 0;

        pedidoEl.value = textoPedido();

        // botón flotante
        const etiqueta = c.platos + (c.platos === 1 ? ' plato' : ' platos');
        flotanteResumenEl.textContent = c.platos ? etiqueta + ' · ' + resumenCorto(c) : 'vacía';
        flotanteBadgeEl.textContent = String(c.platos);
        flotanteEl.setAttribute('aria-label', 'Abrir tu comanda: ' +
            (c.platos ? etiqueta + ', ' + resumenCorto(c) : 'todavía vacía'));
    }

    filasEl.addEventListener('click', e => {
        const btn = e.target.closest('[data-cmd-act]');
        if (!btn) return;
        cambiar(btn.dataset.id, btn.dataset.cmdAct === 'sumar' ? 1 : -1);
    });

    ivaEl.addEventListener('change', () => {
        try { localStorage.setItem(IVA_KEY, ivaEl.checked ? '1' : '0'); } catch (e) {}
        pintarComanda();
    });

    // ── abrir / cerrar ──────────────────────────────────────
    function mostrarFormulario() {
        vistaGraciasEl.hidden = true;
        vistaFormEl.hidden = false;
        errorEl.hidden = true;
    }

    function abrir(opciones) {
        if (abierta) return;
        // la comanda para negocios nuevos (servicios-inicio.js) ya está abierta: no se pisan
        // ni la de Reservas (reserva.js), que abre la tarjeta "¿Prefieres contarnos tu proyecto?"
        if (document.documentElement.classList.contains('servicios-inicio-abierta') ||
            document.documentElement.classList.contains('rsv-abierta')) return;
        opener = document.activeElement;
        if (!vistaGraciasEl.hidden) mostrarFormulario();
        abierta = true;
        capaEl.hidden = false;
        document.documentElement.classList.add('cmd-abierta');
        pintarComanda(); // aquí se "escriben" las líneas nuevas
        const scroll = capaEl.querySelector('.cmd-scroll');
        if (scroll) scroll.scrollTop = 0;
        const foco = opciones && opciones.foco;
        if (foco) foco.focus();
        else papelEl.focus({ preventScroll: true });
    }

    function cerrar() {
        if (!abierta) return;
        abierta = false;
        capaEl.hidden = true;
        document.documentElement.classList.remove('cmd-abierta');
        if (!vistaGraciasEl.hidden) mostrarFormulario();
        if (opener && document.contains(opener)) opener.focus();
        opener = null;
    }

    capaEl.addEventListener('click', e => {
        if (e.target.hasAttribute('data-cmd-cerrar')) cerrar();
    });
    $('cmd-cerrar').addEventListener('click', cerrar);
    capaEl.querySelector('[data-cmd-volver]').addEventListener('click', cerrar);

    document.addEventListener('keydown', e => {
        if (!abierta) return;
        if (e.key === 'Escape') {
            e.preventDefault();
            cerrar();
            return;
        }
        if (e.key !== 'Tab') return;
        // el foco no sale de la hoja
        const focos = Array.from(papelEl.querySelectorAll(
            'button, input:not([type="hidden"]):not([tabindex="-1"]), textarea, [href], [tabindex]:not([tabindex="-1"])'
        )).filter(el => !el.disabled && el.offsetParent !== null);
        if (!focos.length) return;
        const primero = focos[0], ultimo = focos[focos.length - 1];
        if (e.shiftKey && (document.activeElement === primero || document.activeElement === papelEl)) {
            e.preventDefault();
            ultimo.focus();
        } else if (!e.shiftKey && document.activeElement === ultimo) {
            e.preventDefault();
            primero.focus();
        }
    });

    flotanteEl.addEventListener('click', () => abrir());
    // el botón "Reservas" del header (main.js → openModal) abre esta misma comanda, con los platos
    window.ComandaCarta = { abrir: () => abrir() };

    // ── envío a Formspree ───────────────────────────────────
    formEl.addEventListener('submit', async e => {
        e.preventDefault();
        if (!formEl.checkValidity()) {
            formEl.reportValidity();
            return;
        }
        pedidoEl.value = textoPedido();
        errorEl.hidden = true;
        enviarEl.disabled = true;
        enviarEl.textContent = 'Enviando…';
        try {
            const r = await fetch(formEl.action, {
                method: 'POST',
                body: new FormData(formEl),
                headers: { 'Accept': 'application/json' }
            });
            if (!r.ok) throw new Error('HTTP ' + r.status);
            const conIva = ivaEl.checked; // reset() desmarcaría la preferencia de IVA
            formEl.reset();
            ivaEl.checked = conIva;
            vaciar();
            vistaFormEl.hidden = true;
            vistaGraciasEl.hidden = false;
            const scroll = capaEl.querySelector('.cmd-scroll');
            if (scroll) scroll.scrollTop = 0;
            $('cmd-gracias-titulo').focus();
        } catch (err) {
            errorEl.textContent = 'No pudimos enviar la comanda. Revisen la conexión e intenten de nuevo, o escríbannos a hola@chiskey.es.';
            errorEl.hidden = false;
        } finally {
            enviarEl.disabled = false;
            enviarEl.textContent = 'Enviar comanda';
        }
    });

    // ── copiar resumen ──────────────────────────────────────
    let copiarTimer;
    copiarEl.addEventListener('click', async () => {
        const texto = textoPedido();
        let ok = false;
        try {
            await navigator.clipboard.writeText(texto);
            ok = true;
        } catch (e) {
            const ta = document.createElement('textarea');
            ta.value = texto;
            ta.setAttribute('readonly', '');
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            papelEl.appendChild(ta);
            ta.select();
            try { ok = document.execCommand('copy'); } catch (e2) { ok = false; }
            ta.remove();
            copiarEl.focus();
        }
        copiarEl.textContent = ok ? 'resumen copiado ✓' : 'no se pudo copiar';
        clearTimeout(copiarTimer);
        copiarTimer = setTimeout(() => { copiarEl.textContent = 'copiar resumen'; }, 2000);
    });

    // ── toast ───────────────────────────────────────────────
    let toastTimer;
    function toast(msg) {
        toastEl.textContent = msg;
        toastEl.classList.add('is-visible');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => toastEl.classList.remove('is-visible'), 2200);
    }

    // ── cuéntanos tu proyecto: openModal (main.js) abre esta misma comanda (window.ComandaCarta) ──
    $('cr-condimento-cta').addEventListener('click', () => {
        // en /servicios/ (modo menús) la tarjeta abre la comanda de Reservas del resto del sitio (/reserva/reserva.js)
        if (MODO_MENUS && window.Reserva) { window.Reserva.abrir(); return; }
        if (typeof openModal === 'function') openModal();
        else document.querySelector('.reservas-btn').click();
    });

    const condimento = document.querySelector('.cr-condimento');
    if ('IntersectionObserver' in window) {
        const obs = new IntersectionObserver(entries => {
            entries.forEach(en => {
                if (en.isIntersecting) {
                    en.target.classList.add('visible');
                    obs.unobserve(en.target);
                }
            });
        }, { threshold: 0.1 });
        obs.observe(condimento);
    } else {
        condimento.classList.add('visible');
    }

    // ── arranque ────────────────────────────────────────────
    function iniciar(data) {
        menus = Array.isArray(data.menus) ? data.menus : [];
        if (!menus.length) throw new Error('Sin menús');

        menus.forEach(menu => {
            const reg = (item, tipo) => {
                itemsPorId[item.id] = { item, menu, menuNombre: nombreCorto(menu), tipo };
            };
            (menu.packs || []).forEach(p => reg(p, 'pack'));
            (menu.platos || []).forEach(p => reg(p, 'plato'));
            ((menu.extra && menu.extra.platos) || []).forEach(p => reg(p, 'plato'));
        });

        if (data.nota_global) {
            notaGlobalEl.textContent = data.nota_global;
            notaGlobalEl.hidden = false;
        }

        try { ivaEl.checked = localStorage.getItem(IVA_KEY) === '1'; } catch (e) {}
        seleccion = cargarGuardado();

        pintarTabs();
        panelEl.addEventListener('click', e => {
            const btn = e.target.closest('[data-act]');
            if (btn) cambiar(btn.dataset.id, btn.dataset.act === 'sumar' ? 1 : -1);
        });

        // Branding de entrada, o el menú del enlace (/servicios/#redes)
        const desdeHash = location.hash.slice(1);
        activarMenu(menus.some(m => m.id === desdeHash) ? desdeHash : 'branding');
        if (!activo) activarMenu(menus[0].id);
        actualizarFlechas();
        // las fuentes cambian el ancho de las pestañas: recalcular cuando terminen de cargar
        if (document.fonts && document.fonts.ready) document.fonts.ready.then(actualizarFlechas);
        pintarComanda();
    }

    pintarComanda();

    fetch(DATA_URL)
        .then(r => {
            if (!r.ok) throw new Error('HTTP ' + r.status);
            return r.json();
        })
        .then(iniciar)
        .catch(() => {
            panelEl.textContent = '';
            panelEl.appendChild(crear('p', 'cr-cargando',
                'No pudimos traer la carta. Recarguen la página o escríbannos a hola@chiskey.es y se la mandamos.'));
        });
})();
