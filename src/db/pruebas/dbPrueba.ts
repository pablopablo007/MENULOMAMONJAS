/**
 * Base de datos en memoria para las pruebas (sql.js = SQLite compilado a WebAssembly).
 * Implementa la misma interfaz `Db` que usa la app, así se prueban las consultas reales.
 */
import initSqlJs from 'sql.js';

import { migrar } from '../migraciones';
import type { Db, DbEjecutor, ResultadoEscritura, ValorSQL } from '../tipos';

export async function crearDbPrueba(opciones: { migrar?: boolean } = {}): Promise<Db> {
  const SQL = await initSqlJs();
  const base = new SQL.Database();
  base.exec('PRAGMA foreign_keys = ON;');

  const ejecutor: DbEjecutor = {
    async exec(sql: string): Promise<void> {
      base.exec(sql);
    },
    async run(sql: string, params: ValorSQL[] = []): Promise<ResultadoEscritura> {
      base.run(sql, params);
      const changes = base.getRowsModified();
      const id = base.exec('SELECT last_insert_rowid() AS id')[0]?.values[0]?.[0];
      return { lastInsertRowId: Number(id ?? 0), changes };
    },
    async all<T>(sql: string, params: ValorSQL[] = []): Promise<T[]> {
      const sentencia = base.prepare(sql);
      sentencia.bind(params);
      const filas: T[] = [];
      while (sentencia.step()) filas.push(sentencia.getAsObject() as unknown as T);
      sentencia.free();
      return filas;
    },
    async get<T>(sql: string, params: ValorSQL[] = []): Promise<T | null> {
      const filas = await ejecutor.all<T>(sql, params);
      return filas[0] ?? null;
    },
  };

  const db: Db = {
    ...ejecutor,
    async transaction<T>(tarea: (tx: DbEjecutor) => Promise<T>): Promise<T> {
      base.exec('BEGIN');
      try {
        const resultado = await tarea(ejecutor);
        base.exec('COMMIT');
        return resultado;
      } catch (error) {
        base.exec('ROLLBACK');
        throw error;
      }
    },
  };

  if (opciones.migrar !== false) await migrar(db);
  return db;
}
