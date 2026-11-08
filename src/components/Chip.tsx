import { Pressable, StyleSheet, Text } from 'react-native';

import { TOQUE_MINIMO, colores, espacio, letra, radio } from '../theme';

interface Props {
  etiqueta: string;
  seleccionado?: boolean;
  onPress: () => void;
}

export function Chip({ etiqueta, seleccionado = false, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: seleccionado }}
      style={({ pressed }) => [
        estilos.chip,
        seleccionado && estilos.seleccionado,
        pressed && { opacity: 0.8 },
      ]}
    >
      <Text style={[estilos.texto, seleccionado && estilos.textoSeleccionado]} numberOfLines={1}>
        {etiqueta}
      </Text>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  chip: {
    minHeight: TOQUE_MINIMO,
    paddingHorizontal: espacio.lg,
    borderRadius: radio.pill,
    borderWidth: 1.5,
    borderColor: colores.bordeFuerte,
    backgroundColor: colores.tarjeta,
    alignItems: 'center',
    justifyContent: 'center',
  },
  seleccionado: {
    backgroundColor: colores.acento,
    borderColor: colores.acento,
  },
  texto: {
    fontSize: letra.pequena + 1,
    fontWeight: '600',
    color: colores.textoSecundario,
  },
  textoSeleccionado: {
    color: colores.sobreAcento,
  },
});
