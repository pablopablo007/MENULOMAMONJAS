import type { Pedido, PedidoConItems } from '../types';
import { formatoDinero } from './dinero';
import { formatoFechaNumerica, formatoHora } from './fechas';

/** Texto que identifica a la mesa: "Mesa 4", "Terraza 2", "Para llevar". */
export function etiquetaMesa(mesa: string | null): string | null {
  if (!mesa) return null;
  return /^\d+$/.test(mesa.trim()) ? `Mesa ${mesa.trim()}` : mesa.trim();
}

/** "Pedido #12 · Mesa 4 · 18:45" */
export function tituloPedido(pedido: Pick<Pedido, 'numero' | 'mesa' | 'created_at'>): string {
  const partes = [`Pedido #${pedido.numero}`];
  const mesa = etiquetaMesa(pedido.mesa);
  if (mesa) partes.push(mesa);
  partes.push(formatoHora(pedido.created_at));
  return partes.join(' · ');
}

/** Pedido en texto plano para compartir por WhatsApp. */
export function textoPedido(pedido: PedidoConItems): string {
  const lineas: string[] = [];
  lineas.push(`*${tituloPedido(pedido)}*`);
  lineas.push(formatoFechaNumerica(pedido.fecha));
  if (pedido.estado === 'anulado') lineas.push('ANULADO');
  lineas.push('');
  for (const item of pedido.items) {
    lineas.push(`${item.cantidad} × ${item.nombre_producto} — ${formatoDinero(item.subtotal)}`);
    if (item.nota) lineas.push(`   Nota: ${item.nota}`);
  }
  if (pedido.nota) {
    lineas.push('');
    lineas.push(`Nota: ${pedido.nota}`);
  }
  lineas.push('');
  lineas.push(`*Total: ${formatoDinero(pedido.total)}*`);
  return lineas.join('\n');
}
