/**
 * Formato y validación del archivo de respaldo (JSON).
 * La validación es pura: recibe lo que salió de JSON.parse y devuelve un Respaldo tipado
 * o lanza un ErrorRespaldo con un mensaje claro en español.
 */
import type {
  Bandera,
  Categoria,
  EstadoPedido,
  Pedido,
  PedidoItem,
  Producto,
  Respaldo,
} from '../types';
import { esFechaISO } from './fechas';

export const FORMATO_RESPALDO = 'pedidos-respaldo';
export const VERSION_RESPALDO = 1;

export class ErrorRespaldo extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = 'ErrorRespaldo';
  }
}

/** "respaldo-pedidos-2026-11-08.json" */
export function nombreArchivoRespaldo(fechaISO: string): string {
  return `respaldo-pedidos-${fechaISO}.json`;
}

type Registro = Record<string, unknown>;

function esRegistro(valor: unknown): valor is Registro {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor);
}

function entero(fila: Registro, campo: string, donde: string): number {
  const valor = fila[campo];
  if (typeof valor !== 'number' || !Number.isInteger(valor)) {
    throw new ErrorRespaldo(`${donde}: el campo "${campo}" debe ser un número entero.`);
  }
  return valor;
}

function numero(fila: Registro, campo: string, donde: string): number {
  const valor = fila[campo];
  if (typeof valor !== 'number' || !Number.isFinite(valor)) {
    throw new ErrorRespaldo(`${donde}: el campo "${campo}" debe ser un número.`);
  }
  return valor;
}

function texto(fila: Registro, campo: string, donde: string): string {
  const valor = fila[campo];
  if (typeof valor !== 'string') {
    throw new ErrorRespaldo(`${donde}: el campo "${campo}" debe ser texto.`);
  }
  return valor;
}

function textoOpcional(fila: Registro, campo: string, donde: string): string | null {
  const valor = fila[campo];
  if (valor === null || valor === undefined) return null;
  if (typeof valor !== 'string') {
    throw new ErrorRespaldo(`${donde}: el campo "${campo}" debe ser texto o null.`);
  }
  return valor;
}

function bandera(fila: Registro, campo: string, donde: string, porDefecto: Bandera): Bandera {
  const valor = fila[campo];
  if (valor === undefined) return porDefecto;
  if (valor === 0 || valor === 1) return valor;
  if (valor === true) return 1;
  if (valor === false) return 0;
  throw new ErrorRespaldo(`${donde}: el campo "${campo}" debe ser 0 o 1.`);
}

function lista(datos: Registro, campo: string): Registro[] {
  const valor = datos[campo];
  if (!Array.isArray(valor)) {
    throw new ErrorRespaldo(`Falta la lista "${campo}" en el respaldo.`);
  }
  return valor.map((fila, i) => {
    if (!esRegistro(fila)) throw new ErrorRespaldo(`"${campo}" fila ${i + 1}: no es un objeto válido.`);
    return fila;
  });
}

function sinDuplicados(filas: { id: number }[], nombre: string): Set<number> {
  const ids = new Set<number>();
  for (const fila of filas) {
    if (ids.has(fila.id)) throw new ErrorRespaldo(`Hay ${nombre} con el id ${fila.id} repetido.`);
    ids.add(fila.id);
  }
  return ids;
}

function leerCategoria(fila: Registro, i: number): Categoria {
  const donde = `Categoría ${i + 1}`;
  return {
    id: entero(fila, 'id', donde),
    nombre: texto(fila, 'nombre', donde),
    orden: entero(fila, 'orden', donde),
    ejemplo: bandera(fila, 'ejemplo', donde, 0),
  };
}

function leerProducto(fila: Registro, i: number): Producto {
  const donde = `Producto ${i + 1}`;
  const precio = numero(fila, 'precio', donde);
  if (precio <= 0) throw new ErrorRespaldo(`${donde}: el precio debe ser mayor que 0.`);
  return {
    id: entero(fila, 'id', donde),
    categoria_id: entero(fila, 'categoria_id', donde),
    nombre: texto(fila, 'nombre', donde),
    descripcion: textoOpcional(fila, 'descripcion', donde),
    precio,
    activo: bandera(fila, 'activo', donde, 1),
    created_at: texto(fila, 'created_at', donde),
    ejemplo: bandera(fila, 'ejemplo', donde, 0),
  };
}

