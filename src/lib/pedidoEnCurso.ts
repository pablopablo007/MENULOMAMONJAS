/** Cálculos puros sobre el pedido que el mesero está armando. */
import type { NuevoPedido } from '../types';
import { redondear } from './dinero';
import { textoONulo } from './texto';

export interface ItemEnCurso {
  producto_id: number;
  nombre: string;
  precio: number;
  cantidad: number;
  nota: string;
}

export function subtotalItem(item: Pick<ItemEnCurso, 'precio' | 'cantidad'>): number {
  return redondear(item.precio * item.cantidad);
}

export function totalPedido(items: ItemEnCurso[]): number {
  return redondear(items.reduce((suma, item) => suma + subtotalItem(item), 0));
}

/** Número total de unidades (2 colas + 1 seco = 3 productos). */
export function cantidadProductos(items: ItemEnCurso[]): number {
  return items.reduce((suma, item) => suma + item.cantidad, 0);
}

/** Convierte el pedido en curso al formato que guarda el repositorio. */
export function aNuevoPedido(mesa: string, nota: string, items: ItemEnCurso[]): NuevoPedido {
  return {
    mesa: textoONulo(mesa),
    nota: textoONulo(nota),
    items: items
      .filter((item) => item.cantidad > 0)
      .map((item) => ({
        producto_id: item.producto_id,
        nombre_producto: item.nombre,
        precio_unitario: item.precio,
        cantidad: item.cantidad,
        nota: textoONulo(item.nota),
      })),
  };
}
