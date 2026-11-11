/**
 * Cálculos puros de resúmenes. Reciben filas ya agrupadas por SQL
 * (GROUP BY fecha / producto) y las combinan; no tocan la base de datos.
 */
import type { ProductoVendido, ResumenPeriodo, TotalDia, TotalSemana } from '../types';
import { redondear } from './dinero';
import { finMes, inicioMes, inicioSemana, sumarDias } from './fechas';

/** Total vendido / número de pedidos. 0 si no hubo pedidos. */
export function ticketPromedio(total: number, pedidos: number): number {
  if (pedidos <= 0) return 0;
  return redondear(total / pedidos);
}

/** Suma las filas diarias de un período y calcula el ticket promedio. */
export function resumirPeriodo(dias: TotalDia[]): ResumenPeriodo {
  const total = redondear(dias.reduce((suma, d) => suma + d.total, 0));
  const pedidos = dias.reduce((suma, d) => suma + d.pedidos, 0);
  return { total, pedidos, ticketPromedio: ticketPromedio(total, pedidos) };
}

/** Día con más ventas. En empate gana el primero (más antiguo). null si no hubo ventas. */
export function mejorDia(dias: TotalDia[]): TotalDia | null {
  let mejor: TotalDia | null = null;
  for (const dia of dias) {
    if (dia.total <= 0) continue;
    if (mejor === null || dia.total > mejor.total) mejor = dia;
  }
  return mejor;
}

/**
 * Serie de 7 días (lunes a domingo) para el gráfico de la semana.
 * Los días sin ventas aparecen con total 0.
 */
export function serieSemanal(dias: TotalDia[], fechaDeLaSemana: string): TotalDia[] {
  const porFecha = new Map(dias.map((d) => [d.fecha, d]));
  const lunes = inicioSemana(fechaDeLaSemana);
  return Array.from({ length: 7 }, (_, i) => {
    const fecha = sumarDias(lunes, i);
    return porFecha.get(fecha) ?? { fecha, total: 0, pedidos: 0 };
  });
}

/**
 * Totales por semana (lunes a domingo) dentro de un mes.
 * Las semanas que empiezan o terminan en otro mes se recortan a los días del mes,
 * así la suma de las semanas es igual al total del mes.
 */
export function agruparPorSemana(dias: TotalDia[], fechaDelMes: string): TotalSemana[] {
  const primero = inicioMes(fechaDelMes);
  const ultimo = finMes(fechaDelMes);
  const semanas: TotalSemana[] = [];

  let desde = primero;
  while (desde <= ultimo) {
    const domingo = sumarDias(inicioSemana(desde), 6);
    const hasta = domingo < ultimo ? domingo : ultimo;
    semanas.push({ desde, hasta, total: 0, pedidos: 0 });
    desde = sumarDias(hasta, 1);
  }

  for (const dia of dias) {
    const semana = semanas.find((s) => dia.fecha >= s.desde && dia.fecha <= s.hasta);
    if (!semana) continue;
    semana.total = redondear(semana.total + dia.total);
    semana.pedidos += dia.pedidos;
  }
  return semanas;
}

/**
 * Escala "redonda" para el eje Y de un gráfico: 85 -> máximo 100 en 4 secciones de 25.
 * Siempre devuelve un máximo mayor que 0.
 */
export function escalaEje(maximo: number, secciones = 4): { maximo: number; paso: number } {
  if (!Number.isFinite(maximo) || maximo <= 0) return { maximo: secciones, paso: 1 };
  const pasoCrudo = maximo / secciones;
  const magnitud = 10 ** Math.floor(Math.log10(pasoCrudo));
  const opciones = [1, 2, 2.5, 5, 10];
  const factor = opciones.find((o) => o * magnitud >= pasoCrudo) ?? 10;
  const paso = factor * magnitud;
  return { maximo: paso * secciones, paso };
}

/**
 * Ordena los productos más vendidos: más cantidad primero, luego más dinero y luego por nombre.
 * Si llega el mismo producto en varias filas, las combina.
 */
export function ordenarMasVendidos(filas: ProductoVendido[], limite?: number): ProductoVendido[] {
  const combinados = new Map<number, ProductoVendido>();
  for (const fila of filas) {
    const previo = combinados.get(fila.producto_id);
    if (previo) {
      previo.cantidad += fila.cantidad;
      previo.total = redondear(previo.total + fila.total);
    } else {
      combinados.set(fila.producto_id, { ...fila, total: redondear(fila.total) });
    }
  }
  const ordenados = [...combinados.values()].sort(
    (a, b) => b.cantidad - a.cantidad || b.total - a.total || a.nombre.localeCompare(b.nombre, 'es'),
  );
  return limite === undefined ? ordenados : ordenados.slice(0, limite);
}
