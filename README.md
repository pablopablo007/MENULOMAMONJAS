# Pedidos Monjas

App móvil para que un mesero **tome pedidos** en el restaurante y vea **resúmenes de ventas**.

- Todo se guarda **en el celular** con SQLite: no hay servidor, ni base de datos en la nube, ni se necesita internet.
- Sin login, sin PIN, sin usuarios: se abre y se usa.
- Funciona en Android (prioridad) y en iOS.

Hecha con Expo SDK 58, React Native, TypeScript y Expo Router.

---

## Índice

1. [Qué hace la app](#qué-hace-la-app)
2. [Requisitos](#requisitos)
3. [Correr la app en tu computadora](#correr-la-app-en-tu-computadora)
4. [Probarla en el celular con Expo Go](#probarla-en-el-celular-con-expo-go)
5. [Generar el APK con EAS Build e instalarlo](#generar-el-apk-con-eas-build-e-instalarlo)
6. [Respaldos: cómo hacerlos y cómo restaurarlos](#respaldos-cómo-hacerlos-y-cómo-restaurarlos)
7. [Pruebas y verificación](#pruebas-y-verificación)
8. [Estructura del código](#estructura-del-código)
9. [Base de datos](#base-de-datos)
10. [Decisiones tomadas](#decisiones-tomadas)

---

## Qué hace la app

La app tiene tres pestañas abajo:

### Tomar pedido (pantalla inicial)
- Campo opcional **Mesa** (ej. `4`, `Terraza 2`) y un atajo **Para llevar**.
- **Buscador** (ignora tildes: "cafe" encuentra "Café pasado") y **chips de categorías** con scroll horizontal.
- Lista de productos con nombre, descripción, precio y botón **+**. Cuando el producto ya está en el pedido, el botón se convierte en **− cantidad +**.
- **Tocar el nombre** o **mantener presionado** un producto abre una hoja inferior para escribir una **nota** (ej. "sin cebolla"), con sugerencias rápidas.
- Barra fija abajo: **Ver pedido · N productos · $total**.
- En **Ver pedido**: ítems con cantidad, nota, subtotal y botón para quitar; nota general; total; y el botón **Generar pedido**.
- Al generar se guarda en el celular y se muestra el **comprobante** ("Pedido #12 · Mesa 4 · 18:45") con los botones **Nuevo pedido** y **Compartir** (envía el pedido en texto, por ejemplo por WhatsApp).
- No se puede generar un pedido vacío y el botón se desactiva mientras se guarda (no se duplican pedidos).
- Vibración corta al agregar productos y al generar el pedido.

### Resúmenes
- Selector **Día | Semana | Mes** y un **calendario** siempre visible arriba (en español, la semana empieza el lunes), con flechas de mes y botón **Hoy**. Debajo de cada número de día se ve el total vendido ($85). Los días sin ventas van en gris.
- **Día**: total del día, número de pedidos, ticket promedio; lista de pedidos por hora ("#3 · 13:20 · Mesa 4 · $18.50") que se expande para ver los ítems, compartir o **anular** (con confirmación); y "Lo más vendido del día".
- **Semana** (lunes a domingo, "3 – 9 nov 2026"): totales, gráfico de barras por día (tocar una barra abre ese día) y productos más vendidos.
- **Mes** (el mes del calendario): total, pedidos, ticket promedio, **mejor día**, totales por semana y productos más vendidos.
- Los pedidos **anulados no cuentan en ningún total**. En la lista del día aparecen tachados con la etiqueta "Anulado".

### Menú
- Productos agrupados por categoría con su precio y un interruptor **Disponible**. Los no disponibles no aparecen en "Tomar pedido".
- **Agregar producto**: nombre, categoría, precio (teclado numérico; debe ser mayor que 0) y descripción.
- **Editar** y **eliminar**. Si el producto ya tiene pedidos, eliminarlo solo lo desactiva (para no cambiar el historial).
- **Categorías**: crear, renombrar, cambiar el orden (flechas ↑ ↓) y eliminar las que estén vacías.
- **Borrar datos de ejemplo**: la primera vez la app trae 4 categorías y 12 productos de ejemplo para probar.
- **Respaldo**: exportar, exportar ventas a CSV y restaurar (ver más abajo).

---

## Requisitos

- **Node.js 22.13 o superior** (22 LTS o 24 LTS) y npm. Lo exige Expo SDK 58.
- Un celular Android o iPhone con **Expo Go** (para probar) — debe ser la versión que soporta **SDK 58**. Si Expo Go dice que el proyecto usa un SDK no compatible, actualiza Expo Go desde la tienda.
- Para generar el APK: una cuenta gratuita en [expo.dev](https://expo.dev).

---

## Correr la app en tu computadora

```bash
# 1. Instalar dependencias (solo la primera vez)
npm install

# 2. Iniciar el servidor de desarrollo
npx expo start
```

Se mostrará un **código QR** en la terminal.

> Si la computadora y el celular no están en la misma red Wi-Fi, usa `npx expo start --tunnel`.

---

## Probarla en el celular con Expo Go

1. Instala **Expo Go** desde Google Play (Android) o App Store (iPhone).
2. Ejecuta `npx expo start` en la computadora.
3. **Android**: abre Expo Go y toca **Scan QR code**, luego escanea el código de la terminal.
   **iPhone**: escanea el código con la **cámara** y toca el aviso para abrir en Expo Go.
4. La app abre en **Tomar pedido** con los productos de ejemplo.

Los datos que crees mientras pruebas con Expo Go se guardan dentro de Expo Go en ese celular.

---

## Generar el APK con EAS Build e instalarlo

El archivo `eas.json` ya tiene un perfil **`preview`** que genera un **APK** instalable directamente en Android (`"buildType": "apk"`).

```bash
# 1. Iniciar sesión en tu cuenta de Expo (la primera vez)
npx eas-cli@latest login

# 2. Vincular el proyecto con tu cuenta (la primera vez; acepta crear el proyecto)
npx eas-cli@latest init

# 3. Generar el APK en la nube de Expo
npx eas-cli@latest build -p android --profile preview
```

- La primera vez te preguntará si quieres generar una **keystore** (llave de firma): responde que **sí** y deja que Expo la guarde.
- El build tarda unos minutos. Al terminar, la terminal muestra un **enlace** y un **código QR** para descargar el APK (también aparece en expo.dev → tu proyecto → Builds).

**Instalar el APK en el celular Android:**

1. Abre el enlace (o escanea el QR) **desde el celular** y descarga el archivo `.apk`.
2. Ábrelo. Android pedirá permiso para **instalar apps de origen desconocido** para el navegador o el gestor de archivos: actívalo.
3. Toca **Instalar**. La app aparece como **Pedidos Monjas**.

> Si instalas una versión nueva del APK encima de la anterior (misma llave de firma), los datos se conservan. Si desinstalas la app, **los datos se borran**: haz un respaldo antes.

El perfil `production` genera un `.aab` para publicar en Google Play (`npx eas-cli@latest build -p android --profile production`).

---

## Respaldos: cómo hacerlos y cómo restaurarlos

Como los datos viven **solo en el celular**, si el celular se pierde, se daña o se desinstala la app, **se pierden los pedidos**. Por eso hay que hacer respaldos.

Ve a **Menú → Respaldo**. Ahí verás la fecha del último respaldo y un **aviso amarillo** si pasaron más de 7 días (o si nunca se hizo uno). El aviso también aparece en la tarjeta "Respaldo" de la pestaña Menú.

### Hacer un respaldo
1. Toca **Exportar respaldo**.
2. Se crea el archivo `respaldo-pedidos-AAAA-MM-DD.json` (ej. `respaldo-pedidos-2026-11-08.json`) con categorías, productos, pedidos e ítems.
3. Se abre el menú de compartir: elige **Google Drive**, **WhatsApp** (por ejemplo, enviártelo a ti mismo), correo o **Archivos**.

Recomendación: hazlo al cerrar cada día o, al menos, una vez por semana.

### Exportar ventas a Excel (CSV)
1. Elige un rango: **Hoy**, **Esta semana**, **Este mes**, **Mes anterior**, o toca **Desde / Hasta** para elegir fechas en el calendario.
2. Toca **Exportar CSV** y compártelo (Drive, correo, WhatsApp...).
3. Ábrelo con **Google Sheets** o **Excel**. Tiene una fila por pedido: Fecha, Hora, Pedido, Mesa, Productos, Cantidad de productos, Detalle, Nota y Total.

### Restaurar un respaldo
1. Pasa el archivo `.json` al celular (descárgalo de Drive, de WhatsApp, etc.).
2. Ve a **Menú → Respaldo → Restaurar respaldo** y elige el archivo.
3. La app **valida** el archivo. Si no es un respaldo válido, muestra el motivo y **no cambia nada**.
4. Si es válido, muestra una **confirmación** con lo que tiene el respaldo y lo que hay ahora en el celular. Al tocar **Reemplazar datos**, se **borran todos los datos actuales** y se cargan los del respaldo.

> La restauración **reemplaza** (no mezcla) los datos. Se hace en una sola transacción: si algo falla, los datos actuales quedan intactos. Si tienes dudas, exporta primero un respaldo de lo que hay en el celular.

**Pasar los datos a un celular nuevo:** exporta un respaldo en el celular viejo, instala la app en el nuevo y restaura ese archivo.

---

## Pruebas y verificación

```bash
npm test            # pruebas con Jest (jest-expo)
npx tsc --noEmit    # revisión de tipos de TypeScript
```

Las pruebas cubren:
- `src/lib`: formato de dinero y fechas, ticket promedio, mejor día, agrupación por semana, productos más vendidos, texto para compartir, CSV y validación de respaldos.
- `src/db`: migraciones y datos de ejemplo, numeración diaria de pedidos, transacción al guardar, **que los anulados queden fuera de todos los totales**, reglas del menú y exportar/restaurar respaldos. Usan **SQLite real en memoria** (sql.js) con las mismas consultas de la app.
- `__tests__/flujo.test.tsx`: prueba de la app completa con Expo Router (tomar un pedido, verlo en Resúmenes, anularlo y ocultar productos no disponibles).

---

## Estructura del código

```
app/                         Pantallas (Expo Router)
  _layout.tsx                Raíz: abre la base de datos y define la navegación
  index.tsx                  Redirige a "Tomar pedido"
  (tabs)/_layout.tsx         Pestañas inferiores
  (tabs)/tomar-pedido.tsx    Tomar pedido
  (tabs)/resumenes.tsx       Resúmenes
  (tabs)/menu.tsx            Menú
  menu/producto.tsx          Formulario agregar/editar producto
  menu/categorias.tsx        Gestión de categorías
  menu/respaldo.tsx          Respaldo (exportar, CSV, restaurar)
src/
  db/                        Acceso a datos (nunca hay SQL en las pantallas)
    conexion.ts              Abre SQLite y aplica migraciones
    migraciones.ts           Tabla schema_version y migraciones
    seed.ts                  Datos de ejemplo
    productosRepo.ts         Categorías y productos
    pedidosRepo.ts           Guardar, listar y anular pedidos
    resumenRepo.ts           Totales con SQL agrupado
    respaldoRepo.ts          Exportar / restaurar
    ajustesRepo.ts           Fecha del último respaldo
    DbContext.tsx            Proveedor de la base de datos para React
    expoDb.ts / tipos.ts     Adaptador de expo-sqlite a la interfaz Db
    pruebas/dbPrueba.ts      Base de datos en memoria para las pruebas
  lib/                       Funciones puras (dinero, fechas, resúmenes, CSV, respaldo)
  components/                Calendario, PedidoSheet, Comprobante, TarjetaResumen, GraficoBarras, etc.
  store/pedidoActual.ts      Pedido en curso (Zustand)
  servicios/                 Archivos (compartir / elegir) y vibración
  hooks/useAlEnfocar.ts      Recarga datos al volver a una pestaña
  theme.ts                   Colores, espacios y tamaños de letra
  types.ts                   Tipos de dominio
```

---

## Base de datos

Archivo SQLite `pedidos.db` dentro de la app. Tablas:

| Tabla | Columnas |
|---|---|
| `categorias` | id, nombre, orden, ejemplo |
| `productos` | id, categoria_id, nombre, descripcion, precio (REAL), activo (1/0), created_at, ejemplo |
| `pedidos` | id, numero (se reinicia cada día), fecha ('yyyy-MM-dd' local), created_at (ISO), mesa, nota, total, estado ('activo' / 'anulado') |
| `pedido_items` | id, pedido_id, producto_id, nombre_producto, precio_unitario, cantidad, nota, subtotal |
| `ajustes` | clave, valor (guarda la fecha del último respaldo) |
| `schema_version` | versión actual del esquema |

- Índices en `pedidos.fecha`, `pedido_items.pedido_id`, `pedido_items.producto_id` y `productos.categoria_id`, y un índice único `(fecha, numero)` para que nunca se repita un número de pedido en el mismo día.
- `pedido_items` guarda una **copia del nombre y del precio**: si luego cambias un precio, los pedidos viejos no cambian.
- Guardar un pedido (calcular el número del día + insertar pedido + insertar ítems) ocurre en **una sola transacción**.

**Agregar una migración:** en `src/db/migraciones.ts`, agrega un objeto `{ version: 2, descripcion, aplicar }` al final de `MIGRACIONES`. Se ejecuta automáticamente la próxima vez que se abra la app.

---

## Decisiones tomadas

Cosas que no estaban del todo definidas y cómo se resolvieron:

1. **Nombre de la app**: "Pedidos Monjas" (paquete Android `com.menulomamonjas.pedidos`). Se cambia en `app.json`.
2. **Columna extra `ejemplo`** en `categorias` y `productos`, para poder "Borrar datos de ejemplo" sin tocar los productos propios. Si editas un producto o categoría de ejemplo, pasa a ser tuyo y ya no se borra con esa opción. Los productos de ejemplo que ya tienen pedidos se desactivan en vez de borrarse.
3. **Tabla extra `ajustes`** para guardar la fecha del último respaldo.
4. **Nota por ítem**: aplica a todas las unidades de ese producto en el pedido. Si se necesita "1 sin cebolla y 1 normal", se escribe así en la nota.
5. **Calendario**: tocar un día siempre abre el modo **Día** (como pide la especificación). Para ver una semana, se elige un día y luego **Semana**; en el modo Mes, tocar una semana abre esa semana.
6. **Más vendidos**: en el modo Día se muestran todos; en Semana y Mes, los 10 primeros. Se ordenan por cantidad y, en empate, por monto. Se muestra el nombre actual del producto.
7. **Total del mes por semanas**: las semanas son de lunes a domingo y se recortan a los días del mes (ej. "1 nov", "2 – 8 nov", …), así la suma de las semanas da el total del mes.
8. **CSV**: una fila por pedido, solo pedidos **activos** (los anulados no son ventas). Separador coma, decimales con punto y codificación UTF-8 con BOM para que Excel muestre bien las tildes. Si tu Excel en español muestra todo en una sola columna, ábrelo con Google Sheets o usa Datos → Texto en columnas → separador "coma".
9. **Anular** no se puede deshacer (se pide confirmación).
10. **Último respaldo**: se registra cuando se cierra el menú de compartir del archivo de respaldo (la app no puede saber si realmente lo guardaste en Drive, por eso conviene revisarlo). Restaurar un respaldo no cambia esa fecha.
11. **Restaurar** acepta cualquier tipo de archivo en el selector (Android a veces no reconoce los `.json` que llegan por WhatsApp o Drive) y luego valida el contenido.
12. **Fechas**: `pedidos.fecha` es la fecha local del celular al momento del pedido (hora de Ecuador si el celular está en esa zona); `created_at` se guarda en ISO/UTC y se muestra en hora local.
13. **Eliminar categorías**: solo si están vacías (la especificación pedía crear, renombrar y ordenar; eliminar vacías se agregó por comodidad).
14. **Transacciones**: se usa `withExclusiveTransactionAsync` de expo-sqlite (no disponible en web; la app es solo para Android e iOS).
15. **Pruebas de base de datos**: usan `sql.js` (SQLite en WebAssembly) detrás de la misma interfaz `Db` que usa la app con expo-sqlite, para probar las consultas SQL reales sin un celular.
