import { Ionicons } from '@expo/vector-icons';
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { formatoDinero } from '../lib/dinero';
import { TOQUE_MINIMO, colores, espacio, letra, radio } from '../theme';
import type { ProductoConCategoria } from '../types';
import { Contador } from './Contador';

interface Props {
  producto: ProductoConCategoria;
  cantidad: number;
  nota: string;
  onAgregar: (producto: ProductoConCategoria) => void;
  onRestar: (productoId: number) => void;
  onNota: (producto: ProductoConCategoria) => void;
}

/** Producto en la lista de "Tomar pedido": botón "+" o contador "− n +". */
export const FilaProducto = memo(function FilaProducto({
  producto,
  cantidad,
  nota,
  onAgregar,
  onRestar,
  onNota,
}: Props) {
  const enPedido = cantidad > 0;
  return (
    <View style={[estilos.fila, enPedido && estilos.filaActiva]}>
      <Pressable
        style={({ pressed }) => [estilos.info, pressed && { opacity: 0.7 }]}
        onPress={() => onNota(producto)}
        onLongPress={() => onNota(producto)}
        delayLongPress={350}
        accessibilityRole="button"
        accessibilityLabel={`${producto.nombre}, ${formatoDinero(producto.precio)}`}
        accessibilityHint="Abre la nota para este producto"
      >
        <Text style={estilos.nombre} numberOfLines={2}>
          {producto.nombre}
        </Text>
        {producto.descripcion ? (
          <Text style={estilos.descripcion} numberOfLines={1}>
            {producto.descripcion}
          </Text>
        ) : null}
        <Text style={estilos.precio}>{formatoDinero(producto.precio)}</Text>
        {nota ? (
          <View style={estilos.nota}>
            <Ionicons name="create-outline" size={16} color={colores.acentoOscuro} />
            <Text style={estilos.textoNota} numberOfLines={2}>
              {nota}
            </Text>
          </View>
        ) : null}
      </Pressable>

      {enPedido ? (
        <Contador
          cantidad={cantidad}
          nombre={producto.nombre}
          onMas={() => onAgregar(producto)}
          onMenos={() => onRestar(producto.id)}
        />
      ) : (
        <Pressable
          onPress={() => onAgregar(producto)}
          accessibilityRole="button"
          accessibilityLabel={`Agregar ${producto.nombre}`}
          hitSlop={6}
          style={({ pressed }) => [estilos.mas, pressed && { opacity: 0.75 }]}
        >
          <Ionicons name="add" size={28} color={colores.sobreAcento} />
        </Pressable>
      )}
    </View>
  );
});

const estilos = StyleSheet.create({
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colores.tarjeta,
    borderRadius: radio.lg,
    paddingVertical: espacio.md,
    paddingLeft: espacio.lg,
    paddingRight: espacio.md,
    gap: espacio.md,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  filaActiva: {
    borderColor: colores.acento,
  },
  info: {
    flex: 1,
    gap: 2,
    minHeight: TOQUE_MINIMO,
    justifyContent: 'center',
  },
  nombre: {
    fontSize: letra.normal + 1,
    fontWeight: '700',
    color: colores.texto,
  },
  descripcion: {
    fontSize: letra.pequena,
    color: colores.textoTenue,
  },
  precio: {
    fontSize: letra.normal,
    fontWeight: '700',
    color: colores.acentoOscuro,
    marginTop: 2,
  },
  nota: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.xs,
    marginTop: espacio.xs,
    alignSelf: 'flex-start',
    backgroundColor: colores.acentoSuave,
    borderRadius: radio.sm,
    paddingHorizontal: espacio.sm,
    paddingVertical: 2,
  },
  textoNota: {
    fontSize: letra.pequena,
    color: colores.acentoOscuro,
    fontWeight: '600',
    flexShrink: 1,
  },
  mas: {
    width: TOQUE_MINIMO + 4,
    height: TOQUE_MINIMO + 4,
    borderRadius: radio.pill,
    backgroundColor: colores.acento,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
