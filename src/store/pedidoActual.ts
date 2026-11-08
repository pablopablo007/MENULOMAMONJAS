/** Estado del pedido que se está tomando (en memoria, con Zustand). */
import { create } from 'zustand';

import type { ItemEnCurso } from '../lib/pedidoEnCurso';

export interface ProductoParaPedido {
  id: number;
  nombre: string;
  precio: number;
}

interface EstadoPedidoActual {
  mesa: string;
  nota: string;
  items: ItemEnCurso[];
  fijarMesa(mesa: string): void;
  fijarNota(nota: string): void;
  /** Suma una unidad (o agrega el producto con cantidad 1). */
  agregar(producto: ProductoParaPedido): void;
  /** Resta una unidad; si llega a 0 se quita del pedido. */
  restar(productoId: number): void;
  quitar(productoId: number): void;
  /** Guarda la nota de un ítem; si el producto no estaba, lo agrega con cantidad 1. */
  fijarNotaItem(producto: ProductoParaPedido, nota: string): void;
  limpiar(): void;
}

export const usePedidoActual = create<EstadoPedidoActual>()((set) => ({
  mesa: '',
  nota: '',
  items: [],
  fijarMesa: (mesa) => set({ mesa }),
  fijarNota: (nota) => set({ nota }),
  agregar: (producto) =>
    set((estado) => {
      const existe = estado.items.some((i) => i.producto_id === producto.id);
      if (existe) {
        return {
          items: estado.items.map((i) =>
            i.producto_id === producto.id ? { ...i, cantidad: i.cantidad + 1 } : i,
          ),
        };
      }
      return {
        items: [
          ...estado.items,
          { producto_id: producto.id, nombre: producto.nombre, precio: producto.precio, cantidad: 1, nota: '' },
        ],
      };
    }),
  restar: (productoId) =>
    set((estado) => ({
      items: estado.items
        .map((i) => (i.producto_id === productoId ? { ...i, cantidad: i.cantidad - 1 } : i))
        .filter((i) => i.cantidad > 0),
    })),
  quitar: (productoId) =>
    set((estado) => ({ items: estado.items.filter((i) => i.producto_id !== productoId) })),
  fijarNotaItem: (producto, nota) =>
    set((estado) => {
      const existe = estado.items.some((i) => i.producto_id === producto.id);
      if (existe) {
        return {
          items: estado.items.map((i) => (i.producto_id === producto.id ? { ...i, nota } : i)),
        };
      }
      return {
        items: [
          ...estado.items,
          { producto_id: producto.id, nombre: producto.nombre, precio: producto.precio, cantidad: 1, nota },
        ],
      };
    }),
  limpiar: () => set({ mesa: '', nota: '', items: [] }),
}));
