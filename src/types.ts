/**
 * Tipos de dominio. Los nombres de los campos coinciden con las columnas de SQLite
 * para que el respaldo JSON sea una copia fiel de las tablas.
 */

export type Bandera = 0 | 1;

export interface Categoria {
  id: number;
  nombre: string;
  orden: number;
  /** 1 si viene de los datos de ejemplo. */
  ejemplo: Bandera;
}

export interface Producto {
  id: number;
  categoria_id: number;
  nombre: string;
  descripcion: string | null;
  /** Precio final en USD (no se calcula IVA aparte). */
  precio: number;
  /** 1 = disponible en "Tomar pedido". */
  activo: Bandera;
  created_at: string;
  /** 1 si viene de los datos de ejemplo y no se ha editado. */
  ejemplo: Bandera;
}

export interface ProductoConCategoria extends Producto {
  categoria_nombre: string;
  categoria_orden: number;
}

export type EstadoPedido = 'activo' | 'anulado';

export interface Pedido {
  id: number;
  /** Consecutivo del día: 1, 2, 3... se reinicia cada día. */
  numero: number;
  /** 'yyyy-MM-dd' en hora local del celular. */
  fecha: string;
  /** Fecha y hora ISO (UTC) del momento en que se generó. */
  created_at: string;
  mesa: string | null;
  nota: string | null;
  total: number;
  estado: EstadoPedido;
}

export interface PedidoItem {
  id: number;
  pedido_id: number;
  producto_id: number;
  /** Copia del nombre al momento del pedido. */
  nombre_producto: string;
  /** Copia del precio al momento del pedido. */
  precio_unitario: number;
  cantidad: number;
  nota: string | null;
  subtotal: number;
}

export interface PedidoConItems extends Pedido {
  items: PedidoItem[];
}

/** Ítem que se envía al guardar un pedido nuevo. */
export interface NuevoItem {
  producto_id: number;
  nombre_producto: string;
  precio_unitario: number;
  cantidad: number;
  nota: string | null;
}

export interface NuevoPedido {
  mesa: string | null;
  nota: string | null;
  items: NuevoItem[];
}

export interface DatosProducto {
  categoria_id: number;
  nombre: string;
  descripcion: string | null;
  precio: number;
}

/** Fila agrupada por fecha (resultado de GROUP BY fecha). */
export interface TotalDia {
  fecha: string;
  total: number;
  pedidos: number;
}

export interface ResumenPeriodo {
  total: number;
  pedidos: number;
  ticketPromedio: number;
}

export interface ProductoVendido {
  producto_id: number;
  nombre: string;
  cantidad: number;
  total: number;
}

export interface TotalSemana {
  /** Primer día de la semana dentro del mes ('yyyy-MM-dd'). */
  desde: string;
  /** Último día de la semana dentro del mes ('yyyy-MM-dd'). */
  hasta: string;
  total: number;
  pedidos: number;
}

export interface Respaldo {
  formato: 'pedidos-respaldo';
  version: 1;
  exportado_en: string;
  categorias: Categoria[];
  productos: Producto[];
  pedidos: Pedido[];
  pedido_items: PedidoItem[];
}
