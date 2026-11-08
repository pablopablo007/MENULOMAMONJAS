/** Ajustes simples clave/valor guardados en la tabla `ajustes`. */
import type { DbEjecutor } from './tipos';

const ULTIMO_RESPALDO = 'ultimo_respaldo';

export async function obtenerAjuste(db: DbEjecutor, clave: string): Promise<string | null> {
  const fila = await db.get<{ valor: string | null }>('SELECT valor FROM ajustes WHERE clave = ?', [clave]);
  return fila?.valor ?? null;
}

export async function guardarAjuste(db: DbEjecutor, clave: string, valor: string | null): Promise<void> {
  await db.run(
    `INSERT INTO ajustes (clave, valor) VALUES (?, ?)
     ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor`,
    [clave, valor],
  );
}

/** Fecha-hora ISO del último respaldo exportado, o null si nunca se hizo. */
export function obtenerUltimoRespaldo(db: DbEjecutor): Promise<string | null> {
  return obtenerAjuste(db, ULTIMO_RESPALDO);
}

export function registrarRespaldo(db: DbEjecutor, ahora: Date = new Date()): Promise<void> {
  return guardarAjuste(db, ULTIMO_RESPALDO, ahora.toISOString());
}
