import { leerRespaldoDesdeTexto } from '../../lib/respaldo';
import type { NuevoPedido } from '../../types';
import { obtenerUltimoRespaldo, registrarRespaldo } from '../ajustesRepo';
import { MIGRACIONES, VERSION_ACTUAL, migrar } from '../migraciones';
import {
  anularPedido,
  guardarPedido,
  listarPedidosDelDia,
  listarPedidosRango,
} from '../pedidosRepo';
import {
  borrarDatosEjemplo,
  cambiarDisponibilidad,
  crearCategoria,
  crearProducto,
  eliminarCategoria,
  eliminarProducto,
  hayDatosEjemplo,
  listarCategorias,
  listarProductos,
  moverCategoria,
  obtenerProducto,
} from '../productosRepo';
import { contarDatos, exportarRespaldo, restaurarRespaldo } from '../respaldoRepo';
import { productosMasVendidos, resumenRango, totalesPorDia, totalesPorMes } from '../resumenRepo';
import { crearDbPrueba } from '../pruebas/dbPrueba';
import type { Db } from '../tipos';

/** Fecha local fija: 8 nov 2026 a la hora indicada. */
function el8deNoviembre(hora: number, minuto = 0): Date {
  return new Date(2026, 10, 8, hora, minuto);
}

function pedido(items: [productoId: number, cantidad: number, precio: number][], mesa: string | null = null): NuevoPedido {
  return {
    mesa,
    nota: null,
    items: items.map(([producto_id, cantidad, precio]) => ({
      producto_id,
      nombre_producto: `Producto ${producto_id}`,
      precio_unitario: precio,
      cantidad,
      nota: null,
    })),
  };
}

describe('migraciones y datos de ejemplo', () => {
  it('crea el esquema y carga 4 categorías y 12 productos la primera vez', async () => {
    const db = await crearDbPrueba();
    expect(await listarCategorias(db)).toHaveLength(4);
    expect(await listarProductos(db)).toHaveLength(12);
    const version = await db.get<{ version: number }>('SELECT version FROM schema_version');
    expect(version?.version).toBe(VERSION_ACTUAL);
  });

  it('no vuelve a aplicar migraciones ni a duplicar los datos de ejemplo', async () => {
    const db = await crearDbPrueba();
    await migrar(db, MIGRACIONES);
    await migrar(db, MIGRACIONES);
    expect(await listarProductos(db)).toHaveLength(12);
  });

  it('crea los índices pedidos.fecha y pedido_items.pedido_id', async () => {
    const db = await crearDbPrueba();
    const indices = await db.all<{ name: string }>("SELECT name FROM sqlite_master WHERE type = 'index'");
    const nombres = indices.map((i) => i.name);
    expect(nombres).toEqual(expect.arrayContaining(['idx_pedidos_fecha', 'idx_pedido_items_pedido_id']));
  });
});

describe('pedidos', () => {
  let db: Db;
  beforeEach(async () => {
    db = await crearDbPrueba();
  });

  it('numera los pedidos por día y reinicia el número al día siguiente', async () => {
    const a = await guardarPedido(db, pedido([[1, 1, 2.5]]), el8deNoviembre(12));
    const b = await guardarPedido(db, pedido([[2, 2, 2]]), el8deNoviembre(13));
    const c = await guardarPedido(db, pedido([[3, 1, 3.5]]), new Date(2026, 10, 9, 9));
    expect([a.numero, b.numero, c.numero]).toEqual([1, 2, 1]);
    expect(a.fecha).toBe('2026-11-08');
    expect(c.fecha).toBe('2026-11-09');
  });

  it('guarda el pedido con sus ítems, copia nombre y precio, y calcula el total sin errores de redondeo', async () => {
    const guardado = await guardarPedido(db, pedido([[7, 3, 0.1], [8, 1, 0.2]], 'Terraza 2'), el8deNoviembre(18, 45));
    expect(guardado.total).toBe(0.5);
    expect(guardado.mesa).toBe('Terraza 2');
    const [delDia] = await listarPedidosDelDia(db, '2026-11-08');
    expect(delDia.items).toHaveLength(2);
    expect(delDia.items[0]).toMatchObject({ nombre_producto: 'Producto 7', precio_unitario: 0.1, cantidad: 3, subtotal: 0.3 });
  });

  it('los pedidos viejos no cambian si luego se modifica el precio del producto', async () => {
    await guardarPedido(db, pedido([[1, 2, 2.5]]), el8deNoviembre(12));
    await db.run('UPDATE productos SET precio = 99, nombre = ? WHERE id = 1', ['Nuevo nombre']);
    const [p] = await listarPedidosDelDia(db, '2026-11-08');
    expect(p.items[0].precio_unitario).toBe(2.5);
    expect(p.items[0].nombre_producto).toBe('Producto 1');
    expect(p.total).toBe(5);
  });

  it('no permite generar un pedido vacío', async () => {
    await expect(guardarPedido(db, pedido([]), el8deNoviembre(12))).rejects.toThrow('vacío');
    expect(await listarPedidosDelDia(db, '2026-11-08')).toHaveLength(0);
  });

  it('si falla un ítem no se guarda nada (transacción)', async () => {
    // El producto 999 no existe: falla la clave foránea del segundo ítem.
    await expect(guardarPedido(db, pedido([[1, 1, 2.5], [999, 1, 1]]), el8deNoviembre(12))).rejects.toThrow();
    const pedidos = await db.get<{ n: number }>('SELECT COUNT(*) AS n FROM pedidos');
    const items = await db.get<{ n: number }>('SELECT COUNT(*) AS n FROM pedido_items');
    expect(pedidos?.n).toBe(0);
    expect(items?.n).toBe(0);
  });

  it('lista los pedidos de un rango ordenados por fecha y hora', async () => {
    await guardarPedido(db, pedido([[1, 1, 2.5]]), new Date(2026, 10, 9, 8));
    await guardarPedido(db, pedido([[1, 1, 2.5]]), el8deNoviembre(20));
    await guardarPedido(db, pedido([[1, 1, 2.5]]), el8deNoviembre(10));
    const lista = await listarPedidosRango(db, '2026-11-01', '2026-11-30');
    expect(lista.map((p) => [p.fecha, p.numero])).toEqual([
      ['2026-11-08', 2],
      ['2026-11-08', 1],
      ['2026-11-09', 1],
    ]);
  });
});

