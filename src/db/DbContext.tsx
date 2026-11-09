import * as SplashScreen from 'expo-splash-screen';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';

import { Boton } from '../components/Boton';
import { mensajeDeError } from '../lib/errores';
import { colores, espacio, letra } from '../theme';
import { obtenerDb } from './conexion';
import type { Db } from './tipos';

const DbContexto = createContext<Db | null>(null);

// La pantalla de arranque (con el logo) se queda hasta que la base de datos esté lista.
void SplashScreen.preventAutoHideAsync().catch(() => undefined);

/** Logo del local: se muestra mientras se abre la base de datos (igual que la pantalla de arranque). */
const LOGO = require('../../assets/logo-local.png');

/** Abre la base de datos local al iniciar la app y la comparte con todas las pantallas. */
export function ProveedorDb({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<Db | null>(null);
  const [error, setError] = useState<string | null>(null);

  const abrir = useCallback(() => {
    setError(null);
    obtenerDb()
      .then(setDb)
      .catch((e: unknown) => setError(mensajeDeError(e)));
  }, []);

  useEffect(() => {
    abrir();
  }, [abrir]);

  useEffect(() => {
    if (db || error) void SplashScreen.hideAsync().catch(() => undefined);
  }, [db, error]);

  if (error) {
    return (
      <View style={estilos.centro}>
        <Text style={estilos.titulo}>No se pudo abrir la base de datos</Text>
        <Text style={estilos.mensaje}>{error}</Text>
        <Boton titulo="Reintentar" icono="refresh" onPress={abrir} />
      </View>
    );
  }

  if (!db) {
    return (
      <View style={[estilos.centro, estilos.cargando]}>
        <Image
          source={LOGO}
          style={estilos.logo}
          resizeMode="contain"
          accessibilityLabel="Mirador Loma de Monjas"
        />
        <ActivityIndicator size="large" color={colores.acento} />
        <Text style={estilos.mensaje}>Preparando datos…</Text>
      </View>
    );
  }

  return <DbContexto.Provider value={db}>{children}</DbContexto.Provider>;
}

export function useDb(): Db {
  const db = useContext(DbContexto);
  if (!db) throw new Error('useDb debe usarse dentro de <ProveedorDb>.');
  return db;
}

const estilos = StyleSheet.create({
  centro: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: espacio.md,
    padding: espacio.xl,
    backgroundColor: colores.fondo,
  },
  cargando: {
    backgroundColor: colores.tarjeta,
  },
  logo: {
    width: 260,
    height: 260,
  },
  titulo: {
    fontSize: letra.grande,
    fontWeight: '800',
    color: colores.texto,
    textAlign: 'center',
  },
  mensaje: {
    fontSize: letra.normal,
    color: colores.textoSecundario,
    textAlign: 'center',
  },
});
