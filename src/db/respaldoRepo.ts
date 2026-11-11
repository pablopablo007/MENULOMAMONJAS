/** Exportar e importar todos los datos (respaldo JSON). */
import type { Categoria, Pedido, PedidoItem, Producto, Respaldo } from '../types';
import { FORMATO_RESPALDO, VERSION_RESPALDO } from '../lib/respaldo';
import type { Db, DbEjecutor } from './tipos';

export async function exportarRespaldo(db: Db, ahora: Date = new Date()): Promise<Respaldo> {
  // Se lee todo dentro de una transacción para obtener una foto consistente.
  return db.transaction(async (tx) => ({
    formato: FORMATO_RESPALDO,
    version: VERSION_RESPALDO,
    exportado_en: ahora.toISOString(),
    categorias: await tx.all<Categoria>('SELECT id, nombre, orden, ejemplo FROM categorias ORDER BY id'),
    productos: await tx.all<Producto>(
      `SELECT id, categoria_id, nombre, descripcion, precio, activo, created_at, ejemplo
       FROM productos ORDER BY id`,
    ),
    pedidos: await tx.all<Pedido>(
      'SELECT id, numero, fecha, created_at, mesa, nota, total, estado FROM pedidos ORDER BY id',
    ),
    pedido_items: await tx.all<PedidoItem>(
      `SELECT id, pedido_id, producto_id, nombre_producto, precio_unitario, cantidad, nota, subtotal
       FROM pedido_items ORDER BY id`,
    ),
  }));
}

export interface ConteoDatos {
  categorias: number;
  productos: number;
  pedidos: number;
}

export async function contarDatos(db: DbEjecutor): Promise<ConteoDatos> {
  const fila = await db.get<ConteoDatos>(
    `SELECT (SELECT COUNT(*) FROM categorias) AS categorias,
            (SELECT COUNT(*) FROM productos) AS productos,
            (SELECT COUNT(*) FROM pedidos) AS pedidos`,
  );
  return fila ?? { categorias: 0, productos: 0, pedidos: 0 };
}

/**
 * Reemplaza TODOS los datos (categorías, productos, pedidos e ítems) por los del respaldo.
 * Se hace en una sola transacción: si algo falla, los datos actuales quedan intactos.
 * El respaldo debe venir validado con `validarRespaldo`.
 */
export async function restaurarRespaldo(db: Db, respaldo: Respaldo): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.run('DELETE FROM pedido_items');
    await tx.run('DELETE FROM pedidos');
    await tx.run('DELETE FROM productos');
    await tx.run('DELETE FROM categorias');

    for (const c of respaldo.categorias) {
      await tx.run('INSERT INTO categorias (id, nombre, orden, ejemplo) VALUES (?, ?, ?, ?)', [
        c.id,
        c.nombre,
        c.orden,
        c.ejemplo,
      ]);
    }
    for (const p of respaldo.productos) {
      await tx.run(
        `INSERT INTO productos (id, categoria_id, nombre, descripcion, precio, activo, created_at, ejemplo)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [p.id, p.categoria_id, p.nombre, p.descripcion, p.precio, p.activo, p.created_at, p.ejemplo],
      );
    }
    for (const p of respaldo.pedidos) {
      await tx.run(
        `INSERT INTO pedidos (id, numero, fecha, created_at, mesa, nota, total, estado)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [p.id, p.numero, p.fecha, p.created_at, p.mesa, p.nota, p.total, p.estado],
      );
    }
    for (const i of respaldo.pedido_items) {
      await tx.run(
        `INSERT INTO pedido_items
           (id, pedido_id, producto_id, nombre_producto, precio_unitario, cantidad, nota, subtotal)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [i.id, i.pedido_id, i.producto_id, i.nombre_producto, i.precio_unitario, i.cantidad, i.nota, i.subtotal],
      );
    }
  });
}