describe('resúmenes: los pedidos anulados quedan fuera de los totales', () => {
  let db: Db;
  beforeEach(async () => {
    db = await crearDbPrueba();
    await guardarPedido(db, pedido([[1, 2, 2.5]]), el8deNoviembre(12)); // $5.00
    const anulado = await guardarPedido(db, pedido([[1, 4, 2.5], [4, 1, 5.5]]), el8deNoviembre(13)); // $15.50
    await guardarPedido(db, pedido([[4, 2, 5.5]]), el8deNoviembre(14)); // $11.00
    await guardarPedido(db, pedido([[7, 3, 1.75]]), new Date(2026, 10, 10, 9)); // $5.25
    await anularPedido(db, anulado.id);
  });

  it('totales por día', async () => {
    expect(await totalesPorDia(db, '2026-11-01', '2026-11-30')).toEqual([
      { fecha: '2026-11-08', total: 16, pedidos: 2 },
      { fecha: '2026-11-10', total: 5.25, pedidos: 1 },
    ]);
  });

  it('totales por mes', async () => {
    await guardarPedido(db, pedido([[1, 1, 2.5]]), new Date(2026, 11, 3, 9)); // $2.50 en diciembre
    expect(await totalesPorMes(db, '2026-01-01', '2026-12-31')).toEqual([
      { mes: '2026-11-01', total: 21.25, pedidos: 3 },
      { mes: '2026-12-01', total: 2.5, pedidos: 1 },
    ]);
  });

  it('resumen de un rango con ticket promedio', async () => {
    expect(await resumenRango(db, '2026-11-08', '2026-11-08')).toEqual({ total: 16, pedidos: 2, ticketPromedio: 8 });
    expect(await resumenRango(db, '2026-11-01', '2026-11-30')).toEqual({ total: 21.25, pedidos: 3, ticketPromedio: 7.08 });
  });

  it('un día sin pedidos activos da cero', async () => {
    expect(await resumenRango(db, '2026-11-07', '2026-11-07')).toEqual({ total: 0, pedidos: 0, ticketPromedio: 0 });
  });

  it('productos más vendidos sin contar los anulados', async () => {
    const top = await productosMasVendidos(db, '2026-11-08', '2026-11-08');
    expect(top).toEqual([
      { producto_id: 1, nombre: 'Bolón de verde', cantidad: 2, total: 5 },
      { producto_id: 4, nombre: 'Seco de pollo', cantidad: 2, total: 11 },
    ].sort((a, b) => b.cantidad - a.cantidad || b.total - a.total));
  });

  it('los anulados sí aparecen en la lista del día, marcados como anulados', async () => {
    const lista = await listarPedidosDelDia(db, '2026-11-08');
    expect(lista.map((p) => p.estado)).toEqual(['activo', 'anulado', 'activo']);
  });
});

