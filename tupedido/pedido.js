// ==========================================================
// PEDIDO · /tupedido/
// Seguimiento de un pedido: buscador ("ranura"), comanda de papel y recorrido.
//   render(estado, datos) → solo pinta, nunca pide datos.
//   buscarPedido(codigo)  → solo trae datos (devuelve una promesa).
// Los datos vienen de la hoja "Pedidos" a través de su Apps Script
// (guía: /tupedido/apps-script/LEEME.md).
// No toca el modal de Reservas (#myModal): lo maneja main.js.
// No guarda nada en el navegador.
// ==========================================================
(function () {
    // ── CONFIGURACIÓN ───────────────────────────────────────
    const DEMO_ACTIVO = true;                  // poner en false antes de publicar
    // URL de la aplicación web del Apps Script (la que termina en /exec).
    // Se pega aquí al implementar el script: ver /tupedido/apps-script/LEEME.md
    const URL_API = 'https://script.google.com/macros/s/AKfycbylOro3duelurCutbrIXaO_DgoZNVml1RlYowisMtpmEQRQTAMm4Spz1uFndryw-nt-Eg/exec';
    const TIEMPO_MAX_MS = 10000;               // tope de espera de cada consulta

    // formato del código: CK-001-izate-7K4M (la misma regla que Code.gs)
    const LARGO_MAX = 80;
    const PATRON_CODIGO = /^CK-\d{3,6}-[a-z0-9]+(?:-[a-z0-9]+)*-[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{4}$/;
    const ZONA = 'Europe/Madrid';

    // los 4 estados del recorrido, en orden
    const PASOS = [
        { id: 'recibido', nombre: 'Recibido' },
        { id: 'horno', nombre: 'En el horno' },
        { id: 'emplatando', nombre: 'Emplatando' },
        { id: 'servido', nombre: 'Servido' }
    ];
    const ESTADOS = PASOS.map(p => p.id);

    const $ = id => document.getElementById(id);
    const form = $('pedido-form');
    const campo = $('pedido-codigo');
    const boton = $('pedido-enviar');
    const errorEl = $('pedido-error');
    const resultado = $('pedido-resultado');
    const interior = $('pedido-resultado-interior');
    if (!form || !resultado || !interior) return;

    const sinConfigurar = !URL_API || URL_API === 'PEGAR_AQUI_URL_EXEC';
    if (sinConfigurar && !DEMO_ACTIVO) {
        console.warn('[Pedido] Falta URL_API en /tupedido/pedido.js: pega la URL /exec del Apps Script (ver /tupedido/apps-script/LEEME.md). Mientras tanto, las búsquedas muestran "sin conexión".');
    }

    // ── CÓDIGO ──────────────────────────────────────────────
    // Forma canónica: "CK-001-izate-7K4M" ("CK" y el sufijo en mayúsculas, el proyecto en minúsculas).
    // Acepta mayúsculas o minúsculas, espacios, guiones bajos, guiones de más y "CK001" pegado.
    // El sufijo son los 4 caracteres tras el último guion; el proyecto puede llevar guiones.
    function normalizar(codigo) {
        const s = String(codigo == null ? '' : codigo).trim();
        if (s.length > LARGO_MAX * 2) return s;
        const partes = s.split(/[\s_\-]+/).filter(Boolean);
        if (partes.length && /^ck\d+$/i.test(partes[0])) partes.splice(0, 1, 'CK', partes[0].slice(2));
        if (partes.length < 4 || partes[0].toUpperCase() !== 'CK') return s;
        const sufijo = partes[partes.length - 1].toUpperCase();
        const slug = partes.slice(2, -1).join('-').toLowerCase();
        return 'CK-' + partes[1] + '-' + slug + '-' + sufijo;
    }
    let codigoDemo = null;                      // solo en modo demo: el código de ejemplo también se acepta
    function valido(codigo) {
        if (codigoDemo && codigo === codigoDemo) return true;
        return typeof codigo === 'string' && codigo.length <= LARGO_MAX && PATRON_CODIGO.test(codigo);
    }

    // ── FECHAS (zona Europe/Madrid) ─────────────────────────
    // las fechas llegan como "yyyy-MM-dd"
    function hoyISO() {
        return new Intl.DateTimeFormat('en-CA', { timeZone: ZONA, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    }
    function aUTC(iso) {
        const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
        return m ? Date.UTC(+m[1], +m[2] - 1, +m[3]) : NaN;
    }
    function sumarDias(iso, n) {
        return new Date(aUTC(iso) + n * 864e5).toISOString().slice(0, 10);
    }
    function fechaLarga(iso) {
        const t = aUTC(iso);
        if (isNaN(t)) return '';
        return new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(t));
    }
    function plazo(entrega) {
        const t = aUTC(entrega);
        if (isNaN(t)) return '';
        const dias = Math.round((t - aUTC(hoyISO())) / 864e5);
        if (dias === 0) return 'Entrega hoy';
        if (dias < 0) return 'Entrega vencida';
        return dias === 1 ? 'Queda 1 día' : 'Quedan ' + dias + ' días';
    }

    // ── ACCESO A DATOS ──────────────────────────────────────
    // Devuelve siempre una promesa con { tipo, datos }:
    //   tipo: 'ok' | 'no_encontrado' | 'formato_invalido' | 'limite' | 'sinconexion'
    //   datos (solo con 'ok'): { codigo, proyecto, pedido[], estado, inicio, entrega, nota }

    // una consulta, con tope de tiempo; sin cabeceras propias (sin preflight) y sin cookies
    function pedirUnaVez(url) {
        const control = new AbortController();
        const reloj = setTimeout(() => control.abort(), TIEMPO_MAX_MS);
        return fetch(url, {
            method: 'GET',
            credentials: 'omit',
            cache: 'no-store',
            referrerPolicy: 'no-referrer',
            signal: control.signal
        }).then(r => {
            if (!r.ok) throw Object.assign(new Error('HTTP ' + r.status), { name: 'HttpError' });
            return r.text();
        }).finally(() => clearTimeout(reloj));
    }

    const esTexto = v => typeof v === 'string';
    const esFecha = v => v === null || (esTexto(v) && !isNaN(aUTC(v)));
    const esTextoONulo = v => v === null || esTexto(v);

    // comprueba la forma exacta de la respuesta antes de pintar nada
    function leerRespuesta(texto) {
        let j;
        try { j = JSON.parse(texto); } catch (e) { return { tipo: 'sinconexion' }; }
        if (!j || typeof j !== 'object' || Array.isArray(j)) return { tipo: 'sinconexion' };
        if (j.ok === false) {
            if (j.error === 'no_encontrado' || j.error === 'formato_invalido' || j.error === 'limite') return { tipo: j.error };
            return { tipo: 'sinconexion' };          // "error" u otra cosa
        }
        const p = j.ok === true ? j.pedido : null;
        if (!p || typeof p !== 'object' || Array.isArray(p)) return { tipo: 'sinconexion' };
        const lista = p.pedido;
        const formaOk =
            esTexto(p.codigo) && valido(p.codigo) &&
            esTextoONulo(p.proyecto) &&
            (lista === null || (Array.isArray(lista) && lista.every(esTexto))) &&
            (p.estado === null || ESTADOS.includes(p.estado)) &&
            esFecha(p.inicio) && esFecha(p.entrega) &&
            esTextoONulo(p.nota);
        if (!formaOk) return { tipo: 'sinconexion' };
        return {
            tipo: 'ok',
            datos: {
                codigo: p.codigo,
                proyecto: p.proyecto,
                pedido: lista || [],
                estado: p.estado || 'recibido',      // sin estado en la hoja: se ve como recibido
                inicio: p.inicio,
                entrega: p.entrega,
                nota: p.nota
            }
        };
    }

    let buscarPedido = async function (codigo) {
        if (sinConfigurar) {
            console.warn('[Pedido] URL_API sin configurar en /tupedido/pedido.js.');
            return { tipo: 'sinconexion' };
        }
        const url = URL_API + '?codigo=' + encodeURIComponent(codigo);
        let texto;
        try {
            texto = await pedirUnaVez(url);
        } catch (e) {
            // un único reintento, solo si falló la red (no si se agotó el tiempo ni si respondió con error)
            if (e.name !== 'TypeError') return { tipo: 'sinconexion' };
            try { texto = await pedirUnaVez(url); } catch (e2) { return { tipo: 'sinconexion' }; }
        }
        return leerRespuesta(texto);
    };

    // ── PRESENTACIÓN ────────────────────────────────────────
    // todo lo que viene de la hoja entra con textContent (nunca innerHTML)
    function crear(tag, clase, texto) {
        const el = document.createElement(tag);
        if (clase) el.className = clase;
        if (texto != null) el.textContent = texto;
        return el;
    }
    function campoComanda(dl, nombre, valor) {
        const fila = crear('div', 'pedido-comanda-campo');
        fila.appendChild(crear('dt', null, nombre));
        const dd = crear('dd');
        if (Array.isArray(valor)) {
            const ul = crear('ul', 'pedido-comanda-lista');
            valor.forEach(v => ul.appendChild(crear('li', null, v)));
            dd.appendChild(ul);
        } else {
            dd.textContent = valor;
        }
        fila.appendChild(dd);
        dl.appendChild(fila);
    }

    function pintarComanda(d) {
        const art = crear('article', 'pedido-comanda');
        art.setAttribute('aria-labelledby', 'pedido-comanda-titulo');
        const cab = crear('div', 'pedido-comanda-cabecera');
        const h2 = crear('h2', 'pedido-comanda-titulo', 'La comanda');
        h2.id = 'pedido-comanda-titulo';
        h2.tabIndex = -1;                       // aquí va el foco tras buscar
        cab.appendChild(h2);
        cab.appendChild(crear('span', 'pedido-comanda-folio', 'Folio ' + d.codigo));
        art.appendChild(cab);

        const dl = crear('dl', 'pedido-comanda-campos');
        if (d.proyecto) campoComanda(dl, 'Comensal', d.proyecto);
        const lista = (d.pedido || []).filter(Boolean);
        if (lista.length) campoComanda(dl, 'Pedido', lista.length > 1 ? lista : lista[0]);
        campoComanda(dl, 'Empezó', fechaLarga(d.inicio) || 'Por confirmar');
        campoComanda(dl, 'Entrega estimada', fechaLarga(d.entrega) || 'Por confirmar');
        art.appendChild(dl);

        // línea derivada de la entrega estimada (no es un campo); sin fecha o ya servido, no aplica
        const texto = d.estado !== 'servido' && d.inicio && d.entrega ? plazo(d.entrega) : '';
        if (texto) art.appendChild(crear('p', 'pedido-comanda-plazo', texto));

        if (d.nota) {
            const dl2 = crear('dl', 'pedido-comanda-campos pedido-comanda-campos--nota');
            campoComanda(dl2, 'Indicaciones', d.nota);
            art.appendChild(dl2);
        }

        // unas filas vacías rayadas, como en el papel
        const renglones = crear('div', 'pedido-comanda-renglones');
        renglones.setAttribute('aria-hidden', 'true');
        for (let i = 0; i < 3; i++) renglones.appendChild(crear('span'));
        art.appendChild(renglones);
        return art;
    }

    function pintarRecorrido(estado) {
        const sec = crear('section', 'pedido-recorrido');
        sec.setAttribute('aria-labelledby', 'pedido-recorrido-titulo');
        const head = crear('div', 'pedido-bloque-head');
        const h2 = crear('h2', 'pedido-bloque-titulo', 'Recorrido');
        h2.id = 'pedido-recorrido-titulo';
        head.appendChild(h2);
        sec.appendChild(head);

        const servido = estado === 'servido';
        const actual = PASOS.findIndex(p => p.id === estado);
        const ol = crear('ol', 'pedido-pasos');
        ol.setAttribute('role', 'list');        // Safari quita la semántica de lista con list-style: none
        PASOS.forEach((p, i) => {
            const aspecto = servido || i < actual ? 'completado' : i === actual ? 'activo' : 'pendiente';
            const li = crear('li', 'pedido-paso pedido-paso--' + aspecto);
            if (aspecto === 'activo') li.setAttribute('aria-current', 'step');
            const circulo = crear('span', 'pedido-paso-circulo');
            circulo.setAttribute('aria-hidden', 'true');
            if (aspecto === 'completado') circulo.textContent = '✓';
            li.appendChild(circulo);
            const texto = crear('span', 'pedido-paso-texto');
            texto.appendChild(crear('span', 'pedido-paso-nombre', p.nombre));
            texto.appendChild(crear('span', 'pedido-sr', aspecto === 'activo' ? ', en curso' : ', ' + aspecto));
            if (aspecto === 'activo') {
                const ahora = crear('span', 'pedido-paso-ahora', 'Ahora');
                ahora.setAttribute('aria-hidden', 'true');
                texto.appendChild(ahora);
            }
            li.appendChild(texto);
            ol.appendChild(li);
        });
        sec.appendChild(ol);
        if (servido) sec.appendChild(crear('p', 'pedido-servido', 'Tu pedido está servido.'));
        return sec;
    }

    function abrirReservas() {
        if (typeof openModal === 'function') openModal();
        else { const r = document.querySelector('.reservas-btn'); if (r) r.click(); }
    }

    // el espacio del resultado está cerrado hasta que hay algo que mostrar
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    function abrir(animar) {
        if (resultado.classList.contains('is-abierto')) return;
        if (!animar || reduce.matches) {
            // sin animación (al cargar la página o con movimiento reducido): abierto desde el principio
            resultado.style.transition = 'none';
            resultado.classList.add('is-abierto', 'is-listo');
            void resultado.offsetHeight;
            resultado.style.transition = '';
            return;
        }
        resultado.classList.add('is-abierto');
        // al terminar de abrirse (450 ms en pedido.css) deja de recortar el giro y la sombra
        setTimeout(() => { if (resultado.classList.contains('is-abierto')) resultado.classList.add('is-listo'); }, 480);
    }
    function cerrar() {
        resultado.classList.remove('is-abierto', 'is-listo');
        interior.textContent = '';
    }

    // muestra el contenido nuevo con un solo fundido corto (/entrada.css, variables en pedido.css)
    function mostrar(nodo, animar) {
        interior.textContent = '';
        nodo.classList.add('fade-entrada');
        interior.appendChild(nodo);
        abrir(animar);
    }

    // avisos sin comanda: no encontrado, límite y sin conexión (mismo diseño)
    const AVISOS = {
        noencontrado: { texto: 'No encontramos ese pedido. Revisa el número o escríbenos.', escribir: true },
        limite: { texto: 'Hay muchas consultas ahora mismo. Inténtalo en unos minutos.', escribir: false },
        sinconexion: { texto: 'No pudimos consultar el pedido ahora. Inténtalo en un momento o escríbenos.', escribir: true }
    };
    function pintarAviso(clave) {
        const a = AVISOS[clave];
        const caja = crear('div', 'pedido-aviso pedido-aviso--' + clave);
        const p = crear('p', 'pedido-aviso-texto', a.texto);
        p.tabIndex = -1;
        caja.appendChild(p);
        if (a.escribir) {
            const b = crear('button', 'pedido-boton', 'Escribirnos');
            b.type = 'button';
            b.dataset.content = 'reservas';
            b.setAttribute('aria-haspopup', 'dialog');
            b.addEventListener('click', e => { e.preventDefault(); abrirReservas(); });
            caja.appendChild(b);
        }
        return caja;
    }

    let foco = null;   // a dónde llevar el foco tras pintar (solo si buscó la persona)
    function render(estado, datos) {
        const buscando = estado === 'buscando';
        boton.disabled = buscando;
        boton.textContent = buscando ? 'Buscando…' : 'Ver pedido';
        if (buscando) return;                   // el resultado anterior se queda hasta tener el nuevo

        const invalido = estado === 'invalido';
        errorEl.hidden = !invalido;
        if (invalido) campo.setAttribute('aria-invalid', 'true');
        else campo.removeAttribute('aria-invalid');

        const animar = !!foco;                  // se abre con transición solo si buscó la persona
        if (estado === 'inicial' || invalido) {
            cerrar();
            foco = invalido && foco ? campo : null;
        } else if (AVISOS[estado]) {
            const caja = pintarAviso(estado);
            mostrar(caja, animar);
            foco = foco && caja.querySelector('.pedido-aviso-texto');
        } else {
            // en curso (recibido, horno, emplatando) o servido
            const plato = crear('div', 'pedido-plato');
            plato.append(pintarComanda(datos), pintarRecorrido(datos.estado));
            mostrar(plato, animar);
            foco = foco && plato.querySelector('.pedido-comanda-titulo');
        }
        // sin saltar de scroll: el resultado se abre justo debajo del buscador
        if (foco) { foco.focus({ preventScroll: true }); foco = null; }
    }

    // ── CONTROL ─────────────────────────────────────────────
    const ESTADO_DE = { no_encontrado: 'noencontrado', formato_invalido: 'invalido', limite: 'limite', sinconexion: 'sinconexion' };
    let enCurso = false;
    function enviar(desdeUsuario) {
        if (enCurso) return;                    // un solo envío a la vez
        const codigo = normalizar(campo.value);
        if (!valido(codigo)) {
            foco = desdeUsuario;
            render('invalido');
            return;
        }
        campo.value = codigo;
        enCurso = true;
        render('buscando');
        Promise.resolve()
            .then(() => buscarPedido(codigo))
            .catch(() => ({ tipo: 'sinconexion' }))
            .then(r => {
                enCurso = false;
                foco = desdeUsuario;
                if (r && r.tipo === 'ok') render(r.datos.estado === 'servido' ? 'servido' : 'en-curso', r.datos);
                else render(ESTADO_DE[r && r.tipo] || 'sinconexion');
            });
    }

    form.addEventListener('submit', e => { e.preventDefault(); enviar(true); });   // Enter o botón
    campo.addEventListener('input', () => {
        if (!errorEl.hidden) { errorEl.hidden = true; campo.removeAttribute('aria-invalid'); }
    });

    render('inicial');

    const params = new URLSearchParams(location.search);

    // ── MODO DEMO (?demo=…): los datos de ejemplo viven en pedido-demo.js,
    //    que solo se descarga si DEMO_ACTIVO y la dirección trae ?demo ──
    if (DEMO_ACTIVO && params.has('demo')) {
        const s = document.createElement('script');
        s.src = '/tupedido/pedido-demo.js';
        s.onload = () => {
            if (typeof window.PedidoDemo !== 'function') return;
            window.PedidoDemo({
                modo: params.get('demo'),
                render, hoyISO, sumarDias,
                campo,
                aviso: $('pedido-demo'),
                usarBuscador: fn => { buscarPedido = fn; },
                aceptarCodigo: c => { codigoDemo = c; }
            });
        };
        document.head.appendChild(s);
        return;
    }

    // ── ENLACE DIRECTO (?c=CODIGO): busca una vez y quita el código de la barra de direcciones ──
    if (params.has('c')) {
        const c = params.get('c') || '';
        params.delete('c');
        const resto = params.toString();
        try { history.replaceState(null, '', location.pathname + (resto ? '?' + resto : '') + location.hash); } catch (e) {}
        campo.value = c;
        enviar(false);
    }
})();
