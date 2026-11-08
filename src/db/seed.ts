import type { DbEjecutor } from './tipos';

interface ProductoEjemplo {
  nombre: string;
  descripcion: string;
  precio: number;
}

interface CategoriaEjemplo {
  nombre: string;
  productos: ProductoEjemplo[];
}

/** 4 categorías y 12 productos de ejemplo. Se marcan con ejemplo = 1 para poder borrarlos luego. */
export const DATOS_EJEMPLO: CategoriaEjemplo[] = [
  {
    nombre: 'Entradas',
    productos: [
      { nombre: 'Bolón de verde', descripcion: 'Con queso o chicharrón', precio: 2.5 },
      { nombre: 'Empanadas de viento', descripcion: 'Dos unidades, con azúcar', precio: 2.0 },
      { nombre: 'Tigrillo', descripcion: 'Verde majado con huevo y queso', precio: 3.5 },
    ],
  },
  {
    nombre: 'Platos fuertes',
    productos: [
      { nombre: 'Seco de pollo', descripcion: 'Con arroz, maduro y ensalada', precio: 5.5 },
      { nombre: 'Encebollado', descripcion: 'Albacora, yuca, chifles y canguil', precio: 4.0 },
      { nombre: 'Churrasco', descripcion: 'Carne, huevo frito, arroz, papas y ensalada', precio: 7.5 },
    ],
  },
  {
    nombre: 'Bebidas',
    productos: [
      { nombre: 'Jugo natural', descripcion: 'Mora, naranjilla o maracuyá', precio: 1.75 },
      { nombre: 'Cola personal', descripcion: 'Botella de 500 ml', precio: 1.0 },
      { nombre: 'Café pasado', descripcion: 'Con leche o en agua', precio: 1.25 },
    ],
  },
  {
    nombre: 'Postres',
    productos: [
      { nombre: 'Helado de paila', descripcion: 'Una bola, sabor del día', precio: 2.25 },
      { nombre: 'Higos con queso', descripcion: 'Higos en almíbar con queso fresco', precio: 3.0 },
      { nombre: 'Tres leches', descripcion: 'Porción individual', precio: 2.5 },
    ],
  },
];

export async function cargarDatosEjemplo(tx: DbEjecutor, ahora: Date = new Date()): Promise<void> {
  const creado = ahora.toISOString();
  for (const [indice, categoria] of DATOS_EJEMPLO.entries()) {
    const { lastInsertRowId: categoriaId } = await tx.run(
      'INSERT INTO categorias (nombre, orden, ejemplo) VALUES (?, ?, 1)',
      [categoria.nombre, indice + 1],
    );
    for (const producto of categoria.productos) {
      await tx.run(
        `INSERT INTO productos (categoria_id, nombre, descripcion, precio, activo, created_at, ejemplo)
         VALUES (?, ?, ?, ?, 1, ?, 1)`,
        [categoriaId, producto.nombre, producto.descripcion, producto.precio, creado],
      );
    }
  }
}
