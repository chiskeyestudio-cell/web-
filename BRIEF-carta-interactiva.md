# Brief para Claude Code — Carta interactiva de Chiskey

## Objetivo
Convertir la página de "La Carta" (servicios) en una **carta interactiva** donde el visitante
arma su propio pedido haciendo clic en platos y packs, como en un menú de comida. **No hay
compra ni pago.** Al final, un botón **"Reservar mesa"** abre el formulario de comanda ya existente
con la selección incluida, y al enviar nos llega por correo (Formspree) con todas las especificaciones.

## Datos
Usa el archivo `menus-data.json` (va junto a este brief). Contiene 6 menús:
branding, web (con sección extra "App"), ecommerce, packaging, redes, editorial.
Cada item tiene: `id`, `nombre`, `precio` (texto para mostrar), `descripcion`,
`monto` (número o null) y `periodo` ("unico" o "mes"). **No hardcodees los textos; léelos del JSON.**

## Estructura y navegación (es lo más importante: hay muchas opciones)
1. **Navegación por menú.** Arriba, una fila de pestañas/segmentos: Branding · Web/App · Ecommerce ·
   Packaging · Redes · Editorial. Al hacer clic se muestra solo ese menú. En móvil, que las pestañas
   hagan scroll horizontal o se conviertan en un desplegable. Marca la pestaña activa.
2. Dentro de cada menú, dos bloques claros:
   - **Packs** (Completo / Esencial / Simple): tarjetas más grandes, cada una con nombre, precio,
     descripción y botón **"Agregar"**.
   - **Platos individuales**: lista compacta, cada fila con nombre, precio corto, descripción breve
     y botón o icono **"+"** para agregar.
   - Si el menú tiene `extra` (App), muéstralo como un sub-bloque con su título.
   - Si tiene `aclaracion`, muéstrala como nota pequeña bajo la intro.
   - Si tiene `nota`, muéstrala como recuadro (ej. ecommerce → "consulta el Menú Web").
3. **Comanda lateral/flotante ("Tu comanda").** Un panel siempre visible (en desktop a la derecha;
   en móvil una barra fija abajo que se expande):
   - Lista de lo agregado, con nombre, precio y una **"x"** para quitar cada cosa.
   - **Estimado** de los items de pago único (suma de `monto` con `periodo:"unico"`), mostrado como
     "Estimado: XXX € + IVA".
   - Los items con `periodo:"mes"` se listan aparte como "Mensual: XX €/mes" (no se suman al estimado único).
   - Si hay items sin `monto` (rangos), muéstralos en la lista sin romper el estimado.
   - Contador de items y botón grande **"Reservar mesa"**.
   - Texto honesto bajo el total: "Estimado orientativo. Cerramos el precio final al sentarnos a la mesa."

## Interacción de agregar
- Clic en "Agregar"/"+" añade el item a la comanda (permite varios distintos; para repetir el mismo,
  basta con que sume cantidad o lo ignore — mantenlo simple: cantidad opcional).
- Feedback visual al agregar (el botón cambia a "Agregado ✓" o el item se marca).
- Poder quitar desde la comanda.
- Guarda la selección en `localStorage` para que no se pierda si recargan (envuelto en try/catch).

## Botón "Reservar mesa" → comanda por correo
- Reutiliza el **modal de comanda / formulario existente** (el que ya envía a Formspree
  `https://formspree.io/f/xyzovndj`). No crees uno nuevo si ya existe.
- Al abrir el modal, **rellena un campo oculto** (p. ej. `<input type="hidden" name="pedido">` o un
  `<textarea name="pedido">`) con el detalle de la selección en texto legible, por ejemplo:

  ```
  COMANDA
  - [Web/App] Pack Esencial — 1.200 €
  - [Web/App] Tienda online (carrito) — 700 €
  - [Redes] Esencial — 380 €/mes
  Estimado único: 1.900 € + IVA
  Mensual: 380 €/mes
  ```
- Mantén los campos actuales del formulario (nombre, correo, teléfono, ciudad, etc.).
- Al enviar, debe llegar el correo con esos campos + el detalle del pedido. No agregues pago, carrito
  de compra, ni pasarela. El único CTA de cierre es **Reservar mesa**.

## Marca y estilo (respetar lo que ya hay en styles.css)
- Tipografías: **Outfit** para títulos/nombres/precios, **Urbanist** para textos y descripciones.
- Colores: **#E91E63** (rosa, acento y precios/CTA) y **#5B6C8F** (azul, textos y estructura).
  Fondo claro. Nada de otros colores nuevos.
- Lenguaje de cocina (ya es el de la marca): "Agregar", "Tu comanda", "Reservar mesa", "platos",
  "menús". Mantén el registro latinoamericano (tú/ustedes), directo, sin venta inflada.
- Coherente con el resto del sitio: mismo header, mismo modal de comanda.

## Accesibilidad y responsive
- Todo navegable con teclado; botones con `aria-label`.
- Móvil primero: pestañas usables, comanda como barra inferior fija, sin scroll horizontal de la página.

## Criterios de aceptación (revisar al final)
- [ ] Se ven los 6 menús con sus packs y platos leídos del JSON.
- [ ] Puedo cambiar de menú, agregar y quitar items, y la comanda se actualiza.
- [ ] El estimado suma correctamente los pagos únicos y lista aparte los mensuales.
- [ ] "Reservar mesa" abre el modal con el detalle del pedido precargado en un campo oculto.
- [ ] Al enviar, el correo de Formspree incluye los datos del contacto + el detalle del pedido.
- [ ] No hay ningún flujo de compra/pago en ninguna parte.
- [ ] Funciona en móvil y respeta tipografías y colores de marca.

## Decisión pendiente para Xavi
¿Mostrar los precios en la carta pública? Este brief asume que **sí** (encaja con "cocina abierta").
Si prefieres no mostrarlos, dile a Claude Code que oculte los precios y el estimado, y deje solo la
selección de items; el correo igual puede incluir los precios internamente.
