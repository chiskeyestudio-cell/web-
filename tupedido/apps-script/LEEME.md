# Seguimiento de pedidos: la hoja y su script

Esta guía explica cómo poner en marcha la consulta de pedidos de la web (`/tupedido/`) y cómo usarla en el día a día.

Funciona así:

- Los pedidos se apuntan en una **hoja de Google** de la cuenta de Gmail de la empresa.
- Un **script** pegado a esa hoja hace dos cosas:
  - genera el código de cada pedido;
  - cuando un cliente escribe su código en la web, le devuelve **solo su pedido**.
- La hoja no se comparte con nadie. La web no ve la hoja: solo recibe la respuesta del script, y únicamente para el código exacto.

> **Aviso:** esta carpeta se publica en el repositorio y se puede ver por web. Nunca pegues aquí el enlace de la hoja, su ID, la URL del script ni ningún dato real.

---

## 1. Puesta en marcha (una sola vez)

### 1) Crear la hoja
1. Entra en [Google Drive](https://drive.google.com) con la **cuenta de Gmail de la empresa**.
2. **Nuevo → Hojas de cálculo de Google → Hoja de cálculo en blanco**.
3. Ponle un nombre que reconozcan, por ejemplo "Pedidos Chiskey". El nombre no importa al script.

✔ Comprobación: la hoja aparece en "Mi unidad" de la cuenta de la empresa.

### 2) Pegar el script
1. En la hoja: **Extensiones → Apps Script**. Se abre el editor en otra pestaña.
2. Verás un archivo `Código.gs` con unas líneas. Bórralas todas y pega el contenido completo de `Code.gs` (este repositorio, carpeta `tupedido/apps-script/`).
3. Para el archivo de configuración: en el editor, abajo a la izquierda, entra en **Configuración del proyecto** (el engranaje) y activa **"Mostrar el archivo de manifiesto appsscript.json en el editor"**. Vuelve a **Editor** (el icono `< >`), abre `appsscript.json` y sustituye su contenido por el de `appsscript.json` de esta carpeta.
4. Pulsa **Guardar** (el disquete). Ponle un nombre al proyecto si lo pide, por ejemplo "Pedidos Chiskey".

✔ Comprobación: en el editor hay dos archivos, `Código.gs` y `appsscript.json`, y al guardar no sale ningún error en rojo.

### 3) Preparar la hoja: `configurarHoja`
1. En la barra de arriba del editor, en el desplegable de funciones, elige **configurarHoja** y pulsa **Ejecutar**.
2. Google pedirá permisos ("Se requiere autorización"):
   1. Elige la cuenta de la empresa.
   2. Si aparece "Google no ha verificado esta aplicación", pulsa **Configuración avanzada → Ir a Pedidos Chiskey (no seguro)**. Es tu propio script; el aviso sale con todos los scripts personales.
   3. Pulsa **Permitir**.
3. Vuelve a la pestaña de la hoja y **recárgala** (F5).

✔ Comprobación:
- hay una pestaña **Pedidos** con estas columnas: Código, Proyecto, Pedido, Estado, Inicio, Entrega estimada, Nota, Publicar, Creado, Actualizó;
- la primera fila queda fija al bajar;
- arriba aparece el menú **Chiskey**.

### 4) Publicar el script como aplicación web
1. En el editor: **Implementar → Nueva implementación**.
2. En "Seleccionar tipo" (el engranaje), elige **Aplicación web**.
3. Rellena:
   - **Descripción:** "Consulta de pedidos".
   - **Ejecutar como:** **Yo** (la cuenta de la empresa).
   - **Quién tiene acceso:** **Cualquier persona**.
4. Pulsa **Implementar** y acepta los permisos si los vuelve a pedir.

"Cualquier persona" significa que cualquiera puede *preguntar por un código*, no ver la hoja. El script solo contesta con el pedido de ese código exacto, si está publicado.

### 5) Copiar la URL y pegarla en la web
1. Al terminar, Google muestra la **URL de la aplicación web**, que **termina en `/exec`**. Cópiala.
2. Abre `tupedido/pedido.js` y, al principio, cambia
   `const URL_API = 'PEGAR_AQUI_URL_EXEC';`
   por la URL entre comillas.
3. Esa URL es la única que va en la web. **No la pegues en esta carpeta ni en ningún otro sitio del repositorio.**

✔ Comprobación: si abres en el navegador la URL `/exec` sola, sin nada detrás, ves `{"ok":false,"error":"formato_invalido"}`. Es lo correcto: no le pasaste ningún código.

### 6) Cómo entra el equipo a la hoja
- Las dos personas que actualizan pedidos abren la hoja **con la cuenta de Gmail de la empresa**. La hoja **no se comparte** con otras cuentas.
- Como entran con la misma cuenta, la hoja **no distingue quién hizo cada cambio**: el historial siempre muestra la cuenta de la empresa. Para saberlo, escribe tu nombre en la columna **Actualizó** cada vez que cambies una fila. Es opcional, es solo para ustedes y nunca sale a la web.

### 7) Cómo actualizar el script (importante)
Si algún día cambias `Code.gs`, **no basta con guardar**: la URL `/exec` sigue sirviendo la versión anterior hasta que publiques una nueva.

1. Guarda los cambios en el editor.
2. **Implementar → Administrar implementaciones**.
3. Elige la implementación "Consulta de pedidos" y pulsa el **lápiz (Editar)**.
4. En **Versión**, elige **Nueva versión** y pulsa **Implementar**.

Así **la URL no cambia** y la web no hay que tocarla. Si en cambio haces "Nueva implementación", sale una URL distinta y habría que pegarla otra vez en `pedido.js`.

---

## 2. El día a día

### Añadir un pedido
1. En una fila vacía, escribe el **Proyecto** (columna B). Ese nombre es el que ve el cliente como "Comensal".
2. Espera un segundo: el **Código** aparece solo en la columna A, por ejemplo `CK-008-el-hogar-7K4M`. **Creado** se rellena solo y **Publicar** queda en "No".
3. Rellena:
   - **Pedido:** un elemento por línea dentro de la celda. Para saltar de línea dentro de la celda: **Ctrl + Intro** (Windows) o **⌘ + Intro** (Mac).
   - **Estado:** elígelo en el desplegable.
   - **Inicio** y **Entrega estimada:** fechas como 16/11/2026.
   - **Nota:** solo si quieres que el cliente lea algo. Lo que escribas aquí **lo ve el cliente**.
4. Cuando todo esté bien, pon **Publicar** en **Sí**. Hasta entonces, la web responde "No encontramos ese pedido".

Si el código no aparece (por ejemplo, porque pegaste varias filas de golpe), selecciona la fila y usa **Chiskey → Generar código de la fila seleccionada**.

### Cambiar de estado
Cambia el desplegable de **Estado**. La web lo muestra en la siguiente consulta, al momento.

### Ocultar un pedido
Pon **Publicar** en **No**. La web responde "No encontramos ese pedido", igual que con un código que no existe.

### Cambiar el nombre del proyecto
Puedes corregir la columna Proyecto: **el código no cambia**, porque el cliente ya lo tiene. Si de verdad necesitas otro código, usa **Chiskey → Generar código de la fila seleccionada**: pide confirmación, conserva el número y cambia el nombre y las 4 letras finales. El código anterior deja de funcionar, así que tendrás que darle el nuevo al cliente.

### Entregar el código al cliente
- Envíale el código tal cual, por ejemplo `CK-008-el-hogar-7K4M`. Lo puede escribir con mayúsculas, minúsculas o espacios: la web lo entiende.
- O mejor, el **enlace directo**: `https://(tu dominio)/tupedido/?c=CK-008-el-hogar-7K4M`. Al abrirlo, la página busca el pedido sola y borra el código de la barra de direcciones.

### Revisar la hoja
**Chiskey → Revisar la hoja** te avisa de:
- filas publicadas a las que les falta Pedido, Estado, Inicio o Entrega;
- códigos repetidos (no debería pasar nunca);
- códigos con un formato incorrecto, por ejemplo si alguien los editó a mano.

---

## 3. Seguridad y mantenimiento

- **Protege la cuenta de la empresa:** si se pierde, se cae el seguimiento.
  - Activa la **verificación en dos pasos** en [myaccount.google.com/security](https://myaccount.google.com/security).
  - Como la usan dos personas, configura una **app autenticadora** (Google Authenticator, por ejemplo) **en los dos móviles**, escaneando el mismo código QR al activarla. O genera los **códigos de copia de seguridad** y guárdalos en un lugar seguro, como un gestor de contraseñas.
  - Pon un **correo de recuperación que no dependa de esa misma cuenta**, por ejemplo el personal de una de las dos personas.
  - Cuando alguien entra desde un dispositivo nuevo, Google puede pedir una verificación extra. Es normal: tengan el móvil a mano.
- **No pegues nunca el script con claves** ni datos reales en el repositorio, ni en chats o correos.
- **Si un código se filtra**, pon **Publicar** en **No** en esa fila. Si el cliente necesita seguir consultando, genera un código nuevo con el menú y envíaselo.
- **Freno de intentos:** si en 10 minutos hay 30 búsquedas fallidas, entre todos los visitantes, la consulta responde "Hay muchas consultas ahora mismo" durante el resto de esos 10 minutos, incluso con códigos correctos.
  - Es el precio de protegerse: alguien con mala intención podría bloquear la consulta unos minutos, pero **no ver pedidos ajenos**.
  - Las 4 letras finales tienen 923 521 combinaciones posibles, así que adivinar un código a ese ritmo llevaría meses.
  - El umbral se cambia en `UMBRAL_FALLOS`, al principio de `Code.gs`. Recuerda publicar una **nueva versión** después (apartado 7).
  - Cuando salta el freno queda anotado en **Ejecuciones** del editor de Apps Script, sin ningún código.
- **Cuotas de Google:** Apps Script tiene límites diarios gratuitos (miles de ejecuciones al día). Para este volumen sobran de largo.
- **La consulta antigua:** antes la web usaba otra hoja y otro script. Ábrelo y, en **Implementar → Administrar implementaciones**, **archiva** su implementación para que su URL deje de responder.

---

## 4. Lista de comprobación del despliegue real

Esto no se ha podido probar desde aquí: hay que hacerlo con la cuenta de la empresa.

- [ ] La pestaña **Pedidos** existe, con las 10 columnas en orden y la cabecera fija.
- [ ] Al editar a mano las columnas **Código** o **Creado** sale un aviso de protección.
- [ ] **Estado** y **Publicar** tienen desplegable; Inicio y Entrega se ven como dd/mm/yyyy.
- [ ] El menú **Chiskey** aparece al abrir la hoja.
- [ ] Al escribir un Proyecto en una fila nueva, aparece el código (`CK-001-…`), Creado se rellena y Publicar queda en "No".
- [ ] Con "oliv.ia" el código sale con `olivia`; con "El hogar", con `el-hogar`.
- [ ] Dos filas nuevas seguidas llevan números consecutivos (001, 002…). Si borras la última y creas otra, el número no se repite.
- [ ] Cambiar el Proyecto de una fila con código **no** cambia el código.
- [ ] **Generar código de la fila seleccionada** sobre una fila con código pide confirmación y conserva el número.
- [ ] **Revisar la hoja** avisa de una fila publicada sin Entrega.
- [ ] La URL `/exec` sin parámetros responde `{"ok":false,"error":"formato_invalido"}`.
- [ ] `URL_API` en `tupedido/pedido.js` tiene la URL `/exec`.
- [ ] En la web, un código de una fila con Publicar = **No** dice "No encontramos ese pedido".
- [ ] Con Publicar = **Sí**, la web muestra la comanda: Folio, Comensal (proyecto), Pedido (una fila por línea), Empezó, Entrega estimada, "Quedan N días" y la Nota si hay.
- [ ] Cambiar el Estado en la hoja se refleja en la web al volver a buscar.
- [ ] El mismo código con la última letra cambiada dice "No encontramos ese pedido".
- [ ] El enlace `…/tupedido/?c=CODIGO` busca solo y la barra queda en `/tupedido/`.
- [ ] Desde el móvil (con datos, no wifi) la consulta también funciona.
- [ ] La implementación antigua quedó archivada.
- [ ] Tras las pruebas: `DEMO_ACTIVO = false` en `tupedido/pedido.js`. Opcionalmente, borra `tupedido/pedido-demo.js`.
