/**
 * CHISKEY · Seguimiento de pedidos (/tupedido/)
 * Script de la hoja "Pedidos": genera los códigos y responde a la web con UN pedido por consulta.
 *
 * Este archivo se publica en el repositorio: aquí NO va nada secreto
 * (ni ID de la hoja, ni URL, ni correos). El script vive pegado a la hoja
 * (Extensiones → Apps Script) y se ejecuta como la cuenta propietaria.
 *
 * Partes:
 *   1. Configuración
 *   2. Funciones puras (sin hoja ni servicios de Google: se prueban con Node)
 *   3. La hoja (lado del propietario: configurar, generar códigos, revisar)
 *   4. La aplicación web (doGet): lo único que ve el público
 */

// ════════════════════════════════════════════════════════════
// 1. CONFIGURACIÓN
// ════════════════════════════════════════════════════════════
var HOJA = 'Pedidos';
var ZONA = 'Europe/Madrid';

// freno de intentos: búsquedas fallidas permitidas (entre todos) por ventana de tiempo
var UMBRAL_FALLOS = 30;
var VENTANA_SEG = 600;          // 10 minutos
var PAUSA_FALLO_MS = 400;       // espera extra en cada búsqueda fallida
var CACHE_ACIERTO_SEG = 60;     // un pedido encontrado se recuerda como mucho 60 s