describe('menú', () => {
  let db: Db;
  beforeEach(async () => {
    db = await crearDbPrueba();
  });

  it('valida el precio y el nombre al crear un producto', async () => {
    await expect(crearProducto(db, { categoria_id: 1, nombre: 'X', descripcion: null, precio: 0 })).rejects.toThrow('mayor que 0');
    await expect(crearProducto(db, { categoria_id: 1, nombre: '  ', descripcion: null, precio: 1 })).rejects.toThrow('nombre');
    const id = await crearProducto(db, { categoria_id: 1, nombre: ' Ceviche ', descripcion: ' ', precio: 6.499 });
    expect(await obtenerProducto(db, id)).toMatchObject({ nombre: 'Ceviche', descripcion: null, precio: 6.5, activo: 1, ejemplo: 0 });
  });

  it('los productos no disponibles no aparecen en la lista para tomar pedidos', async () => {
    await cambiarDisponibilidad(db, 1, false);
    const disponibles = await listarProductos(db, { soloDisponibles: true });
    expect(disponibles).toHaveLength(11);
    expect(disponibles.find((p) => p.id === 1)).toBeUndefined();
  });

  it('eliminar un producto con pedidos solo lo desactiva', async () => {
    await guardarPedido(db, pedido([[1, 1, 2.5]]), el8deNoviembre(12));
    expect(await eliminarProducto(db, 1)).toBe('desactivado');
    expect((await obtenerProducto(db, 1))?.activo).toBe(0);
    expect(await eliminarProducto(db, 2)).toBe('eliminado');
    expect(await obtenerProducto(db, 2)).toBeNull();
  });

  it('crea, reordena y elimina categorías', async () => {
    const id = await crearCategoria(db, 'Sopas');
    let categorias = await listarCategorias(db);
    expect(categorias[categorias.length - 1]).toMatchObject({ id, nombre: 'Sopas', orden: 5 });
    await moverCategoria(db, id, -1);
    categorias = await listarCategorias(db);
    expect(categorias.map((c) => c.nombre)).toEqual(['Entradas', 'Platos fuertes', 'Bebidas', 'Sopas', 'Postres']);
    await expect(eliminarCategoria(db, 1)).rejects.toThrow('tiene productos');
    await eliminarCategoria(db, id);
    expect(await listarCategorias(db)).toHaveLength(4);
  });

  it('borra los datos de ejemplo (y desactiva los que ya tienen pedidos)', async () => {
    const propia = await crearCategoria(db, 'Propia');
    await crearProducto(db, { categoria_id: propia, nombre: 'Mío', descripcion: null, precio: 3 });
    await guardarPedido(db, pedido([[1, 1, 2.5]]), el8deNoviembre(12));
    expect(await hayDatosEjemplo(db)).toBe(true);

    const resultado = await borrarDatosEjemplo(db);
    expect(resultado).toEqual({ eliminados: 11, desactivados: 1 });
    expect(await hayDatosEjemplo(db)).toBe(false);
    const productos = await listarProductos(db);
    expect(productos.map((p) => [p.nombre, p.activo])).toEqual([
      ['Bolón de verde', 0],
      ['Mío', 1],
    ]);
    expect((await listarCategorias(db)).map((c) => c.nombre)).toEqual(['Entradas', 'Propia']);
  });
});

describe('respaldo', () => {
  it('exporta, valida y restaura todos los datos', async () => {
    const origen = await crearDbPrueba();
    await guardarPedido(origen, pedido([[1, 2, 2.5]], '4'), el8deNoviembre(12));
    const anulado = await guardarPedido(origen, pedido([[2, 1, 2]]), el8deNoviembre(13));
    await anularPedido(origen, anulado.id);
    const respaldo = await exportarRespaldo(origen, el8deNoviembre(20));
    const texto = JSON.stringify(respaldo);

    const destino = await crearDbPrueba();
    await guardarPedido(destino, pedido([[3, 1, 3.5]]), new Date(2026, 0, 1, 12));
    await restaurarRespaldo(destino, leerRespaldoDesdeTexto(texto));

    expect(await contarDatos(destino)).toEqual({ categorias: 4, productos: 12, pedidos: 2 });
    expect(await exportarRespaldo(destino, el8deNoviembre(20))).toEqual(respaldo);
    expect(await resumenRango(destino, '2026-11-08', '2026-11-08')).toMatchObject({ total: 5, pedidos: 1 });
    // Después de restaurar se puede seguir numerando pedidos.
    const siguiente = await guardarPedido(destino, pedido([[1, 1, 2.5]]), el8deNoviembre(21));
    expect(siguiente.numero).toBe(3);
  });

  it('si el respaldo es inválido no toca los datos actuales', async () => {
    const db = await crearDbPrueba();
    const respaldo = await exportarRespaldo(db);
    // Un producto apunta a una categoría inexistente: la restauración falla en la transacción.
    const roto = { ...respaldo, productos: respaldo.productos.map((p) => ({ ...p, categoria_id: 999 })) };
    await expect(restaurarRespaldo(db, roto)).rejects.toThrow();
    expect(await contarDatos(db)).toEqual({ categorias: 4, productos: 12, pedidos: 0 });
  });

  it('guarda la fecha del último respaldo', async () => {
    const db = await crearDbPrueba();
    expect(await obtenerUltimoRespaldo(db)).toBeNull();
    await registrarRespaldo(db, el8deNoviembre(9));
    expect(await obtenerUltimoRespaldo(db)).toBe(el8deNoviembre(9).toISOString());
  });
});
