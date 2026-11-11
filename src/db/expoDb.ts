import type { SQLiteDatabase } from 'expo-sqlite';

import type { Db, DbEjecutor, ValorSQL } from './tipos';

function crearEjecutor(sqlite: SQLiteDatabase): DbEjecutor {
  return {
    exec: (sql: string) => sqlite.execAsync(sql),
    run: (sql: string, params: ValorSQL[] = []) => sqlite.runAsync(sql, params),
    get: <T>(sql: string, params: ValorSQL[] = []) => sqlite.getFirstAsync<T>(sql, params),
    all: <T>(sql: string, params: ValorSQL[] = []) => sqlite.getAllAsync<T>(sql, params),
  };
}

/** Adapta una conexión de expo-sqlite a la interfaz `Db` de los repositorios. */
export function crearDbExpo(sqlite: SQLiteDatabase): Db {
  return {
    ...crearEjecutor(sqlite),
    async transaction<T>(tarea: (tx: DbEjecutor) => Promise<T>): Promise<T> {
      const caja: { listo: boolean; valor?: T } = { listo: false };
      // Transacción exclusiva: ninguna otra consulta de la app se mezcla con esta.
      await sqlite.withExclusiveTransactionAsync(async (txn) => {
        caja.valor = await tarea(crearEjecutor(txn));
        caja.listo = true;
      });
      if (!caja.listo) throw new Error('La transacción no terminó correctamente.');
      return caja.valor as T;
    },
  };
}