// formato del código: CK-001-izate-7K4M
var ALFABETO = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';   // sin 0, O, 1, I ni L
var LARGO_MAX = 80;
var SLUG_MAX = 40;
var PATRON_CODIGO = /^CK-\d{3,6}-[a-z0-9]+(?:-[a-z0-9]+)*-[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{4}$/;

// columnas (1 = A)
var COL = { CODIGO: 1, PROYECTO: 2, PEDIDO: 3, ESTADO: 4, INICIO: 5, ENTREGA: 6, NOTA: 7, PUBLICAR: 8, CREADO: 9, ACTUALIZO: 10 };
var CABECERA = ['Código', 'Proyecto', 'Pedido', 'Estado', 'Inicio', 'Entrega estimada', 'Nota', 'Publicar', 'Creado', 'Actualizó'];
var ESTADOS = ['Recibido', 'En el horno', 'Emplatando', 'Servido'];
var ESTADO_ID = { 'recibido': 'recibido', 'en el horno': 'horno', 'emplatando': 'emplatando', 'servido': 'servido' };


// ════════════════════════════════════════════════════════════
// 2. FUNCIONES PURAS
// ════════════════════════════════════════════════════════════

/** "oliv.ia" → "olivia" · "El hogar" → "el-hogar" · "Café Ñandú" → "cafe-nandu" */
function slugDe(texto) {
  var s = String(texto == null ? '' : texto)
    .replace(/\./g, '')                       // los puntos se quitan antes de convertir
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')   // sin tildes (la ñ queda en n)
    .replace(/[^a-z0-9]+/g, '-')              // espacios y otros símbolos → guion
    .replace(/^-+|-+$/g, '');                 // sin guiones al principio ni al final
  if (s.length > SLUG_MAX) s = s.slice(0, SLUG_MAX).replace(/-+$/, '');
  return s || 'proyecto';
}

/** número con relleno a 3 dígitos: 7 → "007", 1234 → "1234" */
function rellenarNumero(n) {
  var s = String(Math.floor(Math.abs(Number(n) || 0)));
  while (s.length < 3) s = '0' + s;
  return s;
}

/**
 * Deja un código en su forma canónica: "CK-001-izate-7K4M".
 * Acepta mayúsculas o minúsculas, espacios, guiones bajos, guiones de más y "CK001" pegado.
 * Si no tiene la forma mínima, lo devuelve recortado (y validarCodigo dirá que no vale).
 */
function normalizarCodigo(entrada) {
  var s = String(entrada == null ? '' : entrada).trim();
  if (s.length > LARGO_MAX * 2) return s;
  var partes = s.split(/[\s_\-]+/).filter(function (p) { return p; });
  if (partes.length && /^ck\d+$/i.test(partes[0])) partes.splice(0, 1, 'CK', partes[0].slice(2));
  if (partes.length < 4 || partes[0].toUpperCase() !== 'CK') return s;
  var numero = partes[1];
  var sufijo = partes[partes.length - 1].toUpperCase();
  var slug = partes.slice(2, -1).join('-').toLowerCase();
  return 'CK-' + numero + '-' + slug + '-' + sufijo;
}

/** true solo si el código (ya normalizado) tiene el formato exacto */
function validarCodigo(codigo) {
  return typeof codigo === 'string' && codigo.length <= LARGO_MAX && PATRON_CODIGO.test(codigo);
}

/**
 * 4 caracteres del ALFABETO, sin sesgo: se descartan los bytes ≥ 248 (múltiplo de 31).
 * fuente() devuelve una lista de bytes aleatorios (0–255).
 */
function generarSufijo(fuente) {
  var limite = 256 - (256 % ALFABETO.length);
  var s = '';
  while (s.length < 4) {
    var bytes = fuente();
    for (var i = 0; i < bytes.length && s.length < 4; i++) {
      if (bytes[i] < limite) s += ALFABETO.charAt(bytes[i] % ALFABETO.length);
    }
  }
  return s;
}

function componerCodigo(numero, proyecto, sufijo) {
  return 'CK-' + rellenarNumero(numero) + '-' + slugDe(proyecto) + '-' + sufijo;
}

/** el número de un código: "CK-012-izate-7K4M" → 12 (0 si no tiene) */
function numeroDe(codigo) {
  var m = /^CK-(\d+)-/.exec(String(codigo || ''));
  return m ? parseInt(m[1], 10) : 0;
}

/** texto recortado, o null si está vacío */
function textoONulo(v) {
  var s = String(v == null ? '' : v).trim();
  return s ? s : null;
}

/** "Branding\nWeb\n\nIA" → ["Branding", "Web", "IA"] (o null si no hay nada) */
function lineasPedido(v) {
  var lineas = String(v == null ? '' : v).split(/\r?\n/)
    .map(function (l) { return l.trim(); })
    .filter(function (l) { return l; });
  return lineas.length ? lineas : null;
}

/** "En el horno" → "horno" (o null si no es uno de los cuatro estados) */
function estadoId(v) {
  return ESTADO_ID[String(v == null ? '' : v).trim().toLowerCase()] || null;
}

/** "Sí" (o "Si") publica; cualquier otra cosa, no */
function estaPublicado(v) {
  var s = String(v == null ? '' : v).trim().toLowerCase();
  return s === 'sí' || s === 'si';
}

/** fecha escrita como texto "dd/mm/yyyy" → "yyyy-MM-dd" (o null) */
function fechaDesdeTexto(v) {
  var m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(String(v == null ? '' : v).trim());
  if (!m) return null;
  var d = +m[1], mes = +m[2], a = +m[3];
  var f = new Date(Date.UTC(a, mes - 1, d));
  if (f.getUTCFullYear() !== a || f.getUTCMonth() !== mes - 1 || f.getUTCDate() !== d) return null;
  return a + '-' + (mes < 10 ? '0' : '') + mes + '-' + (d < 10 ? '0' : '') + d;
}


// ════════════════════════════════════════════════════════════
// 3. LA HOJA (lado del propietario: nada de esto sale a la web)
// ════════════════════════════════════════════════════════════

/** bytes aleatorios fuertes a partir de Utilities.getUuid() (UUID v4) */
function bytesAleatorios_() {
  var hex = Utilities.getUuid().replace(/-/g, '');
  // el carácter 12 es la versión (fijo) y el 16 lleva los bits de variante: se saltan
  hex = hex.slice(0, 12) + hex.slice(13, 16) + hex.slice(17);
  var bytes = [];
  for (var i = 0; i + 1 < hex.length; i += 2) bytes.push(parseInt(hex.substr(i, 2), 16));
  return bytes;
}

function hoja_() {
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(HOJA);
}

/** Se ejecuta UNA vez a mano: crea la pestaña, la cabecera, los desplegables y las protecciones. */
function configurarHoja() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  ss.setSpreadsheetTimeZone(ZONA);
  var sh = ss.getSheetByName(HOJA) || ss.insertSheet(HOJA);

  sh.getRange(1, 1, 1, CABECERA.length).setValues([CABECERA]).setFontWeight('bold');
  sh.setFrozenRows(1);
  var filas = sh.getMaxRows() - 1;

  // D · Estado: desplegable
  sh.getRange(2, COL.ESTADO, filas, 1).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(ESTADOS, true).setAllowInvalid(false).build());
  // H · Publicar: Sí / No
  sh.getRange(2, COL.PUBLICAR, filas, 1).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(['Sí', 'No'], true).setAllowInvalid(false).build());
  // E y F · fechas dd/mm/yyyy
  var fechas = SpreadsheetApp.newDataValidation().requireDate().setAllowInvalid(false)
    .setHelpText('Escribe una fecha, por ejemplo 16/11/2026.').build();
  sh.getRange(2, COL.INICIO, filas, 2).setDataValidation(fechas).setNumberFormat('dd/mm/yyyy');
  // I · Creado
  sh.getRange(2, COL.CREADO, filas, 1).setNumberFormat('dd/mm/yyyy hh:mm');
  // C y G · varias líneas dentro de la celda
  sh.getRange(2, COL.PEDIDO, filas, 1).setWrap(true);
  sh.getRange(2, COL.NOTA, filas, 1).setWrap(true);

  // A e I · protegidas con aviso (el script sí puede escribir)
  sh.getProtections(SpreadsheetApp.ProtectionType.RANGE).forEach(function (p) {
    if (/^Chiskey:/.test(p.getDescription())) p.remove();
  });
  [COL.CODIGO, COL.CREADO].forEach(function (c) {
    sh.getRange(1, c, sh.getMaxRows(), 1).protect()
      .setDescription('Chiskey: columna automática, no se edita a mano')
      .setWarningOnly(true);
  });

  sh.setColumnWidth(COL.CODIGO, 210);
  sh.setColumnWidth(COL.PROYECTO, 160);
  sh.setColumnWidth(COL.PEDIDO, 220);
  sh.setColumnWidth(COL.NOTA, 260);

  crearMenu_();
  // desde el editor de Apps Script no hay ventana de aviso: queda en el registro de ejecución
  try { SpreadsheetApp.getUi().alert('La hoja "' + HOJA + '" está lista.'); }
  catch (e) { console.log('La hoja "' + HOJA + '" está lista. Recarga la hoja para ver el menú Chiskey.'); }
}

