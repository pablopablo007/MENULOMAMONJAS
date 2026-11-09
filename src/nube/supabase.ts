/**
 * Cliente de Supabase. La URL y la clave pública (anon) vienen de las variables
 * EXPO_PUBLIC_SUPABASE_URL y EXPO_PUBLIC_SUPABASE_ANON_KEY (archivo .env.local o EAS).
 * Si no están, la app funciona igual pero sin nube.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { TABLAS_NUBE, type FilaNube, type TablaNube } from '../db/syncRepo';
import type { Remoto } from './sincronizacion';

const URL_SUPABASE = process.env.EXPO_PUBLIC_SUPABASE_URL;
const CLAVE_ANON = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

/** Filas por petición (subir y descargar). */
const TAMANO_PAGINA = 500;

function crearCliente(): SupabaseClient | null {
  if (!URL_SUPABASE || !CLAVE_ANON) return null;
  // Se cargan solo si hay nube: URL completa para supabase-js y localStorage
  // (guardado en SQLite) para que la sesión siga iniciada al cerrar la app.
  require('react-native-url-polyfill/auto');
  require('expo-sqlite/localStorage/install');
  return createClient(URL_SUPABASE, CLAVE_ANON, {
    auth: {
      storage: globalThis.localStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
}

/** null si la nube no está configurada. */
export const supabase = crearCliente();

/** Traduce los errores más comunes de Supabase o de la red. */
export function mensajeNube(error: { message?: string } | null | undefined): string {
  const mensaje = error?.message ?? '';
  if (/invalid login credentials/i.test(mensaje)) return 'Correo o contraseña incorrectos.';
  if (/email not confirmed/i.test(mensaje)) {
    return 'Falta confirmar el correo: abre el enlace que llegó a tu correo y vuelve a intentar.';
  }
  if (/already registered|already exists/i.test(mensaje)) return 'Ya existe una cuenta con ese correo. Usa «Iniciar sesión».';
  if (/password should be at least|weak password|password.*characters/i.test(mensaje)) {
    return 'La contraseña es muy corta o débil: usa al menos 6 caracteres.';
  }
  if (/invalid format|unable to validate email|email address .* is invalid/i.test(mensaje)) return 'El correo no es válido.';
  if (/not authorized/i.test(mensaje)) {
    return 'Supabase no puede enviar el correo de confirmación a esa dirección. Desactiva «Confirm email» en Supabase (Authentication → Sign In / Providers → Email).';
  }
  if (/rate limit/i.test(mensaje)) return 'Demasiados intentos seguidos. Espera unos minutos y vuelve a intentar.';
  if (/signups? not allowed|signup.*disabled/i.test(mensaje)) return 'El registro de cuentas nuevas está desactivado en Supabase.';
  if (/network request failed|fetch failed|failed to fetch|network/i.test(mensaje)) {
    return 'Sin conexión a internet. Se intentará de nuevo más tarde.';
  }
  if (/relation .* does not exist|could not find the table/i.test(mensaje)) {
    return 'Faltan las tablas en Supabase: ejecuta el archivo supabase/esquema.sql en el SQL Editor.';
  }
  return mensaje || 'No se pudo conectar con la nube.';
}

function fallar(error: { message?: string } | null): void {
  if (error) throw new Error(mensajeNube(error));
}

/** Operaciones en la nube para la cuenta indicada. Cada fila lleva el user_id de la cuenta. */
export function crearRemoto(cliente: SupabaseClient, usuarioId: string): Remoto {
  return {
    async subir(tabla: TablaNube, filas: FilaNube[]) {
      for (let i = 0; i < filas.length; i += TAMANO_PAGINA) {
        const pagina = filas.slice(i, i + TAMANO_PAGINA).map((f) => ({ ...f, user_id: usuarioId }));
        const { error } = await cliente.from(tabla).upsert(pagina, { onConflict: 'user_id,id' });
        fallar(error);
      }
    },
    async borrar(tabla: TablaNube, ids: number[]) {
      for (let i = 0; i < ids.length; i += TAMANO_PAGINA) {
        const { error } = await cliente
          .from(tabla)
          .delete()
          .eq('user_id', usuarioId)
          .in('id', ids.slice(i, i + TAMANO_PAGINA));
        fallar(error);
      }
    },
    async descargar(tabla: TablaNube) {
      const filas: Record<string, unknown>[] = [];
      for (let desde = 0; ; desde += TAMANO_PAGINA) {
        const { data, error } = await cliente
          .from(tabla)
          .select('*')
          .eq('user_id', usuarioId)
          .order('id')
          .range(desde, desde + TAMANO_PAGINA - 1);
        fallar(error);
        filas.push(...(data ?? []));
        if (!data || data.length < TAMANO_PAGINA) break;
      }
      return filas;
    },
    async tieneDatos() {
      for (const tabla of TABLAS_NUBE) {
        const { count, error } = await cliente
          .from(tabla)
          .select('id', { count: 'exact', head: true })
          .eq('user_id', usuarioId);
        fallar(error);
        if ((count ?? 0) > 0) return true;
      }
      return false;
    },
    async vaciar() {
      for (const tabla of [...TABLAS_NUBE].reverse()) {
        const { error } = await cliente.from(tabla).delete().eq('user_id', usuarioId);
        fallar(error);
      }
    },
  };
}
