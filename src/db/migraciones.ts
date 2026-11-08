/**
 * Migraciones simples. La tabla `schema_version` guarda la versión actual del esquema;
 * al abrir la app se aplican, en orden y cada una en su propia transacción,
 * las migraciones con versión mayor a la guardada.
 */
import { cargarDatosEjemplo } from './seed';
import type { Db, DbEjecutor } from './tipos';

export interface Migracion {
  version: number;
  descripcion: string;
  aplicar(tx: DbEjecutor): Promise<void>;
}

const ESQUEMA_V1 = `
CREATE TABLE categorias (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  orden INTEGER NOT NULL DEFAULT 0,
  ejemplo INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE productos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  categoria_id INTEGER NOT NULL REFERENCES categorias(id),
  nombre TEXT NOT NULL,
  descripcion TEXT,
  precio REAL NOT NULL CHECK (precio > 0),
  activo INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  ejemplo INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE pedidos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  numero INTEGER NOT NULL,
  fecha TEXT NOT NULL,
  created_at TEXT NOT NULL,
  mesa TEXT,
  nota TEXT,
  total REAL NOT NULL,
  estado TEXT NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'anulado'))
);

CREATE TABLE pedido_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pedido_id INTEGER NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  producto_id INTEGER NOT NULL REFERENCES productos(id),
  nombre_producto TEXT NOT NULL,
  precio_unitario REAL NOT NULL,
  cantidad INTEGER NOT NULL CHECK (cantidad > 0),
  nota TEXT,
  subtotal REAL NOT NULL
);

CREATE TABLE ajustes (
  clave TEXT PRIMARY KEY NOT NULL,
  valor TEXT
);

CREATE INDEX idx_pedidos_fecha ON pedidos(fecha);
CREATE UNIQUE INDEX idx_pedidos_fecha_numero ON pedidos(fecha, numero);
CREATE INDEX idx_pedido_items_pedido_id ON pedido_items(pedido_id);
CREATE INDEX idx_pedido_items_producto_id ON pedido_items(producto_id);
CREATE INDEX idx_productos_categoria_id ON productos(categoria_id);
`;

export const MIGRACIONES: Migracion[] = [
  {
    version: 1,
    descripcion: 'Esquema inicial y datos de ejemplo',
    async aplicar(tx) {
      await tx.exec(ESQUEMA_V1);
      // La primera vez que se abre la app se cargan los datos de ejemplo.
      await cargarDatosEjemplo(tx);
    },
  },
];

export const VERSION_ACTUAL = MIGRACIONES[MIGRACIONES.length - 1].version;

/** Aplica las migraciones pendientes. Devuelve la versión final del esquema. */
export async function migrar(db: Db, migraciones: Migracion[] = MIGRACIONES): Promise<number> {
  await db.exec(
    `CREATE TABLE IF NOT EXISTS schema_version (
       id INTEGER PRIMARY KEY CHECK (id = 1),
       version INTEGER NOT NULL
     );
     INSERT OR IGNORE INTO schema_version (id, version) VALUES (1, 0);`,
  );
  const fila = await db.get<{ version: number }>('SELECT version FROM schema_version WHERE id = 1');
  let version = fila?.version ?? 0;

  for (const migracion of [...migraciones].sort((a, b) => a.version - b.version)) {
    if (migracion.version <= version) continue;
    await db.transaction(async (tx) => {
      await migracion.aplicar(tx);
      await tx.run('UPDATE schema_version SET version = ? WHERE id = 1', [migracion.version]);
    });
    version = migracion.version;
  }
  return version;
}