function onOpen() {
  crearMenu_();
}

function crearMenu_() {
  try {
    SpreadsheetApp.getUi().createMenu('Chiskey')
      .addItem('Generar código de la fila seleccionada', 'generarCodigoSeleccion')
      .addItem('Revisar la hoja', 'revisarHoja')
      .addToUi();
  } catch (e) {}   // sin hoja abierta (p. ej. ejecutado desde el editor): el menú sale al abrir la hoja
}

/**
 * Disparador simple: al escribir el Proyecto (B) en una fila sin Código (A), genera el código.
 * Si el proyecto cambia después, el código NO cambia (el cliente ya lo tiene).
 * Además olvida la caché de las filas editadas, para que la web vea el cambio al momento.
 */
function onEdit(e) {
  if (!e || !e.range) return;
  var sh = e.range.getSheet();
  if (sh.getName() !== HOJA) return;
  var primera = Math.max(2, e.range.getRow());
  var ultima = e.range.getLastRow();
  if (ultima < primera) return;
  var cuantas = Math.min(ultima - primera + 1, 500);

  var valores = sh.getRange(primera, 1, cuantas, 2).getValues();   // A y B
  var cache = CacheService.getScriptCache();
  var tocaB = e.range.getColumn() <= COL.PROYECTO && e.range.getLastColumn() >= COL.PROYECTO;

  for (var i = 0; i < cuantas; i++) {
    var codigo = String(valores[i][0] || '').trim();
    if (codigo) cache.remove(claveCache_(codigo));
    if (tocaB && !codigo && textoONulo(valores[i][1])) asignarCodigo_(sh, primera + i, false);
  }
}

/**
 * Escribe un código nuevo en la fila. Con candado: dos ediciones a la vez nunca sacan el mismo número.
 * conservarNumero: el menú lo usa para cambiar slug y sufijo manteniendo el número.
 */
function asignarCodigo_(sh, fila, conservarNumero) {
  var candado = LockService.getDocumentLock();
  if (!candado.tryLock(10000)) throw new Error('La hoja está ocupada; vuelve a intentarlo.');
  try {
    SpreadsheetApp.flush();
    var props = PropertiesService.getDocumentProperties();
    var ultimo = parseInt(props.getProperty('ultimoNumero') || '0', 10) || 0;
    var existentes = {};
    var mayor = 0;
    leerCodigos_(sh).forEach(function (c) {
      existentes[c] = true;
      mayor = Math.max(mayor, numeroDe(c));
    });

    var anterior = String(sh.getRange(fila, COL.CODIGO).getValue() || '').trim();
    var numero = conservarNumero && numeroDe(anterior) ? numeroDe(anterior) : Math.max(mayor, ultimo) + 1;
    var proyecto = sh.getRange(fila, COL.PROYECTO).getValue();

    var codigo;
    do { codigo = componerCodigo(numero, proyecto, generarSufijo(bytesAleatorios_)); } while (existentes[codigo]);

    sh.getRange(fila, COL.CODIGO).setValue(codigo);                       // valor fijo, nunca fórmula
    if (!conservarNumero || !sh.getRange(fila, COL.CREADO).getValue()) sh.getRange(fila, COL.CREADO).setValue(new Date());
    if (!textoONulo(sh.getRange(fila, COL.PUBLICAR).getValue())) sh.getRange(fila, COL.PUBLICAR).setValue('No');
    props.setProperty('ultimoNumero', String(Math.max(numero, ultimo)));
    if (anterior) CacheService.getScriptCache().remove(claveCache_(anterior));
    SpreadsheetApp.flush();
    return codigo;
  } finally {
    candado.releaseLock();
  }
}

