import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { TOQUE_MINIMO, colores, letra, radio } from '../theme';

interface Props {
  cantidad: number;
  onMas: () => void;
  onMenos: () => void;
  nombre: string;
}

/** Control "− cantidad +" para cambiar la cantidad de un producto en el pedido. */
export function Contador({ cantidad, onMas, onMenos, nombre }: Props) {
  return (
    <View style={estilos.contenedor}>
      <Pressable
        onPress={onMenos}
        hitSlop={4}
        accessibilityRole="button"
        accessibilityLabel={cantidad === 1 ? `Quitar ${nombre}` : `Restar uno de ${nombre}`}
        style={({ pressed }) => [estilos.boton, pressed && estilos.presionado]}
      >
        <Ionicons name={cantidad === 1 ? 'trash-outline' : 'remove'} size={22} color={colores.acento} />
      </Pressable>
      <Text style={estilos.cantidad} accessibilityLabel={`${cantidad} unidades`}>
        {cantidad}
      </Text>
      <Pressable
        onPress={onMas}
        hitSlop={4}
        accessibilityRole="button"
        accessibilityLabel={`Agregar uno más de ${nombre}`}
        style={({ pressed }) => [estilos.boton, estilos.botonMas, pressed && estilos.presionado]}
      >
        <Ionicons name="add" size={24} color={colores.sobreAcento} />
      </Pressable>
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colores.acentoSuave,
    borderRadius: radio.pill,
  },
  boton: {
    width: TOQUE_MINIMO,
    height: TOQUE_MINIMO,
    borderRadius: radio.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botonMas: {
    backgroundColor: colores.acento,
  },
  presionado: {
    opacity: 0.7,
  },
  cantidad: {
    minWidth: 32,
    textAlign: 'center',
    fontSize: letra.media,
    fontWeight: '800',
    color: colores.acentoOscuro,
  },
});
