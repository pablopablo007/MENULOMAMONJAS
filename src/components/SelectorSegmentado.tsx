import { Pressable, StyleSheet, Text, View } from 'react-native';

import { TOQUE_MINIMO, colores, espacio, letra, radio } from '../theme';

interface Opcion<T extends string> {
  valor: T;
  etiqueta: string;
}

interface Props<T extends string> {
  opciones: Opcion<T>[];
  valor: T;
  onCambiar: (valor: T) => void;
}

/** Selector segmentado tipo "Día | Semana | Mes". */
export function SelectorSegmentado<T extends string>({ opciones, valor, onCambiar }: Props<T>) {
  return (
    <View style={estilos.contenedor} accessibilityRole="tablist">
      {opciones.map((o) => {
        const activo = o.valor === valor;
        return (
          <Pressable
            key={o.valor}
            onPress={() => onCambiar(o.valor)}
            accessibilityRole="tab"
            accessibilityState={{ selected: activo }}
            style={[estilos.segmento, activo && estilos.activo]}
          >
            <Text style={[estilos.texto, activo && estilos.textoActivo]}>{o.etiqueta}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    flexDirection: 'row',
    backgroundColor: colores.borde,
    borderRadius: radio.md,
    padding: 3,
    gap: 3,
  },
  segmento: {
    flex: 1,
    minHeight: TOQUE_MINIMO,
    borderRadius: radio.md - 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: espacio.sm,
  },
  activo: {
    backgroundColor: colores.tarjeta,
  },
  texto: {
    fontSize: letra.normal,
    fontWeight: '600',
    color: colores.textoSecundario,
  },
  textoActivo: {
    color: colores.acento,
    fontWeight: '800',
  },
});
