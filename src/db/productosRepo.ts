/** Acceso a datos del menú: categorías y productos. */
import type { Categoria, DatosProducto, Producto, ProductoConCategoria } from '../types';
import { redondear } from '../lib/dinero';
import type { Db, DbEjecutor } from './tipos';

// ---------- Categorías ----------

export function listarCategorias(db: DbEjecutor): Promise<Categoria[]> {
  return db.all<Categoria>('SELECT id, nombre, orden, ejemplo FROM categorias ORDER BY orden, id');
}

export interface CategoriaConConteo extends Categoria {
  productos: number;
}

export function listarCategoriasConConteo(db: DbEjecutor): Promise<CategoriaConConteo[]> {
  return db.all<CategoriaConConteo>(
    `SELECT c.id, c.nombre, c.orden, c.ejemplo,
            (SELECT COUNT(*) FROM productos p WHERE p.categoria_id = c.id) AS productos
     FROM categorias c
     ORDER BY c.orden, c.id`,
  );
}

export async function crearCategoria(db: DbEjecutor, nombre: string): Promise<number> {
  const limpio = nombre.trim();
  if (!limpio) throw new Error('Escribe un nombre para la categoría.');
  const fila = await db.get<{ siguiente: number }>(
    'SELECT COALESCE(MAX(orden), 0) + 1 AS siguiente FROM categorias',
  );
  const { lastInsertRowId } = await db.run(
    'INSERT INTO categorias (nombre, orden, ejemplo) VALUES (?, ?, 0)',
    [limpio, fila?.siguiente ?? 1],
  );
  return lastInsertRowId;
}

export async function renombrarCategoria(db: DbEjecutor, id: number, nombre: string): Promise<void> {
  const limpio = nombre.trim();
  if (!limpio) throw new Error('Escribe un nombre para la categoría.');
  await db.run('UPDATE categorias SET nombre = ?, ejemplo = 0 WHERE id = ?', [limpio, id]);
}

/** Sube (-1) o baja (+1) una categoría una posición. */
export async function moverCategoria(db: Db, id: number, direccion: -1 | 1): Promise<void> {
  await db.transaction(async (tx) => {
    const categorias = await listarCategorias(tx);
    const indice = categorias.findIndex((c) => c.id === id);
    const destino = indice + direccion;
    if (indice < 0 || destino < 0 || destino >= categorias.length) return;
    const ordenadas = [...categorias];
    [ordenadas[indice], ordenadas[destino]] = [ordenadas[destino], ordenadas[indice]];
    for (const [posicion, categoria] of ordenadas.entries()) {
      await tx.run('UPDATE categorias SET orden = ? WHERE id = ?', [posicion + 1, categoria.id]);
    }
  });
}

export async function contarProductosDeCategoria(db: DbEjecutor, id: number): Promise<number> {
  const fila = await db.get<{ n: number }>(
    'SELECT COUNT(*) AS n FROM productos WHERE categoria_id = ?',
    [id],
  );
  return fila?.n ?? 0;
}

/** Elimina una categoría vacía. Si tiene productos, lanza un error. */
export async function eliminarCategoria(db: DbEjecutor, id: number): Promise<void> {
  const productos = await contarProductosDeCategoria(db, id);
  if (productos > 0) {
    throw new Error('Esta categoría tiene productos. Muévelos a otra categoría antes de eliminarla.');
  }
  await db.run('DELETE FROM categorias WHERE id = ?', [id]);
}

// ---------- Productos ----------

const SELECT_PRODUCTOS = `
  SELECT p.id, p.categoria_id, p.nombre, p.descripcion, p.precio, p.activo, p.created_at, p.ejemplo,
         c.nombre AS categoria_nombre, c.orden AS categoria_orden
  FROM productos p
  JOIN categorias c ON c.id = p.categoria_id`;

export function listarProductos(
  db: DbEjecutor,
  opciones: { soloDisponibles?: boolean } = {},
): Promise<ProductoConCategoria[]> {
  const filtro = opciones.soloDisponibles ? 'WHERE p.activo = 1' : '';
  return db.all<ProductoConCategoria>(
    `${SELECT_PRODUCTOS} ${filtro} ORDER BY c.orden, c.id, p.nombre COLLATE NOCASE`,
  );
}

