/**
 * Sincronización de una sola vía: el celular es la fuente de verdad y la nube guarda una copia.
 * La app funciona sin internet; los cambios esperan en `sync_pendientes` hasta que se puedan subir.
 * Bajar de la nube solo se hace a pedido (al cambiar de celular) y reemplaza los datos locales.
 */
import { guardarAjuste, obtenerAjuste } from '../db/ajustesRepo';
import { restaurarRespaldo } from '../db/respaldoRepo';
import {
  TABLAS_NUBE,
  leerFilas,
  leerPendientes,
  limpiarPendientes,
  marcarTodoPendiente,
  quitarPendientes,
  type FilaNube,
  type TablaNube,
} from '../db/syncRepo';
import type { Db } from '../db/tipos';
import { FORMATO_RESPALDO, VERSION_RESPALDO, validarRespaldo } from '../lib/respaldo';

/** Operaciones que se hacen en la nube. En la app las implementa Supabase; en las pruebas, un objeto en memoria. */
export interface Remoto {
  /** Crea o actualiza filas (por id). */
  subir(tabla: TablaNube, filas: FilaNube[]): Promise<void>;
  borrar(tabla: TablaNube, ids: number[]): Promise<void>;
  /** Todas las filas de la tabla, ordenadas por id. */
  descargar(tabla: TablaNube): Promise<Record<string, unknown>[]>;
  /** ¿Hay algo guardado en la nube para esta cuenta? */
  tieneDatos(): Promise<boolean>;
  /** Borra todo lo de esta cuenta en la nube. */
  vaciar(): Promise<void>;
}

/** Cuántos cambios se suben por vuelta. */
const LOTE = 500;

const NUBE_USUARIO = 'nube_usuario';
const ULTIMA_SINCRONIZACION = 'ultima_sincronizacion';

/** Id de la cuenta con la que este celular quedó vinculado (null si con ninguna). */
export function cuentaVinculada(db: Db): Promise<string | null> {
  return obtenerAjuste(db, NUBE_USUARIO);
}

export function desvincular(db: Db): Promise<void> {
  return guardarAjuste(db, NUBE_USUARIO, null);
}

/** Fecha-hora ISO de la última sincronización completa. */
export function ultimaSincronizacion(db: Db): Promise<string | null> {
  return obtenerAjuste(db, ULTIMA_SINCRONIZACION);
}

/**
 * Sube todos los cambios pendientes. Borra primero (de hijos a padres)
 * y después crea o actualiza (de padres a hijos). Devuelve cuántos cambios subió.
 */
export async function sincronizar(db: Db, remoto: Remoto, ahora: () => Date = () => new Date()): Promise<number> {
  let total = 0;
  for (;;) {
    const lote = await leerPendientes(db, LOTE);
    if (lote.length === 0) break;

    const porTabla = (tabla: TablaNube, borrado: 0 | 1) =>
      lote.filter((p) => p.tabla === tabla && p.borrado === borrado).map((p) => p.fila_id);

    for (const tabla of [...TABLAS_NUBE].reverse()) {
      const ids = porTabla(tabla, 1);
      if (ids.length) await remoto.borrar(tabla, ids);
    }
    for (const tabla of TABLAS_NUBE) {
      const filas = await leerFilas(db, tabla, porTabla(tabla, 0));
      if (filas.length) await remoto.subir(tabla, filas);
    }

    await quitarPendientes(db, lote);
    total += lote.length;
    if (lote.length < LOTE) break;
  }
  await guardarAjuste(db, ULTIMA_SINCRONIZACION, ahora().toISOString());
  return total;
}

/**
 * Vincula este celular con la cuenta. Si la nube está vacía, sube todo lo del celular.
 * Si ya tiene datos devuelve 'elegir': la persona decide si descargar o reemplazar la nube.
 */
export async function vincular(db: Db, remoto: Remoto, usuarioId: string): Promise<'vinculado' | 'elegir'> {
  if ((await cuentaVinculada(db)) === usuarioId) return 'vinculado';
  if (await remoto.tieneDatos()) return 'elegir';
  await marcarTodoPendiente(db);
  await guardarAjuste(db, NUBE_USUARIO, usuarioId);
  await sincronizar(db, remoto);
  return 'vinculado';
}

/** Reemplaza lo de la nube por lo de este celular. */
export async function subirTodo(db: Db, remoto: Remoto, usuarioId: string): Promise<void> {
  await remoto.vaciar();
  await marcarTodoPendiente(db);
  await guardarAjuste(db, NUBE_USUARIO, usuarioId);
  await sincronizar(db, remoto);
}

/**
 * Reemplaza los datos de este celular por los de la nube.
 * Antes se suben los cambios pendientes de esta misma cuenta para no perder nada.
 */
export async function descargarTodo(db: Db, remoto: Remoto, usuarioId: string): Promise<void> {
  if ((await cuentaVinculada(db)) === usuarioId) await sincronizar(db, remoto);

  const [categorias, productos, pedidos, pedido_items] = await Promise.all(
    TABLAS_NUBE.map((tabla) => remoto.descargar(tabla)),
  );
  const respaldo = validarRespaldo({
    formato: FORMATO_RESPALDO,
    version: VERSION_RESPALDO,
    exportado_en: new Date().toISOString(),
    categorias,
    productos,
    pedidos,
    pedido_items,
  });
  await restaurarRespaldo(db, respaldo);
  await limpiarPendientes(db);
  await guardarAjuste(db, NUBE_USUARIO, usuarioId);
  await guardarAjuste(db, ULTIMA_SINCRONIZACION, new Date().toISOString());
}
