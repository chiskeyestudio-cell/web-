// ==========================================================
// PRUEBAS · funciones puras del script de pedidos (/tupedido/apps-script/Code.gs)
// Se ejecuta con Node, sin instalar nada:   node _pruebas/funciones.test.js
// Esta carpeta empieza por "_": GitHub Pages (Jekyll) no la publica en la web.
// ==========================================================
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');

// carga Code.gs con un Utilities mínimo (solo lo que usan las funciones puras y el sufijo)
const contexto = {
  Utilities: { getUuid: () => crypto.randomUUID() },
  console
};
vm.createContext(contexto);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'tupedido', 'apps-script', 'Code.gs'), 'utf8'), contexto);
const G = contexto;

let fallos = 0, total = 0;
function igual(nombre, obtenido, esperado) {
  total++;
  const ok = JSON.stringify(obtenido) === JSON.stringify(esperado);
  if (!ok) { fallos++; console.log(`✗ ${nombre}\n    obtenido: ${JSON.stringify(obtenido)}\n    esperado: ${JSON.stringify(esperado)}`); }
}

// ── slug ──
igual('slug oliv.ia', G.slugDe('oliv.ia'), 'olivia');
igual('slug El hogar', G.slugDe('El hogar'), 'el-hogar');
igual('slug Café Ñandú', G.slugDe('Café Ñandú'), 'cafe-nandu');
igual('slug mayúsculas y espacios', G.slugDe('  IZATE   Consulting 360 '), 'izate-consulting-360');
igual('slug símbolos y guiones de más', G.slugDe('--Pan & Vino!!--'), 'pan-vino');
igual('slug vacío', G.slugDe(''), 'proyecto');
igual('slug solo símbolos', G.slugDe('!!!'), 'proyecto');
igual('slug null', G.slugDe(null), 'proyecto');
igual('slug largo (40 máx, sin guion final)', G.slugDe('a'.repeat(39) + ' bbbbbb').length <= 40 && !/-$/.test(G.slugDe('a'.repeat(39) + ' bbbbbb')), true);

// ── número ──
igual('relleno 7', G.rellenarNumero(7), '007');
igual('relleno 42', G.rellenarNumero(42), '042');
igual('relleno 1234', G.rellenarNumero(1234), '1234');
igual('numeroDe', G.numeroDe('CK-012-izate-7K4M'), 12);
igual('numeroDe sin número', G.numeroDe('xyz'), 0);
igual('componer', G.componerCodigo(1, 'oliv.ia', '7K4M'), 'CK-001-olivia-7K4M');

// ── normalizar + validar ──
const N = s => G.normalizarCodigo(s);
const V = s => G.validarCodigo(G.normalizarCodigo(s));
igual('canónico', N('CK-001-izate-7K4M'), 'CK-001-izate-7K4M');
igual('minúsculas', N('ck-001-izate-7k4m'), 'CK-001-izate-7K4M');
igual('mezcladas', N('cK-001-IzAtE-7k4M'), 'CK-001-izate-7K4M');
igual('espacios', N('  CK 001 izate 7K4M  '), 'CK-001-izate-7K4M');
igual('guiones bajos', N('CK_001_el_hogar_7K4M'), 'CK-001-el-hogar-7K4M');
igual('guiones de más', N('CK--001---el-hogar--7K4M-'), 'CK-001-el-hogar-7K4M');
igual('CK001 pegado', N('ck001-izate-7k4m'), 'CK-001-izate-7K4M');
igual('slug con guiones', N('CK-003-el-hogar-AB23'), 'CK-003-el-hogar-AB23');
igual('válido', V('CK-001-izate-7K4M'), true);
igual('válido con slug de guiones', V('ck 003 el hogar ab23'), true);
igual('válido número largo', V('CK-1234-izate-7K4M'), true);
igual('sufijo con 0', V('CK-001-izate-7K40'), false);
igual('sufijo con O', V('CK-001-izate-7KOM'), false);
igual('sufijo con 1', V('CK-001-izate-7K1M'), false);
igual('sufijo con I', V('CK-001-izate-7KIM'), false);
igual('sufijo con L', V('CK-001-izate-7KLM'), false);
igual('sufijo de 3', V('CK-001-izate-7K4'), false);
igual('sufijo de 5', V('CK-001-izate-7K4MN'), false);
igual('sin sufijo', V('CK-001-izate'), false);
igual('sin slug', V('CK-001-7K4M'), false);
igual('número de 2 dígitos', V('CK-01-izate-7K4M'), false);
igual('sin CK', V('XK-001-izate-7K4M'), false);
igual('vacío', V(''), false);
igual('null', V(null), false);
igual('formato viejo CK-001', V('CK-001'), false);
igual('placeholder de la web (tiene 1)', V('CK-000-ejemplo-AB12'), false);
igual('slug con tilde no vale', V('CK-001-café-7K4M'), false);
igual('muy largo', V('CK-001-' + 'a'.repeat(200) + '-7K4M'), false);
igual('enorme', V('CK-001-' + 'a-'.repeat(5000) + '7K4M'), false);
igual('html', V('<script>alert(1)</script>'), false);

// ── sufijo ──
const permitido = /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{4}$/;
let malos = 0;
const cuenta = {};
for (let i = 0; i < 20000; i++) {
  const s = G.generarSufijo(G.bytesAleatorios_);
  if (!permitido.test(s)) malos++;
  for (const c of s) cuenta[c] = (cuenta[c] || 0) + 1;
}
igual('20 000 sufijos: todos del alfabeto (sin 0 O 1 I L)', malos, 0);
igual('se usan los 31 caracteres', Object.keys(cuenta).length, 31);
const media = 80000 / 31, peor = Math.max(...Object.values(cuenta).map(n => Math.abs(n - media) / media));
igual('reparto parejo (ningún carácter se desvía más de un 10 %)', peor < 0.10, true);
igual('descarta bytes ≥ 248 (sin sesgo)', G.generarSufijo(() => [255, 248, 0, 30, 247, 31]), 'A99A');   // 255 y 248 se descartan; 0→A, 30→9, 247→9, 31→A

// ── datos de la fila ──
igual('líneas del pedido', G.lineasPedido('Branding\n Web \n\nIA'), ['Branding', 'Web', 'IA']);
igual('pedido vacío', G.lineasPedido('   '), null);
igual('estado', G.estadoId('En el horno'), 'horno');
igual('estado con espacios/mayúsculas', G.estadoId(' servido '), 'servido');
igual('estado desconocido', G.estadoId('Cocinando'), null);
igual('publicado Sí', G.estaPublicado('Sí'), true);
igual('publicado Si', G.estaPublicado('si'), true);
igual('no publicado', G.estaPublicado('No'), false);
igual('publicar vacío', G.estaPublicado(''), false);
igual('fecha texto', G.fechaDesdeTexto('16/11/2026'), '2026-11-16');
igual('fecha texto 1 dígito', G.fechaDesdeTexto('6/3/2027'), '2027-03-06');
igual('fecha imposible', G.fechaDesdeTexto('31/02/2026'), null);
igual('fecha basura', G.fechaDesdeTexto('mañana'), null);
igual('nota vacía', G.textoONulo('  '), null);

console.log(`\n${total - fallos} de ${total} pruebas correctas${fallos ? ` · ${fallos} FALLAN` : ''}`);
process.exit(fallos ? 1 : 0);