function leerPedido(fila: Registro, i: number): Pedido {
  const donde = `Pedido ${i + 1}`;
  const fecha = texto(fila, 'fecha', donde);
  if (!esFechaISO(fecha)) throw new ErrorRespaldo(`${donde}: la fecha "${fecha}" no es válida.`);
  const estado = texto(fila, 'estado', donde);
  if (estado !== 'activo' && estado !== 'anulado') {
    throw new ErrorRespaldo(`${donde}: el estado debe ser "activo" o "anulado".`);
  }
  return {
    id: entero(fila, 'id', donde),
    numero: entero(fila, 'numero', donde),
    fecha,
    created_at: texto(fila, 'created_at', donde),
    mesa: textoOpcional(fila, 'mesa', donde),
    nota: textoOpcional(fila, 'nota', donde),
    total: numero(fila, 'total', donde),
    estado: estado satisfies EstadoPedido,
  };
}

function leerItem(fila: Registro, i: number): PedidoItem {
  const donde = `Ítem de pedido ${i + 1}`;
  const cantidad = entero(fila, 'cantidad', donde);
  if (cantidad <= 0) throw new ErrorRespaldo(`${donde}: la cantidad debe ser mayor que 0.`);
  return {
    id: entero(fila, 'id', donde),
    pedido_id: entero(fila, 'pedido_id', donde),
    producto_id: entero(fila, 'producto_id', donde),
    nombre_producto: texto(fila, 'nombre_producto', donde),
    precio_unitario: numero(fila, 'precio_unitario', donde),
    cantidad,
    nota: textoOpcional(fila, 'nota', donde),
    subtotal: numero(fila, 'subtotal', donde),
  };
}

/** Valida el contenido de un archivo de respaldo y lo devuelve tipado. */
export function validarRespaldo(datos: unknown): Respaldo {
  if (!esRegistro(datos)) throw new ErrorRespaldo('El archivo no contiene un respaldo válido.');
  if (datos.formato !== FORMATO_RESPALDO) {
    throw new ErrorRespaldo('Este archivo no es un respaldo de esta app.');
  }
  if (datos.version !== VERSION_RESPALDO) {
    throw new ErrorRespaldo(`Versión de respaldo no compatible (${String(datos.version)}).`);
  }
  const exportadoEn = typeof datos.exportado_en === 'string' ? datos.exportado_en : '';

  const categorias = lista(datos, 'categorias').map(leerCategoria);
  const productos = lista(datos, 'productos').map(leerProducto);
  const pedidos = lista(datos, 'pedidos').map(leerPedido);
  const items = lista(datos, 'pedido_items').map(leerItem);

  const idsCategorias = sinDuplicados(categorias, 'categorías');
  const idsProductos = sinDuplicados(productos, 'productos');
  const idsPedidos = sinDuplicados(pedidos, 'pedidos');
  sinDuplicados(items, 'ítems');

  for (const p of productos) {
    if (!idsCategorias.has(p.categoria_id)) {
      throw new ErrorRespaldo(`El producto "${p.nombre}" apunta a una categoría que no existe.`);
    }
  }
  const numerosPorDia = new Set<string>();
  for (const p of pedidos) {
    const clave = `${p.fecha}#${p.numero}`;
    if (numerosPorDia.has(clave)) {
      throw new ErrorRespaldo(`El pedido #${p.numero} del ${p.fecha} está repetido.`);
    }
    numerosPorDia.add(clave);
  }
  for (const item of items) {
    if (!idsPedidos.has(item.pedido_id)) {
      throw new ErrorRespaldo(`Hay un ítem que apunta a un pedido que no existe (id ${item.pedido_id}).`);
    }
    if (!idsProductos.has(item.producto_id)) {
      throw new ErrorRespaldo(`Hay un ítem que apunta a un producto que no existe (id ${item.producto_id}).`);
    }
  }

  return {
    formato: FORMATO_RESPALDO,
    version: VERSION_RESPALDO,
    exportado_en: exportadoEn,
    categorias,
    productos,
    pedidos,
    pedido_items: items,
  };
}

/** Interpreta el texto del archivo (JSON) y lo valida. */
export function leerRespaldoDesdeTexto(contenido: string): Respaldo {
  let datos: unknown;
  try {
    datos = JSON.parse(contenido);
  } catch {
    throw new ErrorRespaldo('El archivo no es un JSON válido. ¿Elegiste el archivo correcto?');
  }
  return validarRespaldo(datos);
}