function leerCodigos_(sh) {
  var n = sh.getLastRow() - 1;
  if (n < 1) return [];
  return sh.getRange(2, COL.CODIGO, n, 1).getValues()
    .map(function (f) { return String(f[0] || '').trim(); })
    .filter(function (c) { return c; });
}

/** Menú: genera (o rehace, con confirmación) el código de la fila seleccionada. */
function generarCodigoSeleccion() {
  var ui = SpreadsheetApp.getUi();
  var sh = SpreadsheetApp.getActiveSheet();
  if (sh.getName() !== HOJA) { ui.alert('Ve a la pestaña "' + HOJA + '" y selecciona una fila.'); return; }
  var fila = sh.getActiveRange().getRow();
  if (fila < 2) { ui.alert('Selecciona una fila de pedido (no la cabecera).'); return; }
  if (!textoONulo(sh.getRange(fila, COL.PROYECTO).getValue())) { ui.alert('Esa fila no tiene Proyecto.'); return; }

  var actual = textoONulo(sh.getRange(fila, COL.CODIGO).getValue());
  if (actual) {
    var r = ui.alert('Esta fila ya tiene código',
      'El cliente puede tener ya este código. Si generas uno nuevo, el anterior deja de funcionar ' +
      '(se mantiene el número; cambian el nombre del proyecto y las 4 letras finales). ¿Generar uno nuevo?',
      ui.ButtonSet.YES_NO);
    if (r !== ui.Button.YES) return;
  }
  var codigo = asignarCodigo_(sh, fila, !!actual);
  ui.alert('Código de la fila ' + fila + ': ' + codigo);
}

/** Menú: filas publicadas a las que les falta algo y códigos repetidos. */
function revisarHoja() {
  var ui = SpreadsheetApp.getUi();
  var sh = hoja_();
  if (!sh) { ui.alert('No existe la pestaña "' + HOJA + '". Ejecuta configurarHoja().'); return; }
  var n = sh.getLastRow() - 1;
  if (n < 1) { ui.alert('La hoja no tiene pedidos todavía.'); return; }
  var filas = sh.getRange(2, 1, n, COL.PUBLICAR).getValues();
  var avisos = [];
  var vistos = {};

  filas.forEach(function (f, i) {
    var num = i + 2;
    var codigo = String(f[0] || '').trim();
    if (codigo) {
      if (vistos[codigo]) avisos.push('Filas ' + vistos[codigo] + ' y ' + num + ': código repetido.');
      else vistos[codigo] = num;
      if (!validarCodigo(codigo)) avisos.push('Fila ' + num + ': el código no tiene el formato correcto.');
    }
    if (estaPublicado(f[COL.PUBLICAR - 1])) {
      var falta = [];
      if (!codigo) falta.push('Código');
      if (!lineasPedido(f[COL.PEDIDO - 1])) falta.push('Pedido');
      if (!estadoId(f[COL.ESTADO - 1])) falta.push('Estado');
      if (!fechaISO_(f[COL.INICIO - 1])) falta.push('Inicio');
      if (!fechaISO_(f[COL.ENTREGA - 1])) falta.push('Entrega estimada');
      if (falta.length) avisos.push('Fila ' + num + ' (publicada): falta ' + falta.join(', ') + '.');
    }
  });

  ui.alert('Revisar la hoja', avisos.length ? avisos.slice(0, 40).join('\n') : 'Todo en orden.', ui.ButtonSet.OK);
}

/** fecha de la hoja (Date o texto dd/mm/yyyy) → "yyyy-MM-dd" en Europe/Madrid, o null */
function fechaISO_(v) {
  if (v instanceof Date && !isNaN(v.getTime())) return Utilities.formatDate(v, ZONA, 'yyyy-MM-dd');
  return fechaDesdeTexto(v);
}


