/**
 * Interfaz mínima de base de datos que usan los repositorios.
 * En la app la implementa expo-sqlite (ver expoDb.ts); en las pruebas, sql.js.
 */
export type ValorSQL = string | number | null;

export interface ResultadoEscritura {
  lastInsertRowId: number;
  changes: number;
}

export interface DbEjecutor {
  /** Ejecuta uno o varios comandos SQL sin parámetros. */
  exec(sql: string): Promise<void>;
  run(sql: string, params?: ValorSQL[]): Promise<ResultadoEscritura>;
  get<T>(sql: string, params?: ValorSQL[]): Promise<T | null>;
  all<T>(sql: string, params?: ValorSQL[]): Promise<T[]>;
}

export interface Db extends DbEjecutor {
  /**
   * Ejecuta la tarea dentro de UNA transacción: si algo falla se revierte todo.
   * Dentro de la tarea se debe usar solo `tx`, no `db`.
   */
  transaction<T>(tarea: (tx: DbEjecutor) => Promise<T>): Promise<T>;
}
