import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Boton } from '../components/Boton';
import { mensajeDeError } from '../lib/errores';
import { colores, espacio, letra } from '../theme';
import { obtenerDb } from './conexion';
import type { Db } from './tipos';

const DbContexto = createContext<Db | null>(null);

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
      <View style={estilos.centro}>
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
