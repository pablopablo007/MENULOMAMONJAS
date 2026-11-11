import { openDatabaseAsync } from 'expo-sqlite';

import { crearDbExpo } from './expoDb';
import { migrar } from './migraciones';
import type { Db } from './tipos';

export const NOMBRE_BASE_DATOS = 'pedidos.db';

let conexion: Promise<Db> | null = null;

async function abrir(): Promise<Db> {
  const sqlite = await openDatabaseAsync(NOMBRE_BASE_DATOS);
  await sqlite.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  const db = crearDbExpo(sqlite);
  await migrar(db);
  return db;
}

/** Abre la base de datos local (una sola vez) y aplica las migraciones pendientes. */
export function obtenerDb(): Promise<Db> {
  if (!conexion) {
    conexion = abrir().catch((error: unknown) => {
      conexion = null; // permite reintentar
      throw error;
    });
  }
  return conexion;
}
