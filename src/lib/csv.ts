import type { PedidoConItems } from '../types';
import { formatoFechaNumerica, formatoHora } from './fechas';

/** Escapa un valor para CSV (comillas, comas y saltos de línea). */
export function celdaCsv(valor: string | number | null): string {
  if (valor === null) return '';
  const texto = typeof valor === 'number' ? String(valor) : valor;
  if (/[",\n\r]/.test(texto)) return `"${texto.replace(/"/g, '""')}"`;
  return texto;
}

export const ENCABEZADOS_CSV = [
  'Fecha',
  'Hora',
  'Pedido',
  'Mesa',
  'Productos',
  'Cantidad de productos',
  'Detalle',
  'Nota',
  'Total',
];

/**
 * CSV de ventas: una fila por pedido (solo pedidos activos; los anulados no son ventas).
 * Separador coma, decimales con punto y BOM UTF-8 para que Excel muestre bien las tildes.
 */
export function generarCsvVentas(pedidos: PedidoConItems[]): string {
  const filas = pedidos
    .filter((p) => p.estado === 'activo')
    .map((p) => {
      const unidades = p.items.reduce((suma, i) => suma + i.cantidad, 0);
      const detalle = p.items
        .map((i) => `${i.cantidad} x ${i.nombre_producto}${i.nota ? ` (${i.nota})` : ''}`)
        .join('; ');
      return [
        formatoFechaNumerica(p.fecha),
        formatoHora(p.created_at),
        p.numero,
        p.mesa,
        p.items.length,
        unidades,
        detalle,
        p.nota,
        p.total.toFixed(2),
      ]
        .map(celdaCsv)
        .join(',');
    });
  return '﻿' + [ENCABEZADOS_CSV.join(','), ...filas].join('\r\n') + '\r\n';
}
