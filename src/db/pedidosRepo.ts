/** Acceso a datos de pedidos. */
import type { NuevoPedido, Pedido, PedidoConItems, PedidoItem } from '../types';
import { redondear } from '../lib/dinero';
import { aFechaISO } from '../lib/fechas';
import type { Db, DbEjecutor } from './tipos';

const COLUMNAS_PEDIDO = 'id, numero, fecha, created_at, mesa, nota, total, estado';
const COLUMNAS_ITEM =
  'id, pedido_id, producto_id, nombre_producto, precio_unitario, cantidad, nota, subtotal';

/**
 * Guarda un pedido nuevo dentro de UNA transacción: calcula el número del día,
 * inserta el pedido y todos sus ítems. Si algo falla, no se guarda nada.
 */
export async function guardarPedido(
  db: Db,
  nuevo: NuevoPedido,
  ahora: Date = new Date(),
): Promise<PedidoConItems> {
  const items = nuevo.items.filter((i) => i.cantidad > 0);
  if (items.length === 0) throw new Error('No se puede generar un pedido vacío.');
  for (const item of items) {
    if (!Number.isInteger(item.cantidad)) throw new Error('Las cantidades deben ser números enteros.');
  }

  const fecha = aFechaISO(ahora);
  const creado = ahora.toISOString();
  const conSubtotal = items.map((item) => ({
    ...item,
    subtotal: redondear(item.precio_unitario * item.cantidad),
  }));
  const total = redondear(conSubtotal.reduce((suma, i) => suma + i.subtotal, 0));

  return db.transaction(async (tx) => {
    const fila = await tx.get<{ siguiente: number }>(
      'SELECT COALESCE(MAX(numero), 0) + 1 AS siguiente FROM pedidos WHERE fecha = ?',
      [fecha],
    );
    const numero = fila?.siguiente ?? 1;
    const { lastInsertRowId: pedidoId } = await tx.run(
      `INSERT INTO pedidos (numero, fecha, created_at, mesa, nota, total, estado)
       VALUES (?, ?, ?, ?, ?, ?, 'activo')`,
      [numero, fecha, creado, nuevo.mesa, nuevo.nota, total],
    );

    const guardados: PedidoItem[] = [];
    for (const item of conSubtotal) {
      const { lastInsertRowId } = await tx.run(
        `INSERT INTO pedido_items
           (pedido_id, producto_id, nombre_producto, precio_unitario, cantidad, nota, subtotal)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          pedidoId,
          item.producto_id,
          item.nombre_producto,
          item.precio_unitario,
          item.cantidad,
          item.nota,
          item.subtotal,
        ],
      );
      guardados.push({
        id: lastInsertRowId,
        pedido_id: pedidoId,
        producto_id: item.producto_id,
        nombre_producto: item.nombre_producto,
        precio_unitario: item.precio_unitario,
        cantidad: item.cantidad,
        nota: item.nota,
        subtotal: item.subtotal,
      });
    }

    return {
      id: pedidoId,
      numero,
      fecha,
      created_at: creado,
      mesa: nuevo.mesa,
      nota: nuevo.nota,
      total,
      estado: 'activo',
      items: guardados,
    };
  });
}

async function adjuntarItems(
  db: DbEjecutor,
  pedidos: Pedido[],
  desde: string,
  hasta: string,
): Promise<PedidoConItems[]> {
  if (pedidos.length === 0) return [];
  const items = await db.all<PedidoItem>(
    `SELECT ${COLUMNAS_ITEM.split(', ').map((c) => `i.${c}`).join(', ')}
     FROM pedido_items i
     JOIN pedidos p ON p.id = i.pedido_id
     WHERE p.fecha BETWEEN ? AND ?
     ORDER BY i.id`,
    [desde, hasta],
  );
  const porPedido = new Map<number, PedidoItem[]>();
  for (const item of items) {
    const lista = porPedido.get(item.pedido_id) ?? [];
    lista.push(item);
    porPedido.set(item.pedido_id, lista);
  }
  return pedidos.map((p) => ({ ...p, items: porPedido.get(p.id) ?? [] }));
}

/** Pedidos (activos y anulados) de un rango de fechas, con sus ítems, ordenados por hora. */
export async function listarPedidosRango(
  db: DbEjecutor,
  desde: string,
  hasta: string,
): Promise<PedidoConItems[]> {
  const pedidos = await db.all<Pedido>(
    `SELECT ${COLUMNAS_PEDIDO} FROM pedidos
     WHERE fecha BETWEEN ? AND ?
     ORDER BY fecha, created_at, numero`,
    [desde, hasta],
  );
  return adjuntarItems(db, pedidos, desde, hasta);
}

export function listarPedidosDelDia(db: DbEjecutor, fecha: string): Promise<PedidoConItems[]> {
  return listarPedidosRango(db, fecha, fecha);
}

export async function obtenerPedido(db: DbEjecutor, id: number): Promise<PedidoConItems | null> {
  const pedido = await db.get<Pedido>(`SELECT ${COLUMNAS_PEDIDO} FROM pedidos WHERE id = ?`, [id]);
  if (!pedido) return null;
  const items = await db.all<PedidoItem>(
    `SELECT ${COLUMNAS_ITEM} FROM pedido_items WHERE pedido_id = ? ORDER BY id`,
    [id],
  );
  return { ...pedido, items };
}

/** Marca un pedido como anulado. Ya no cuenta en ningún total. */
export async function anularPedido(db: DbEjecutor, id: number): Promise<void> {
  await db.run("UPDATE pedidos SET estado = 'anulado' WHERE id = ?", [id]);
}
