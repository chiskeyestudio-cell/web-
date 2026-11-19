// ==========================================================
// PEDIDO · MODO DEMO (/tupedido/?demo=…)
// Datos de ejemplo claramente falsos para revisar el diseño de todos los estados.
// pedido.js solo descarga este archivo si DEMO_ACTIVO = true y la dirección trae ?demo.
// Con DEMO_ACTIVO = false nunca se carga (y se puede borrar).
//   ?demo=1 (= horno) · recibido · horno · emplatando · servido
//   ?demo=noencontrado · invalido · limite · sinconexion
// ==========================================================
window.PedidoDemo = function (api) {
    const MODOS = {
        '1': 'horno', recibido: 'recibido', horno: 'horno', emplatando: 'emplatando', servido: 'servido',
        noencontrado: 'noencontrado', invalido: 'invalido', limite: 'limite', sinconexion: 'sinconexion'
    };
    const modo = MODOS[api.modo];
    if (!modo) return;

    // que los buscadores no indexen la demo
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex';
    document.head.appendChild(meta);
    api.aviso.textContent = 'Ejemplo: datos de prueba';
    api.aviso.hidden = false;

    const CODIGO = 'CK-000-ejemplo-AB12';      // el 1 no existe en el alfabeto: nunca será un código real
    const hoy = api.hoyISO();
    const ejemplo = estado => ({
        codigo: CODIGO,
        proyecto: 'Proyecto de ejemplo',
        pedido: ['Ejemplo de pedido'],
        estado,
        inicio: api.sumarDias(hoy, -10),
        entrega: api.sumarDias(hoy, estado === 'servido' ? -1 : 12),
        nota: null
    });
    const respuesta = () => {
        if (modo === 'noencontrado') return { tipo: 'no_encontrado' };
        if (modo === 'limite') return { tipo: 'limite' };
        if (modo === 'sinconexion') return { tipo: 'sinconexion' };
        if (modo === 'invalido') return { tipo: 'formato_invalido' };
        return { tipo: 'ok', datos: ejemplo(modo) };
    };
    // el código de ejemplo no tiene formato real (lleva un 1): en la demo se acepta igualmente
    api.aceptarCodigo(CODIGO);
    // cualquier búsqueda responde con el estado de la dirección
    api.usarBuscador(() => new Promise(res => setTimeout(() => res(respuesta()), 600)));

    // estado inicial de la demo, ya pintado
    if (modo === 'invalido') {
        api.campo.value = 'xyz';
        api.render('invalido');
        return;
    }
    api.campo.value = CODIGO;
    const r = respuesta();
    if (r.tipo === 'ok') api.render(r.datos.estado === 'servido' ? 'servido' : 'en-curso', r.datos);
    else api.render({ no_encontrado: 'noencontrado', limite: 'limite', sinconexion: 'sinconexion' }[r.tipo]);
};
