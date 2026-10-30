// ==========================================================
// LA CARTA INTERACTIVA
// Pinta los menús desde menus-data.json, arma "Tu comanda" y
// la manda en el modal de comanda (Formspree) con el campo
// oculto "pedido". Sin pago ni carrito: el único cierre es
// "Reservar mesa".
// ==========================================================
(function () {
    const DATA_URL = '/servicios/menus-data.json';
    const STORAGE_KEY = 'chiskey-comanda';

    const tabsEl = document.getElementById('cartaTabs');
    const panelesEl = document.getElementById('cartaPaneles');
    const notaGlobalEl = document.getElementById('cartaNotaGlobal');

    const comandaEl = document.getElementById('tuComanda');
    const toggleEl = document.getElementById('tuComandaToggle');
    const toggleCountEl = document.getElementById('tuComandaToggleCount');
    const toggleTotalEl = document.getElementById('tuComandaToggleTotal');
    const contadorEl = document.getElementById('tuComandaContador');
    const listaEl = document.getElementById('tuComandaLista');
    const vaciaEl = document.getElementById('tuComandaVacia');
    const totalesEl = document.getElementById('tuComandaTotales');
    const unicoEl = document.getElementById('tuComandaUnico');
    const mensualEl = document.getElementById('tuComandaMensual');
    const cotizarEl = document.getElementById('tuComandaCotizar');
    const reservarEl = document.getElementById('tuComandaReservar');

    const pedidoCampo = document.getElementById('pedidoCampo');
    const pedidoResumen = document.getElementById('pedidoResumen');
    const formContainer = document.getElementById('formContainer');
    const mensajeGracias = document.getElementById('mensajeGracias');
    const reservaForm = document.getElementById('reservaForm');

    let menus = [];
    const itemsPorId = {};   // id → { item, menuId, menuNombre, tipo }
    let seleccion = [];      // ids en el orden en que se agregaron

    // ── utilidades ──────────────────────────────────────────
    // "1900" → "1.900" (Intl es-ES no agrupa los números de 4 cifras)
    function euros(n) {
        return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' €';
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

    function guardar() {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(seleccion)); } catch (e) {}
    }

    function cargarGuardado() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            const ids = raw ? JSON.parse(raw) : [];
            return Array.isArray(ids) ? ids : [];
        } catch (e) {
            return [];
        }
    }

    // ── pestañas ────────────────────────────────────────────
    function activarMenu(id, opciones) {
        const foco = opciones && opciones.foco;
        tabsEl.querySelectorAll('.carta-tab').forEach(tab => {
            const activa = tab.dataset.menu === id;
            tab.setAttribute('aria-selected', activa ? 'true' : 'false');
            tab.tabIndex = activa ? 0 : -1;
            if (activa) {
                if (foco) tab.focus();
                // solo scroll horizontal de la fila de pestañas, nunca de la página
                const izq = tab.offsetLeft, der = izq + tab.offsetWidth;
                if (izq < tabsEl.scrollLeft || der > tabsEl.scrollLeft + tabsEl.clientWidth) {
                    tabsEl.scrollTo({ left: izq - 16, behavior: 'smooth' });
                }
            }
        });
        panelesEl.querySelectorAll('.carta-panel').forEach(panel => {
            panel.hidden = panel.dataset.menu !== id;
        });
        // permite compartir un menú directo: /servicios/#redes
        if (opciones && opciones.hash === false) return;
        try { history.replaceState(null, '', '#' + id); } catch (e) {}
    }

    function pintarTabs() {
        menus.forEach(menu => {
            const tab = crear('button', 'carta-tab');
            tab.type = 'button';
            tab.id = 'tab-' + menu.id;
            tab.dataset.menu = menu.id;
            tab.setAttribute('role', 'tab');
            tab.setAttribute('aria-controls', 'panel-' + menu.id);
            if (menu.icono) tab.appendChild(crear('span', 'carta-tab-icono', menu.icono)).setAttribute('aria-hidden', 'true');
            tab.appendChild(document.createTextNode(nombreCorto(menu)));
            tab.addEventListener('click', () => activarMenu(menu.id));
            tabsEl.appendChild(tab);
        });

        // flechas, Inicio y Fin para moverse entre pestañas
        tabsEl.addEventListener('keydown', e => {
            const tabs = Array.from(tabsEl.querySelectorAll('.carta-tab'));
            const i = tabs.indexOf(document.activeElement);
            if (i === -1) return;
            let destino = null;
            if (e.key === 'ArrowRight') destino = tabs[(i + 1) % tabs.length];
            if (e.key === 'ArrowLeft') destino = tabs[(i - 1 + tabs.length) % tabs.length];
            if (e.key === 'Home') destino = tabs[0];
            if (e.key === 'End') destino = tabs[tabs.length - 1];
            if (destino) {
                e.preventDefault();
                activarMenu(destino.dataset.menu, { foco: true });
            }
        });
    }

    // ── paneles de cada menú ────────────────────────────────
    function registrar(item, menu, tipo) {
        itemsPorId[item.id] = { item, menuId: menu.id, menuNombre: nombreCorto(menu), tipo };
    }

    function nombreEnComanda(entrada) {
        return entrada.tipo === 'pack' ? 'Pack ' + entrada.item.nombre : entrada.item.nombre;
    }

    function pintarPack(pack, menu) {
        registrar(pack, menu, 'pack');
        const card = crear('article', 'carta-pack');
        card.dataset.item = pack.id;

        const head = crear('div', 'carta-pack-head');
        head.appendChild(crear('h4', 'carta-pack-nombre', pack.nombre));
        head.appendChild(crear('span', 'carta-precio', pack.precio));
        card.appendChild(head);

        // señuelo: "plato por plato" vs pack (solo si el pack trae `suelto` y sale más caro suelto)
        if (typeof pack.suelto === 'number' && pack.suelto > pack.monto) {
            const comp = crear('p', 'carta-pack-suelto');
            comp.appendChild(document.createTextNode('Plato por plato '));
            comp.appendChild(crear('span', 'carta-pack-suelto-tachado', euros(pack.suelto)));
            comp.appendChild(document.createTextNode(' · '));
            comp.appendChild(crear('span', 'carta-pack-suelto-ahorro', 'Ahorras ' + euros(pack.suelto - pack.monto)));
            card.appendChild(comp);
        }

        card.appendChild(crear('p', 'carta-pack-desc', pack.descripcion));

        const btn = crear('button', 'carta-agregar', 'Agregar');
        btn.type = 'button';
        btn.dataset.item = pack.id;
        btn.setAttribute('aria-pressed', 'false');
        btn.setAttribute('aria-label', 'Agregar Pack ' + pack.nombre + ' de ' + nombreCorto(menu) + ' a la comanda');
        card.appendChild(btn);
        return card;
    }

    function pintarPlatos(platos, menu) {
        const ul = crear('ul', 'carta-platos');
        platos.forEach(plato => {
            registrar(plato, menu, 'plato');
            const li = crear('li', 'carta-plato');
            li.dataset.item = plato.id;

            const texto = crear('div', 'carta-plato-texto');
            texto.appendChild(crear('span', 'carta-plato-nombre', plato.nombre));
            texto.appendChild(crear('span', 'carta-plato-desc', plato.descripcion));
            li.appendChild(texto);
            li.appendChild(crear('span', 'carta-precio', plato.precio));

            const btn = crear('button', 'carta-mas', '+');
            btn.type = 'button';
            btn.dataset.item = plato.id;
            btn.setAttribute('aria-pressed', 'false');
            btn.setAttribute('aria-label', 'Agregar ' + plato.nombre + ' a la comanda');
            li.appendChild(btn);
            ul.appendChild(li);
        });
        return ul;
    }

    function pintarPanel(menu) {
        const panel = crear('div', 'carta-panel');
        panel.id = 'panel-' + menu.id;
        panel.dataset.menu = menu.id;
        panel.setAttribute('role', 'tabpanel');
        panel.setAttribute('aria-labelledby', 'tab-' + menu.id);
        panel.tabIndex = 0;
        panel.hidden = true;

        panel.appendChild(crear('h3', 'carta-titulo', menu.titulo));
        if (menu.intro) panel.appendChild(crear('p', 'carta-intro', menu.intro));
        if (menu.aclaracion) panel.appendChild(crear('p', 'carta-aclaracion', menu.aclaracion));

        if (menu.nota) {
            const nota = crear('div', 'carta-nota');
            if (menu.nota.titulo) nota.appendChild(crear('strong', null, menu.nota.titulo));
            nota.appendChild(document.createTextNode(menu.nota.texto || ''));
            // si la nota menciona otro menú de la carta, ofrece ir a él
            // ("Menú Web" encuentra "Menú Web / App")
            const destino = menus.find(m => m.id !== menu.id &&
                (menu.nota.texto || '').includes('Menú ' + nombreCorto(m).split(/[\s/]/)[0]));
            if (destino) {
                const ir = crear('button', 'carta-nota-link', 'Ver el ' + destino.titulo + ' →');
                ir.type = 'button';
                ir.addEventListener('click', () => activarMenu(destino.id, { foco: true }));
                nota.appendChild(document.createElement('br'));
                nota.appendChild(ir);
            }
            panel.appendChild(nota);
        }

        if (menu.packs && menu.packs.length) {
            panel.appendChild(crear('h4', 'carta-bloque-titulo', 'Packs'));
            const grid = crear('div', 'carta-packs');
            menu.packs.forEach(pack => grid.appendChild(pintarPack(pack, menu)));
            panel.appendChild(grid);
        }

        if (menu.platos && menu.platos.length) {
            panel.appendChild(crear('h4', 'carta-bloque-titulo', 'Platos individuales'));
            panel.appendChild(pintarPlatos(menu.platos, menu));
        }

        if (menu.extra && menu.extra.platos && menu.extra.platos.length) {
            panel.appendChild(crear('h4', 'carta-bloque-titulo', menu.extra.titulo || 'Extra'));
            panel.appendChild(pintarPlatos(menu.extra.platos, menu));
        }

        return panel;
    }

    // ── comanda ─────────────────────────────────────────────
    function alternar(id) {
        if (!itemsPorId[id]) return;
        if (seleccion.includes(id)) {
            seleccion = seleccion.filter(x => x !== id);
        } else {
            seleccion.push(id);
        }
        guardar();
        pintarComanda();
    }

    function quitar(id) {
        seleccion = seleccion.filter(x => x !== id);
        guardar();
        pintarComanda();
    }

    function calcular() {
        let unico = 0;
        let mensual = 0;
        let sinMonto = 0;
        seleccion.forEach(id => {
            const { item } = itemsPorId[id];
            if (typeof item.monto !== 'number') { sinMonto++; return; }
            if (item.periodo === 'mes') mensual += item.monto;
            else unico += item.monto;
        });
        return { unico, mensual, sinMonto };
    }

    // texto legible que viaja en el campo oculto "pedido"
    function textoPedido() {
        if (!seleccion.length) return '';
        const { unico, mensual, sinMonto } = calcular();
        const lineas = ['COMANDA'];
        seleccion.forEach(id => {
            const e = itemsPorId[id];
            lineas.push('- [' + e.menuNombre + '] ' + nombreEnComanda(e) + ' — ' + e.item.precio);
        });
        if (unico) lineas.push('Estimado único: ' + euros(unico) + ' + IVA');
        if (mensual) lineas.push('Mensual: ' + euros(mensual) + '/mes');
        if (sinMonto) lineas.push('A cotizar: ' + sinMonto + (sinMonto === 1 ? ' plato' : ' platos'));
        return lineas.join('\n');
    }

    function textoTotalCorto(unico, mensual) {
        const partes = [];
        if (unico) partes.push(euros(unico) + ' + IVA');
        if (mensual) partes.push(euros(mensual) + '/mes');
        return partes.join(' · ');
    }

    function pintarComanda() {
        const n = seleccion.length;
        const { unico, mensual, sinMonto } = calcular();

        // lista
        listaEl.textContent = '';
        seleccion.forEach(id => {
            const e = itemsPorId[id];
            const li = crear('li', 'tu-comanda-item');
            const texto = crear('div');
            texto.appendChild(crear('span', 'tu-comanda-item-menu', e.menuNombre));
            texto.appendChild(crear('span', 'tu-comanda-item-nombre', nombreEnComanda(e)));
            li.appendChild(texto);
            li.appendChild(crear('span', 'carta-precio', e.item.precio));
            const x = crear('button', 'tu-comanda-quitar', '×');
            x.type = 'button';
            x.setAttribute('aria-label', 'Quitar ' + nombreEnComanda(e) + ' de la comanda');
            x.addEventListener('click', () => quitar(id));
            li.appendChild(x);
            listaEl.appendChild(li);
        });

        vaciaEl.hidden = n > 0;
        totalesEl.hidden = n === 0;

        unicoEl.hidden = !unico;
        unicoEl.lastElementChild.textContent = euros(unico) + ' + IVA';
        mensualEl.hidden = !mensual;
        mensualEl.lastElementChild.textContent = euros(mensual) + '/mes';
        cotizarEl.hidden = !sinMonto;
        cotizarEl.textContent = sinMonto
            ? 'Más ' + sinMonto + (sinMonto === 1 ? ' plato' : ' platos') + ' a cotizar en la mesa.'
            : '';

        const etiqueta = n + (n === 1 ? ' plato' : ' platos');
        contadorEl.textContent = etiqueta;
        toggleCountEl.textContent = n;
        toggleTotalEl.textContent = textoTotalCorto(unico, mensual);
        reservarEl.disabled = n === 0;

        // marca en la carta lo que ya está en la comanda
        document.querySelectorAll('.carta-agregar, .carta-mas').forEach(btn => {
            const id = btn.dataset.item;
            const dentro = seleccion.includes(id);
            const e = itemsPorId[id];
            btn.setAttribute('aria-pressed', dentro ? 'true' : 'false');
            if (btn.classList.contains('carta-agregar')) {
                btn.textContent = dentro ? 'Agregado ✓' : 'Agregar';
            } else {
                btn.textContent = dentro ? '✓' : '+';
            }
            btn.setAttribute('aria-label', (dentro ? 'Quitar ' : 'Agregar ') + nombreEnComanda(e) +
                ' de ' + e.menuNombre + (dentro ? ' de la comanda' : ' a la comanda'));
            const fila = btn.closest('[data-item]');
            if (fila && fila !== btn) fila.classList.toggle('is-added', dentro);
        });

        // el campo oculto siempre al día, abra quien abra el modal
        if (pedidoCampo) pedidoCampo.value = textoPedido();
        if (pedidoResumen) {
            pedidoResumen.hidden = n === 0;
            const total = textoTotalCorto(unico, mensual);
            pedidoResumen.textContent = n
                ? 'Tu pedido va incluido: ' + etiqueta + (total ? ' · ' + total : '')
                : '';
        }
    }

    // ── abrir el modal de comanda ───────────────────────────
    function abrirComanda(mensajeIdea) {
        // si ya se envió una comanda antes, vuelve a mostrar el formulario
        if (mensajeGracias && mensajeGracias.style.display !== 'none' && formContainer) {
            mensajeGracias.style.display = 'none';
            formContainer.style.display = '';
            if (reservaForm) reservaForm.reset();
            pintarComanda();
        }
        const idea = document.querySelector('#myModal textarea[name="idea"]');
        if (idea && mensajeIdea && !idea.value) idea.value = mensajeIdea;
        if (typeof openModal === 'function') openModal();
    }

    // ── arranque ────────────────────────────────────────────
    function iniciar(data) {
        menus = Array.isArray(data.menus) ? data.menus : [];
        if (!menus.length) throw new Error('Sin menús');

        panelesEl.textContent = '';
        pintarTabs();
        menus.forEach(menu => panelesEl.appendChild(pintarPanel(menu)));

        if (data.nota_global) {
            notaGlobalEl.textContent = data.nota_global;
            notaGlobalEl.hidden = false;
        }

        // un solo listener para todos los botones de agregar
        panelesEl.addEventListener('click', e => {
            const btn = e.target.closest('.carta-agregar, .carta-mas');
            if (btn) alternar(btn.dataset.item);
        });

        // recupera la comanda guardada, descartando ids que ya no existan
        seleccion = cargarGuardado().filter((id, i, arr) => itemsPorId[id] && arr.indexOf(id) === i);

        const desdeHash = location.hash.slice(1);
        activarMenu(menus.some(m => m.id === desdeHash) ? desdeHash : menus[0].id, { hash: false });
        pintarComanda();
    }

    fetch(DATA_URL)
        .then(r => {
            if (!r.ok) throw new Error('HTTP ' + r.status);
            return r.json();
        })
        .then(iniciar)
        .catch(() => {
            panelesEl.textContent = '';
            const p = crear('p', 'carta-cargando',
                'No pudimos traer la carta. Recarga la página o escríbenos a hola@chiskey.es y te la mandamos.');
            panelesEl.appendChild(p);
        });

    // barra móvil: expandir / contraer
    if (toggleEl) {
        toggleEl.addEventListener('click', () => {
            const abierta = comandaEl.classList.toggle('is-open');
            toggleEl.setAttribute('aria-expanded', abierta ? 'true' : 'false');
        });
    }

    if (reservarEl) {
        reservarEl.addEventListener('click', () => {
            if (!seleccion.length) return;
            abrirComanda();
        });
    }

    // al enviar con éxito (main.js avisa), la comanda queda servida y se vacía
    document.addEventListener('comanda:enviada', () => {
        seleccion = [];
        guardar();
        pintarComanda();
        comandaEl.classList.remove('is-open');
        if (toggleEl) toggleEl.setAttribute('aria-expanded', 'false');
    });

    // ── logo en color: main.js vuelve al logo blanco al cerrar el overlay;
    //    sobre el fondo blanco de la carta se deja siempre el azul del overlay ──
    const logoColor = document.querySelector('.logo img');
    const menuToggleBtn = document.getElementById('menu-toggle');
    if (logoColor && menuToggleBtn) {
        const LOGO_COLOR = logoColor.src;
        menuToggleBtn.addEventListener('click', () => { logoColor.src = LOGO_COLOR; });
    }

    // ── condimento y animaciones de entrada (antes en el <script> de la página) ──
    const condimentoCta = document.querySelector('.condimento-cta');
    if (condimentoCta) {
        condimentoCta.addEventListener('click', () => {
            abrirComanda('Ya tenemos algo hecho, queremos ponerle sazón');
        });
    }

    const revealObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                revealObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });
    document.querySelectorAll('.menu-divider, .condimento-block').forEach(el => revealObserver.observe(el));
})();
