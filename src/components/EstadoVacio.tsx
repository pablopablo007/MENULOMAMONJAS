import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colores, espacio, letra } from '../theme';
import type { NombreIcono } from './Boton';

interface Props {
  icono: NombreIcono;
  titulo: string;
  mensaje?: string;
  children?: ReactNode;
}

/** Mensaje para cuando no hay datos que mostrar. */
export function EstadoVacio({ icono, titulo, mensaje, children }: Props) {
  return (
    <View style={estilos.contenedor} accessibilityRole="summary">
      <Ionicons name={icono} size={40} color={colores.textoTenue} />
      <Text style={estilos.titulo}>{titulo}</Text>
      {mensaje ? <Text style={estilos.mensaje}>{mensaje}</Text> : null}
      {children}
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: espacio.xl,
    paddingHorizontal: espacio.lg,
    gap: espacio.sm,
  },
  titulo: {
    fontSize: letra.media,
    fontWeight: '700',
    color: colores.textoSecundario,
    textAlign: 'center',
  },
  mensaje: {
    fontSize: letra.pequena,
    color: colores.textoTenue,
    textAlign: 'center',
    lineHeight: 20,
  },
});
