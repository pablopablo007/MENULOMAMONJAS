import { anularPedido, borrarTodosLosPedidos, guardarPedido } from '../../db/pedidosRepo';
import { crearProducto, eliminarCategoria, crearCategoria } from '../../db/productosRepo';
import { contarPendientes, TABLAS_NUBE, type FilaNube, type TablaNube } from '../../db/syncRepo';
import { crearDbPrueba } from '../../db/pruebas/dbPrueba';
import type { Db } from '../../db/tipos';
import { cuentaVinculada, descargarTodo, sincronizar, subirTodo, vincular, type Remoto } from '../sincronizacion';

/** Nube en memoria: una tabla = un Map por id. */
function nubeFalsa() {
  const tablas = new Map<TablaNube, Map<number, FilaNube>>(TABLAS_NUBE.map((t) => [t, new Map()]));
  let fallar = false;
  const remoto: Remoto = {
    async subir(tabla, filas) {
      if (fallar) throw new Error('Sin conexión a internet.');
      for (const f of filas) tablas.get(tabla)!.set(Number(f.id), { ...f });
    },
    async borrar(tabla, ids) {
      if (fallar) throw new Error('Sin conexión a internet.');
      for (const id of ids) tablas.get(tabla)!.delete(id);
    },
    async descargar(tabla) {
      return [...tablas.get(tabla)!.values()].sort((a, b) => Number(a.id) - Number(b.id));
    },
    async tieneDatos() {
      return [...tablas.values()].some((t) => t.size > 0);
    },
    async vaciar() {
      for (const t of tablas.values()) t.clear();
    },
  };
  return {
    remoto,
    tablas,
    sinInternet: (valor: boolean) => {
      fallar = valor;
    },
  };
}

const PEDIDO = {
  mesa: '4',
  nota: null,
  items: [{ producto_id: 1, nombre_producto: 'Producto 1', precio_unitario: 2.5, cantidad: 2, nota: null }],
};

describe('sincronización con la nube', () => {
  let db: Db;
  beforeEach(async () => {
    db = await crearDbPrueba();
  });

  it('al vincular con una nube vacía sube todo lo del celular', async () => {
    const nube = nubeFalsa();
    expect(await contarPendientes(db)).toBeGreaterThan(0); // el menú
    expect(await vincular(db, nube.remoto, 'cuenta-1')).toBe('vinculado');
    expect(await contarPendientes(db)).toBe(0);
    expect(nube.tablas.get('productos')!.size).toBe(44);
    expect(await cuentaVinculada(db)).toBe('cuenta-1');
  });

  it('sube pedidos nuevos, cambios y borrados', async () => {
    const nube = nubeFalsa();
    await vincular(db, nube.remoto, 'cuenta-1');

    const pedido = await guardarPedido(db, PEDIDO, new Date(2026, 10, 8, 12));
    const categoria = await crearCategoria(db, 'Temporal');
    expect(await contarPendientes(db)).toBe(3); // pedido, su ítem y la categoría
    await sincronizar(db, nube.remoto);
    expect(nube.tablas.get('pedidos')!.get(pedido.id)?.estado).toBe('activo');
    expect(nube.tablas.get('pedido_items')!.size).toBe(1);

    await anularPedido(db, pedido.id);
    await eliminarCategoria(db, categoria);
    await sincronizar(db, nube.remoto);
    expect(nube.tablas.get('pedidos')!.get(pedido.id)?.estado).toBe('anulado');
    expect(nube.tablas.get('categorias')!.has(categoria)).toBe(false);
    expect(await contarPendientes(db)).toBe(0);
  });

  it('sin internet no se pierde nada: los cambios esperan en la cola', async () => {
    const nube = nubeFalsa();
    await vincular(db, nube.remoto, 'cuenta-1');
    nube.sinInternet(true);
    await guardarPedido(db, PEDIDO, new Date(2026, 10, 8, 12));
    await expect(sincronizar(db, nube.remoto)).rejects.toThrow('Sin conexión');
    expect(await contarPendientes(db)).toBe(2);

    nube.sinInternet(false);
    await sincronizar(db, nube.remoto);
    expect(await contarPendientes(db)).toBe(0);
    expect(nube.tablas.get('pedidos')!.size).toBe(1);
  });

  it('si la nube ya tiene datos pide elegir; descargar reemplaza lo del celular', async () => {
    const nube = nubeFalsa();
    // Celular viejo: sube un producto y un pedido.
    await vincular(db, nube.remoto, 'cuenta-1');
    await crearProducto(db, { categoria_id: 1, nombre: 'Encebollado', descripcion: null, precio: 4.5 });
    await guardarPedido(db, PEDIDO, new Date(2026, 10, 8, 12));
    await sincronizar(db, nube.remoto);

    // Celular nuevo con solo el menú.
    const nuevo = await crearDbPrueba();
    expect(await vincular(nuevo, nube.remoto, 'cuenta-1')).toBe('elegir');
    await descargarTodo(nuevo, nube.remoto, 'cuenta-1');
    expect(await contarPendientes(nuevo)).toBe(0);
    const productos = await nuevo.all<{ nombre: string }>('SELECT nombre FROM productos');
    expect(productos.map((p) => p.nombre)).toContain('Encebollado');
    const pedidos = await nuevo.get<{ n: number }>('SELECT COUNT(*) AS n FROM pedidos');
    expect(pedidos?.n).toBe(1);
    expect(await cuentaVinculada(nuevo)).toBe('cuenta-1');
  });

  it('borrar todos los pedidos los quita también de la nube y la numeración vuelve a #1', async () => {
    const nube = nubeFalsa();
    await vincular(db, nube.remoto, 'cuenta-1');
    await guardarPedido(db, PEDIDO, new Date(2026, 10, 8, 12));
    await guardarPedido(db, PEDIDO, new Date(2026, 10, 8, 13));
    await sincronizar(db, nube.remoto);
    expect(nube.tablas.get('pedidos')!.size).toBe(2);

    expect(await borrarTodosLosPedidos(db)).toBe(2);
    await sincronizar(db, nube.remoto);
    expect(nube.tablas.get('pedidos')!.size).toBe(0);
    expect(nube.tablas.get('pedido_items')!.size).toBe(0);
    expect(nube.tablas.get('productos')!.size).toBe(44); // el menú no se toca

    const nuevo = await guardarPedido(db, PEDIDO, new Date(2026, 10, 8, 14));
    expect(nuevo.numero).toBe(1);
  });

  it('subir todo reemplaza lo que había en la nube', async () => {
    const nube = nubeFalsa();
    await nube.remoto.subir('categorias', [{ id: 99, nombre: 'Vieja', orden: 0, ejemplo: 0 }]);
    await subirTodo(db, nube.remoto, 'cuenta-1');
    expect(nube.tablas.get('categorias')!.has(99)).toBe(false);
    expect(nube.tablas.get('categorias')!.size).toBe(6);
  });
});
