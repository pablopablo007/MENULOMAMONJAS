import { StyleSheet, Text, View } from 'react-native';

import { formatoDinero } from '../lib/dinero';
import { colores, espacio, letra } from '../theme';
import type { PedidoItem } from '../types';

/** Lista de ítems de un pedido: "2 × Seco de pollo", nota y subtotal. */
export function DetalleItems({ items, tachado = false }: { items: PedidoItem[]; tachado?: boolean }) {
  return (
    <View style={estilos.lista}>
      {items.map((item) => (
        <View key={item.id} style={estilos.fila}>
          <View style={estilos.info}>
            <Text style={[estilos.nombre, tachado && estilos.tachado]}>
              {item.cantidad} × {item.nombre_producto}
            </Text>
            {item.nota ? <Text style={estilos.nota}>Nota: {item.nota}</Text> : null}
          </View>
          <Text style={[estilos.subtotal, tachado && estilos.tachado]}>{formatoDinero(item.subtotal)}</Text>
        </View>
      ))}
    </View>
  );
}

const estilos = StyleSheet.create({
  lista: {
    gap: espacio.sm,
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: espacio.md,
  },
  info: {
    flex: 1,
  },
  nombre: {
    fontSize: letra.normal,
    color: colores.texto,
  },
  nota: {
    fontSize: letra.pequena,
    color: colores.acentoOscuro,
    marginTop: 2,
  },
  subtotal: {
    fontSize: letra.normal,
    fontWeight: '700',
    color: colores.texto,
  },
  tachado: {
    textDecorationLine: 'line-through',
    color: colores.textoTenue,
  },
});
