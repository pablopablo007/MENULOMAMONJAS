import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { TOQUE_MINIMO, colores, espacio, letra, radio } from '../theme';

interface Props extends TextInputProps {
  etiqueta?: string;
  error?: string | null;
  ayuda?: string;
}

/** Campo de texto con etiqueta, ayuda y mensaje de error. */
export function CampoTexto({ etiqueta, error, ayuda, style, multiline, ...resto }: Props) {
  return (
    <View style={estilos.contenedor}>
      {etiqueta ? <Text style={estilos.etiqueta}>{etiqueta}</Text> : null}
      <TextInput
        placeholderTextColor={colores.textoTenue}
        multiline={multiline}
        accessibilityLabel={etiqueta}
        style={[estilos.campo, multiline && estilos.multilinea, error ? estilos.campoError : null, style]}
        {...resto}
      />
      {error ? (
        <Text style={estilos.error} accessibilityRole="alert">
          {error}
        </Text>
      ) : ayuda ? (
        <Text style={estilos.ayuda}>{ayuda}</Text>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    gap: espacio.xs,
  },
  etiqueta: {
    fontSize: letra.pequena,
    fontWeight: '700',
    color: colores.textoSecundario,
  },
  campo: {
    minHeight: TOQUE_MINIMO + 4,
    borderWidth: 1.5,
    borderColor: colores.bordeFuerte,
    borderRadius: radio.md,
    backgroundColor: colores.tarjeta,
    paddingHorizontal: espacio.md,
    fontSize: letra.normal,
    color: colores.texto,
  },
  multilinea: {
    minHeight: 84,
    paddingTop: espacio.md,
    textAlignVertical: 'top',
  },
  campoError: {
    borderColor: colores.peligro,
  },
  error: {
    fontSize: letra.pequena,
    color: colores.peligro,
    fontWeight: '600',
  },
  ayuda: {
    fontSize: letra.pequena,
    color: colores.textoTenue,
  },
});