export function obtenerProducto(db: DbEjecutor, id: number): Promise<Producto | null> {
  return db.get<Producto>(
    `SELECT id, categoria_id, nombre, descripcion, precio, activo, created_at, ejemplo
     FROM productos WHERE id = ?`,
    [id],
  );
}

function validarProducto(datos: DatosProducto): DatosProducto {
  const nombre = datos.nombre.trim();
  if (!nombre) throw new Error('Escribe el nombre del producto.');
  if (!Number.isFinite(datos.precio) || datos.precio <= 0) {
    throw new Error('El precio debe ser mayor que 0.');
  }
  const descripcion = datos.descripcion?.trim() || null;
  return { ...datos, nombre, descripcion, precio: redondear(datos.precio) };
}

export async function crearProducto(
  db: DbEjecutor,
  datos: DatosProducto,
  ahora: Date = new Date(),
): Promise<number> {
  const p = validarProducto(datos);
  const { lastInsertRowId } = await db.run(
    `INSERT INTO productos (categoria_id, nombre, descripcion, precio, activo, created_at, ejemplo)
     VALUES (?, ?, ?, ?, 1, ?, 0)`,
    [p.categoria_id, p.nombre, p.descripcion, p.precio, ahora.toISOString()],
  );
  return lastInsertRowId;
}

/** Al editar un producto de ejemplo, deja de considerarse "de ejemplo" (ya es del restaurante). */
export async function actualizarProducto(db: DbEjecutor, id: number, datos: DatosProducto): Promise<void> {
  const p = validarProducto(datos);
  await db.run(
    `UPDATE productos SET categoria_id = ?, nombre = ?, descripcion = ?, precio = ?, ejemplo = 0
     WHERE id = ?`,
    [p.categoria_id, p.nombre, p.descripcion, p.precio, id],
  );
}

export async function cambiarDisponibilidad(db: DbEjecutor, id: number, disponible: boolean): Promise<void> {
  await db.run('UPDATE productos SET activo = ? WHERE id = ?', [disponible ? 1 : 0, id]);
}

export async function contarPedidosDeProducto(db: DbEjecutor, id: number): Promise<number> {
  const fila = await db.get<{ n: number }>(
    'SELECT COUNT(*) AS n FROM pedido_items WHERE producto_id = ?',
    [id],
  );
  return fila?.n ?? 0;
}

/**
 * Elimina un producto. Si ya aparece en algún pedido no se borra (para no romper el historial):
 * solo se marca como no disponible.
 */
export async function eliminarProducto(db: Db, id: number): Promise<'eliminado' | 'desactivado'> {
  return db.transaction(async (tx) => {
    if ((await contarPedidosDeProducto(tx, id)) > 0) {
      await tx.run('UPDATE productos SET activo = 0 WHERE id = ?', [id]);
      return 'desactivado';
    }
    await tx.run('DELETE FROM productos WHERE id = ?', [id]);
    return 'eliminado';
  });
}

// ---------- Datos de ejemplo ----------

export async function hayDatosEjemplo(db: DbEjecutor): Promise<boolean> {
  const fila = await db.get<{ n: number }>(
    `SELECT (SELECT COUNT(*) FROM productos WHERE ejemplo = 1)
          + (SELECT COUNT(*) FROM categorias WHERE ejemplo = 1) AS n`,
  );
  return (fila?.n ?? 0) > 0;
}

export interface ResultadoBorrarEjemplo {
  eliminados: number;
  desactivados: number;
}

/**
 * Borra los productos y categorías de ejemplo. Los productos de ejemplo que ya se usaron
 * en pedidos se desactivan en vez de borrarse; las categorías solo se borran si quedan vacías.
 */
export async function borrarDatosEjemplo(db: Db): Promise<ResultadoBorrarEjemplo> {
  return db.transaction(async (tx) => {
    const usados = await tx.run(
      `UPDATE productos SET activo = 0, ejemplo = 0
       WHERE ejemplo = 1 AND id IN (SELECT DISTINCT producto_id FROM pedido_items)`,
    );
    const borrados = await tx.run('DELETE FROM productos WHERE ejemplo = 1');
    await tx.run(
      `DELETE FROM categorias
       WHERE ejemplo = 1 AND id NOT IN (SELECT DISTINCT categoria_id FROM productos)`,
    );
    await tx.run('UPDATE categorias SET ejemplo = 0 WHERE ejemplo = 1');
    return { eliminados: borrados.changes, desactivados: usados.changes };
  });
}
