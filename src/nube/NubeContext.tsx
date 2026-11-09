import type { Session } from '@supabase/supabase-js';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AppState } from 'react-native';

import { useDb } from '../db/DbContext';
import { contarPendientes } from '../db/syncRepo';
import { mensajeDeError } from '../lib/errores';
import {
  cuentaVinculada,
  descargarTodo,
  sincronizar,
  subirTodo,
  ultimaSincronizacion,
  vincular,
} from './sincronizacion';
import { crearRemoto, mensajeNube, supabase } from './supabase';

/** Cada cuánto se revisa si hay cambios por subir. */
const INTERVALO_MS = 15_000;

/**
 * - sin-configurar: faltan la URL y la clave de Supabase.
 * - sin-sesion: hay nube pero no se ha iniciado sesión en este celular.
 * - preparando: sesión iniciada, revisando si la nube ya tiene datos.
 * - elegir: la nube ya tiene datos y este celular todavía no está vinculado.
 * - conectada: los cambios se suben solos.
 */
export type EstadoNube = 'sin-configurar' | 'sin-sesion' | 'preparando' | 'elegir' | 'conectada';

interface ContextoNube {
  estado: EstadoNube;
  correo: string | null;
  /** Cambios del celular que todavía no están en la nube. */
  pendientes: number;
  /** Fecha-hora ISO de la última sincronización. */
  ultima: string | null;
  sincronizando: boolean;
  /** Último error al sincronizar (null si salió bien). */
  error: string | null;
  iniciarSesion(correo: string, clave: string): Promise<void>;
  /**
   * Crea la cuenta del local. Devuelve 'sesion' si quedó iniciada de una vez,
   * o 'confirmar' si Supabase pide confirmar el correo primero.
   */
  crearCuenta(correo: string, clave: string): Promise<'sesion' | 'confirmar'>;
  cerrarSesion(): Promise<void>;
  sincronizarAhora(): Promise<void>;
  /** Reemplaza los datos del celular por los de la nube. */
  descargar(): Promise<void>;
  /** Reemplaza los datos de la nube por los del celular. */
  reemplazarNube(): Promise<void>;
}

const Contexto = createContext<ContextoNube | null>(null);

