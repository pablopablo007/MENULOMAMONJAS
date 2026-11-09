/**
 * Consultas de resúmenes. Todo se calcula con SQL agrupado (SUM, COUNT, GROUP BY)
 * sobre el rango de fechas pedido; nunca se cargan todos los pedidos en memoria.
 * Los pedidos anulados NO cuentan en ningún total.
 */
import type { ProductoVendido, ResumenPeriodo, TotalDia, TotalMes } from '../types';
import { ticketPromedio } from '../lib/resumen';
import type { DbEjecutor } from './tipos';

/** Total vendido y número de pedidos por día dentro del rango (solo días con ventas). */
export function totalesPorDia(db: DbEjecutor, desde: string, hasta: string): Promise<TotalDia[]> {
  return db.all<TotalDia>(
    `SELECT fecha, ROUND(SUM(total), 2) AS total, COUNT(*) AS pedidos
     FROM pedidos
     WHERE estado = 'activo' AND fecha BETWEEN ? AND ?
     GROUP BY fecha
     ORDER BY fecha`,
    [desde, hasta],
  );
}

/** Total vendido y número de pedidos por mes dentro del rango (solo meses con ventas). */
export function totalesPorMes(db: DbEjecutor, desde: string, hasta: string): Promise<TotalMes[]> {
  return db.all<TotalMes>(
    `SELECT substr(fecha, 1, 7) || '-01' AS mes, ROUND(SUM(total), 2) AS total, COUNT(*) AS pedidos
     FROM pedidos
     WHERE estado = 'activo' AND fecha BETWEEN ? AND ?
     GROUP BY mes
     ORDER BY mes`,
    [desde, hasta],
  );
}

/** Total, número de pedidos y ticket promedio de un rango. */
export async function resumenRango(db: DbEjecutor, desde: string, hasta: string): Promise<ResumenPeriodo> {
  const fila = await db.get<{ total: number; pedidos: number }>(
    `SELECT COALESCE(ROUND(SUM(total), 2), 0) AS total, COUNT(*) AS pedidos
     FROM pedidos
     WHERE estado = 'activo' AND fecha BETWEEN ? AND ?`,
    [desde, hasta],
  );
  const total = fila?.total ?? 0;
  const pedidos = fila?.pedidos ?? 0;
  return { total, pedidos, ticketPromedio: ticketPromedio(total, pedidos) };
}

/**
 * Productos vendidos en el rango, de mayor a menor cantidad.
 * Se agrupa por producto y se muestra el nombre actual del producto.
 */
export function productosMasVendidos(
  db: DbEjecutor,
  desde: string,
  hasta: string,
  limite = -1,
): Promise<ProductoVendido[]> {
  return db.all<ProductoVendido>(
    `SELECT i.producto_id AS producto_id,
            COALESCE(MAX(pr.nombre), MAX(i.nombre_producto)) AS nombre,
            SUM(i.cantidad) AS cantidad,
            ROUND(SUM(i.subtotal), 2) AS total
     FROM pedido_items i
     JOIN pedidos p ON p.id = i.pedido_id
     LEFT JOIN productos pr ON pr.id = i.producto_id
     WHERE p.estado = 'activo' AND p.fecha BETWEEN ? AND ?
     GROUP BY i.producto_id
     ORDER BY cantidad DESC, total DESC, nombre
     LIMIT ?`,
    [desde, hasta, limite],
  );
}