// ════════════════════════════════════════════════════════════
// 4. LA APLICACIÓN WEB: un solo parámetro (codigo), una sola respuesta JSON
// ════════════════════════════════════════════════════════════
function doGet(e) {
  var respuesta;
  try {
    respuesta = consultar_(e && e.parameter ? e.parameter.codigo : '');
  } catch (err) {
    console.error('doGet: fallo interno (' + (err && err.name) + ')');   // sin datos de la consulta
    respuesta = { ok: false, error: 'error' };
  }
  return ContentService.createTextOutput(JSON.stringify(respuesta))
    .setMimeType(ContentService.MimeType.JSON);
}

function consultar_(entrada) {
  var cache = CacheService.getScriptCache();
  // con el freno activo, nadie consulta (ni con un código correcto) hasta que pase la ventana
  if (frenoActivo_(cache)) return { ok: false, error: 'limite' };

  var codigo = normalizarCodigo(entrada);
  if (!validarCodigo(codigo)) return { ok: false, error: 'formato_invalido' };

  var clave = claveCache_(codigo);
  var guardado = cache.get(clave);
  if (guardado) return JSON.parse(guardado);

  var pedido = buscarPedido_(codigo);
  if (!pedido) {
    // inexistente, sufijo incorrecto o no publicado: la misma respuesta en los tres casos
    registrarFallo_(cache);
    Utilities.sleep(PAUSA_FALLO_MS);
    return { ok: false, error: 'no_encontrado' };
  }
  var respuesta = { ok: true, pedido: pedido };
  cache.put(clave, JSON.stringify(respuesta), CACHE_ACIERTO_SEG);
  return respuesta;
}

/** busca por coincidencia EXACTA del código completo; solo devuelve lo que ve el cliente */
function buscarPedido_(codigo) {
  var sh = hoja_();
  if (!sh) throw new Error('Sin pestaña');
  var n = sh.getLastRow() - 1;
  if (n < 1) return null;
  var filas = sh.getRange(2, 1, n, COL.PUBLICAR).getValues();   // A–H: la columna J nunca se lee aquí
  var encontrada = null;
  for (var i = 0; i < filas.length; i++) {
    if (String(filas[i][0] || '').trim() !== codigo) continue;
    if (encontrada) { console.warn('Código repetido en la hoja: revisa con "Revisar la hoja".'); return null; }
    encontrada = filas[i];
  }
  if (!encontrada || !estaPublicado(encontrada[COL.PUBLICAR - 1])) return null;
  return {
    codigo: codigo,
    proyecto: textoONulo(encontrada[COL.PROYECTO - 1]),
    pedido: lineasPedido(encontrada[COL.PEDIDO - 1]),
    estado: estadoId(encontrada[COL.ESTADO - 1]),
    inicio: fechaISO_(encontrada[COL.INICIO - 1]),
    entrega: fechaISO_(encontrada[COL.ENTREGA - 1]),
    nota: textoONulo(encontrada[COL.NOTA - 1])
  };
}

/** clave de caché sin el código en claro */
function claveCache_(codigo) {
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, codigo, Utilities.Charset.UTF_8);
  return 'p:' + bytes.map(function (b) { return ((b + 256) % 256).toString(16); }).join('');
}

// ── freno: contador global de búsquedas fallidas por ventana ──
function leerFallos_(cache) {
  try {
    var d = JSON.parse(cache.get('fallos') || 'null');
    if (d && Date.now() - d.inicio < VENTANA_SEG * 1000) return d;
  } catch (e) {}
  return null;
}

function frenoActivo_(cache) {
  var d = leerFallos_(cache);
  return !!(d && d.n >= UMBRAL_FALLOS);
}

function registrarFallo_(cache) {
  var candado = LockService.getScriptLock();
  if (!candado.tryLock(2000)) return;
  try {
    var d = leerFallos_(cache) || { n: 0, inicio: Date.now() };
    d.n++;
    var restante = Math.max(1, Math.ceil(VENTANA_SEG - (Date.now() - d.inicio) / 1000));
    cache.put('fallos', JSON.stringify(d), restante);
    if (d.n === UMBRAL_FALLOS) {
      console.warn('Freno activado: ' + d.n + ' búsquedas fallidas en ' + (VENTANA_SEG / 60) + ' minutos. ' +
        'La consulta responde "limite" hasta que pase la ventana.');
    }
  } finally {
    candado.releaseLock();
  }
}
