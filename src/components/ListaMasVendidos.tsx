import { StyleSheet, Text, View } from 'react-native';

import { formatoDinero } from '../lib/dinero';
import { colores, espacio, letra, radio } from '../theme';
import type { ProductoVendido } from '../types';

/** Productos más vendidos: posición, nombre, cantidad y total, de mayor a menor. */
export function ListaMasVendidos({ productos, vacio }: { productos: ProductoVendido[]; vacio: string }) {
  if (productos.length === 0) {
    return <Text style={estilos.vacio}>{vacio}</Text>;
  }
  return (
    <View style={estilos.lista}>
      {productos.map((p, i) => (
        <View
          key={p.producto_id}
          style={[estilos.fila, i < productos.length - 1 && estilos.separador]}
          accessible
          accessibilityLabel={`${i + 1}. ${p.nombre}: ${p.cantidad} vendidos, ${formatoDinero(p.total)}`}
        >
          <Text style={[estilos.posicion, i < 3 && estilos.podio]}>{i + 1}</Text>
          <Text style={estilos.nombre} numberOfLines={2}>
            {p.nombre}
          </Text>
          <Text style={estilos.cantidad}>× {p.cantidad}</Text>
          <Text style={estilos.total}>{formatoDinero(p.total)}</Text>
        </View>
      ))}
    </View>
  );
}

const estilos = StyleSheet.create({
  lista: {
    backgroundColor: colores.tarjeta,
    borderRadius: radio.lg,
    paddingHorizontal: espacio.md,
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.sm,
    paddingVertical: espacio.md,
  },
  separador: {
    borderBottomWidth: 1,
    borderBottomColor: colores.borde,
  },
  posicion: {
    width: 28,
    height: 28,
    borderRadius: 14,
    textAlign: 'center',
    textAlignVertical: 'center',
    lineHeight: 28,
    fontSize: letra.pequena,
    fontWeight: '800',
    color: colores.textoSecundario,
    backgroundColor: colores.fondo,
    overflow: 'hidden',
  },
  podio: {
    backgroundColor: colores.acentoSuave,
    color: colores.acentoOscuro,
  },
  nombre: {
    flex: 1,
    fontSize: letra.normal,
    color: colores.texto,
  },
  cantidad: {
    fontSize: letra.normal,
    fontWeight: '700',
    color: colores.textoSecundario,
  },
  total: {
    minWidth: 76,
    textAlign: 'right',
    fontSize: letra.normal,
    fontWeight: '700',
    color: colores.texto,
  },
  vacio: {
    fontSize: letra.pequena,
    color: colores.textoTenue,
    paddingVertical: espacio.sm,
  },
});
