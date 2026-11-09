import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { TOQUE_MINIMO, colores, espacio, letra, radio } from '../theme';

interface Props {
  /** "Noviembre 2026", "2026"... */
  titulo: string;
  /** Lo que se mueve con las flechas, para el lector de pantalla: "Mes", "Año". */
  unidad: string;
  onCambiar: (delta: -1 | 1) => void;
  onHoy: () => void;
}

/** Cabecera de los calendarios: flechas anterior / siguiente, título y botón Hoy. */
export function CabeceraNavegacion({ titulo, unidad, onCambiar, onHoy }: Props) {
  return (
    <View style={estilos.cabecera}>
      <Pressable
        onPress={() => onCambiar(-1)}
        style={estilos.flecha}
        accessibilityRole="button"
        accessibilityLabel={`${unidad} anterior`}
      >
        <Ionicons name="chevron-back" size={26} color={colores.acento} />
      </Pressable>
      <Text style={estilos.titulo} accessibilityRole="header">
        {titulo}
      </Text>
      <Pressable
        onPress={() => onCambiar(1)}
        style={estilos.flecha}
        accessibilityRole="button"
        accessibilityLabel={`${unidad} siguiente`}
      >
        <Ionicons name="chevron-forward" size={26} color={colores.acento} />
      </Pressable>
      <Pressable
        onPress={onHoy}
        style={({ pressed }) => [estilos.hoy, pressed && { opacity: 0.8 }]}
        accessibilityRole="button"
        accessibilityLabel="Ir a hoy"
      >
        <Text style={estilos.hoyTexto}>Hoy</Text>
      </Pressable>
    </View>
  );
}

const estilos = StyleSheet.create({
  cabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: espacio.xs,
  },
  flecha: {
    width: TOQUE_MINIMO,
    height: TOQUE_MINIMO,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titulo: {
    flex: 1,
    textAlign: 'center',
    fontSize: letra.media,
    fontWeight: '800',
    color: colores.texto,
  },
  hoy: {
    minHeight: TOQUE_MINIMO - 6,
    paddingHorizontal: espacio.md,
    marginLeft: espacio.xs,
    borderRadius: radio.pill,
    backgroundColor: colores.acentoSuave,
    justifyContent: 'center',
  },
  hoyTexto: {
    fontSize: letra.pequena,
    fontWeight: '800',
    color: colores.acentoOscuro,
  },
});