/** Mantiene la sesión de Supabase y sube los cambios del celular en segundo plano. */
export function ProveedorNube({ children }: { children: ReactNode }) {
  const db = useDb();
  const [sesion, setSesion] = useState<Session | null>(null);
  const [vinculo, setVinculo] = useState<'revisando' | 'elegir' | 'listo'>('revisando');
  const [pendientes, setPendientes] = useState(0);
  const [ultima, setUltima] = useState<string | null>(null);
  const [sincronizando, setSincronizando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const enCurso = useRef<Promise<void> | null>(null);

  const usuarioId = sesion?.user.id ?? null;
  const remoto = useMemo(() => (supabase && usuarioId ? crearRemoto(supabase, usuarioId) : null), [usuarioId]);

  const refrescar = useCallback(async () => {
    const [n, fecha] = await Promise.all([contarPendientes(db), ultimaSincronizacion(db)]);
    setPendientes(n);
    setUltima(fecha);
  }, [db]);

  // Sesión guardada y cambios de sesión.
  useEffect(() => {
    void refrescar();
    if (!supabase) return;
    void supabase.auth.getSession().then(({ data }) => setSesion(data.session));
    const { data } = supabase.auth.onAuthStateChange((_evento, nueva) => setSesion(nueva));
    return () => data.subscription.unsubscribe();
  }, [refrescar]);

  // Al iniciar sesión: ¿este celular ya está vinculado con la cuenta?
  useEffect(() => {
    if (!remoto || !usuarioId) return;
    let vigente = true;
    setVinculo('revisando');
    cuentaVinculada(db)
      .then(async (id) => {
        if (id === usuarioId) return 'vinculado' as const;
        return vincular(db, remoto, usuarioId);
      })
      .then((resultado) => {
        if (!vigente) return;
        setVinculo(resultado === 'elegir' ? 'elegir' : 'listo');
        setError(null);
      })
      .catch((e: unknown) => {
        if (vigente) setError(mensajeDeError(e));
      })
      .finally(() => void refrescar());
    return () => {
      vigente = false;
    };
  }, [db, remoto, usuarioId, refrescar]);

  const conectada = !!remoto && vinculo === 'listo';

  const sincronizarAhora = useCallback(async () => {
    if (!remoto || !conectada) return;
    if (enCurso.current) return enCurso.current;
    setSincronizando(true);
    enCurso.current = sincronizar(db, remoto)
      .then(() => setError(null))
      .catch((e: unknown) => setError(mensajeDeError(e)))
      .finally(() => {
        enCurso.current = null;
        setSincronizando(false);
        void refrescar();
      });
    return enCurso.current;
  }, [db, remoto, conectada, refrescar]);

  // Sincronización automática: al conectar, cada pocos segundos si hay cambios y al volver a la app.
  useEffect(() => {
    if (!conectada || !supabase) return;
    const cliente = supabase;
    void sincronizarAhora();
    const intervalo = setInterval(() => {
      contarPendientes(db)
        .then((n) => {
          setPendientes(n);
          if (n > 0) void sincronizarAhora();
        })
        .catch(() => undefined);
    }, INTERVALO_MS);
    const suscripcion = AppState.addEventListener('change', (estado) => {
      if (estado === 'active') {
        void cliente.auth.startAutoRefresh();
        void sincronizarAhora();
      } else {
        void cliente.auth.stopAutoRefresh();
      }
    });
    return () => {
      clearInterval(intervalo);
      suscripcion.remove();
    };
  }, [db, conectada, sincronizarAhora]);

  const iniciarSesion = useCallback(async (correo: string, clave: string) => {
    if (!supabase) throw new Error('La nube no está configurada.');
    const { error: e } = await supabase.auth.signInWithPassword({ email: correo.trim(), password: clave });
    if (e) throw new Error(mensajeNube(e));
  }, []);

  const crearCuenta = useCallback(async (correo: string, clave: string) => {
    if (!supabase) throw new Error('La nube no está configurada.');
    const { data, error: e } = await supabase.auth.signUp({ email: correo.trim(), password: clave });
    if (e) throw new Error(mensajeNube(e));
    // Si el correo ya estaba registrado, Supabase no da error pero devuelve un usuario sin identidades.
    if (data.user && data.user.identities?.length === 0) {
      throw new Error('Ya existe una cuenta con ese correo. Usa «Iniciar sesión».');
    }
    return data.session ? ('sesion' as const) : ('confirmar' as const);
  }, []);

  const cerrarSesion = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setError(null);
  }, []);

  const descargar = useCallback(async () => {
    if (!remoto || !usuarioId) throw new Error('Primero inicia sesión.');
    await descargarTodo(db, remoto, usuarioId);
    setVinculo('listo');
    setError(null);
    await refrescar();
  }, [db, remoto, usuarioId, refrescar]);

  const reemplazarNube = useCallback(async () => {
    if (!remoto || !usuarioId) throw new Error('Primero inicia sesión.');
    await subirTodo(db, remoto, usuarioId);
    setVinculo('listo');
    setError(null);
    await refrescar();
  }, [db, remoto, usuarioId, refrescar]);

  const estado: EstadoNube = !supabase
    ? 'sin-configurar'
    : !sesion
      ? 'sin-sesion'
      : vinculo === 'revisando'
        ? 'preparando'
        : vinculo === 'elegir'
          ? 'elegir'
          : 'conectada';

  const valor = useMemo<ContextoNube>(
    () => ({
      estado,
      correo: sesion?.user.email ?? null,
      pendientes,
      ultima,
      sincronizando,
      error,
      iniciarSesion,
      crearCuenta,
      cerrarSesion,
      sincronizarAhora,
      descargar,
      reemplazarNube,
    }),
    [estado, sesion, pendientes, ultima, sincronizando, error, iniciarSesion, crearCuenta, cerrarSesion, sincronizarAhora, descargar, reemplazarNube],
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useNube(): ContextoNube {
  const nube = useContext(Contexto);
  if (!nube) throw new Error('useNube debe usarse dentro de <ProveedorNube>.');
  return nube;
}
