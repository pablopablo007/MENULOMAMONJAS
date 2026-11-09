/**
 * Lado local de la sincronización con la nube: la cola `sync_pendientes`
 * (la llenan triggers, ver migración 2) y la lectura de las filas a subir.
 */
import type { DbEjecutor, ValorSQL } from './tipos';

/** Tablas que se copian a la nube, en orden de padres a hijos. */
export const TABLAS_NUBE = ['categorias', 'productos', 'pedidos', 'pedido_items'] as const;

export type TablaNube = (typeof TABLAS_NUBE)[number];

/** Columnas de cada tabla, iguales en SQLite y en Supabase (allá se agrega user_id). */
export const COLUMNAS: Record<TablaNube, string[]> = {
  categorias: ['id', 'nombre', 'orden', 'ejemplo'],
  productos: ['id', 'categoria_id', 'nombre', 'descripcion', 'precio', 'activo', 'created_at', 'ejemplo'],
  pedidos: ['id', 'numero', 'fecha', 'created_at', 'mesa', 'nota', 'total', 'estado'],
  pedido_items: ['id', 'pedido_id', 'producto_id', 'nombre_producto', 'precio_unitario', 'cantidad', 'nota', 'subtotal'],
};

export type FilaNube = Record<string, ValorSQL>;

export interface Pendiente {
  tabla: TablaNube;
  fila_id: number;
  /** 1 si el registro se borró en el celular. */
  borrado: 0 | 1;
  marca: number;
}

export async function contarPendientes(db: DbEjecutor): Promise<number> {
  const fila = await db.get<{ n: number }>('SELECT COUNT(*) AS n FROM sync_pendientes');
  return fila?.n ?? 0;
}

/** Los cambios más antiguos primero. */
export function leerPendientes(db: DbEjecutor, limite: number): Promise<Pendiente[]> {
  return db.all<Pendiente>('SELECT tabla, fila_id, borrado, marca FROM sync_pendientes ORDER BY marca LIMIT ?', [
    limite,
  ]);
}

/** Filas actuales de una tabla por id (las que ya no existen no aparecen). */
export function leerFilas(db: DbEjecutor, tabla: TablaNube, ids: number[]): Promise<FilaNube[]> {
  if (ids.length === 0) return Promise.resolve([]);
  return db.all<FilaNube>(
    `SELECT ${COLUMNAS[tabla].join(', ')} FROM ${tabla} WHERE id IN (${ids.map(() => '?').join(', ')}) ORDER BY id`,
    ids,
  );
}

/**
 * Quita de la cola los cambios ya subidos. Si un registro volvió a cambiar mientras
 * se subía, su marca es otra y se queda en la cola para la próxima vez.
 */
export async function quitarPendientes(db: DbEjecutor, subidos: Pendiente[]): Promise<void> {
  for (const p of subidos) {
    await db.run('DELETE FROM sync_pendientes WHERE tabla = ? AND fila_id = ? AND marca = ?', [
      p.tabla,
      p.fila_id,
      p.marca,
    ]);
  }
}

/** Pone en la cola todos los registros del celular (para subir todo de nuevo). */
export async function marcarTodoPendiente(db: DbEjecutor): Promise<void> {
  await db.run('DELETE FROM sync_pendientes');
  for (const tabla of TABLAS_NUBE) {
    await db.run(
      `INSERT INTO sync_pendientes (tabla, fila_id, borrado, marca)
       SELECT ?, id, 0, (SELECT COALESCE(MAX(marca), 0) FROM sync_pendientes) + ROW_NUMBER() OVER (ORDER BY id)
       FROM ${tabla}`,
      [tabla],
    );
  }
}

/** Vacía la cola (después de descargar de la nube, lo local ya es igual a lo de allá). */
export async function limpiarPendientes(db: DbEjecutor): Promise<void> {
  await db.run('DELETE FROM sync_pendientes');
}
