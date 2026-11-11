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

/**
 * 4 categorías y 12 productos de ejemplo (el menú de prueba de las primeras versiones).
 * Se marcan con ejemplo = 1 para poder borrarlos luego. La app ya no los carga: se usan en las pruebas.
 */
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

interface ProductoMenu {
  nombre: string;
  descripcion?: string;
  precio: number;
}

interface CategoriaMenu {
  nombre: string;
  productos: ProductoMenu[];
}

/** Menú real del Mirador Loma de Monjas (noviembre 2026). */
export const MENU_LOCAL: CategoriaMenu[] = [
  {
    nombre: 'Comida',
    productos: [
      { nombre: 'Salchipapa', precio: 2.0 },
      { nombre: 'Papinuggets', precio: 3.0 },
      { nombre: 'Salchipapa cheddar', precio: 2.5 },
      { nombre: 'Papa completa', descripcion: 'Salchicha, nuggets y cheddar', precio: 3.5 },
      { nombre: 'Patacones con queso', precio: 2.0 },
      { nombre: 'Yuca frita con queso', precio: 2.0 },
      { nombre: 'Maduro frito con queso', precio: 2.0 },
      { nombre: 'Hot dog', precio: 1.5 },
      { nombre: 'Sánduche', descripcion: 'De jamón y queso o salami', precio: 2.0 },
      { nombre: 'Tostada', precio: 2.0 },
      { nombre: 'Fresa con crema y chocolate', precio: 2.0 },
      { nombre: 'Tabla de piqueo', descripcion: 'Para 4 personas', precio: 6.0 },
    ],
  },
  {
    nombre: 'Snacks',
    productos: [
      { nombre: 'Snack', precio: 1.0 },
      { nombre: 'Pipas', precio: 0.5 },
    ],
  },
  {
    nombre: 'Helados y galletas',
    productos: [
      { nombre: 'Helado de paleta', precio: 0.5 },
      { nombre: 'Galletas de coco', precio: 1.0 },
      { nombre: 'Galletas María', precio: 1.0 },
      { nombre: 'Galletas Amor', precio: 1.5 },
      { nombre: 'Galletas Cuencanas', precio: 1.0 },
    ],
  },
  {
    nombre: 'Dulces y otros',
    productos: [
      { nombre: 'Cigarrillo', precio: 0.5 },
      { nombre: 'Trident', precio: 0.75 },
      { nombre: 'Chupete', precio: 0.25 },
      { nombre: 'Chocolates Oso', precio: 3.0 },
      { nombre: 'Chocolate corazón', precio: 3.0 },
      { nombre: 'Chocolate botella pequeña', precio: 2.0 },
      { nombre: 'Chocolate botella grande', precio: 2.0 },
    ],
  },
  {
    nombre: 'Bebidas',
    productos: [
      { nombre: 'Agua de Jamaica', descripcion: 'Vaso', precio: 1.0 },
      { nombre: 'Jugo natural', precio: 2.0 },
      { nombre: 'Batido', precio: 2.0 },
      { nombre: 'Chocolate', precio: 1.5 },
      { nombre: 'Café americano', precio: 0.75 },
      { nombre: 'Café con leche', precio: 1.5 },
      { nombre: 'Infusión natural', precio: 1.0 },
      { nombre: 'Ensalada de frutas', precio: 2.0 },
      { nombre: 'Gaseosa', precio: 0.75 },
      { nombre: 'Agua sin gas', precio: 1.0 },
      { nombre: 'Agua con gas', precio: 0.75 },
      { nombre: 'Té frío', precio: 0.75 },
      { nombre: 'Cerveza litro', precio: 4.0 },
      { nombre: 'Cerveza personal', precio: 2.0 },
      { nombre: 'Jarra de canelazo', precio: 4.0 },
      { nombre: 'Jarra de vodka con cereza', precio: 4.0 },
    ],
  },
  {
    nombre: 'Extras',
    productos: [
      { nombre: 'Extra de líquido', precio: 1.0 },
      { nombre: 'Extra de comida', precio: 0.5 },
    ],
  },
];

/**
 * Reemplaza el menú por MENU_LOCAL. Los productos que ya se usaron en pedidos no se borran
 * (el historial los necesita): quedan como no disponibles y sus categorías van al final.
 */
export async function cargarMenuLocal(tx: DbEjecutor, ahora: Date = new Date()): Promise<void> {
  const creado = ahora.toISOString();
  await tx.run(
    `UPDATE productos SET activo = 0, ejemplo = 0
     WHERE id IN (SELECT DISTINCT producto_id FROM pedido_items)`,
  );
  await tx.run('DELETE FROM productos WHERE id NOT IN (SELECT DISTINCT producto_id FROM pedido_items)');
  await tx.run('DELETE FROM categorias WHERE id NOT IN (SELECT DISTINCT categoria_id FROM productos)');
  await tx.run('UPDATE categorias SET orden = orden + 100, ejemplo = 0');

  for (const [indice, categoria] of MENU_LOCAL.entries()) {
    const { lastInsertRowId: categoriaId } = await tx.run(
      'INSERT INTO categorias (nombre, orden, ejemplo) VALUES (?, ?, 0)',
      [categoria.nombre, indice + 1],
    );
    for (const producto of categoria.productos) {
      await tx.run(
        `INSERT INTO productos (categoria_id, nombre, descripcion, precio, activo, created_at, ejemplo)
         VALUES (?, ?, ?, ?, 1, ?, 0)`,
        [categoriaId, producto.nombre, producto.descripcion ?? null, producto.precio, creado],
      );
    }
  }
}
