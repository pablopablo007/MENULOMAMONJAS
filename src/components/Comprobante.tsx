import { Ionicons } from '@expo/vector-icons';
import { Alert, ScrollView, Share, StyleSheet, Text, View } from 'react-native';

import { formatoDinero } from '../lib/dinero';
import { mensajeDeError } from '../lib/errores';
import { formatoFechaLarga } from '../lib/fechas';
import { textoPedido, tituloPedido } from '../lib/textoPedido';
import { colores, espacio, letra } from '../theme';
import type { PedidoConItems } from '../types';
import { Boton } from './Boton';
import { DetalleItems } from './DetalleItems';
import { Tarjeta } from './Tarjeta';

export async function compartirPedido(pedido: PedidoConItems): Promise<void> {
  try {
    await Share.share({ message: textoPedido(pedido) });
  } catch (error) {
    Alert.alert('No se pudo compartir', mensajeDeError(error));
  }
}

/** Comprobante que se muestra después de generar un pedido. */
export function Comprobante({ pedido, onNuevo }: { pedido: PedidoConItems; onNuevo: () => void }) {
  return (
    <View style={estilos.pantalla}>
      <ScrollView contentContainerStyle={estilos.contenido}>
        <View style={estilos.exito}>
          <Ionicons name="checkmark-circle" size={56} color={colores.exito} />
          <Text style={estilos.exitoTexto}>Pedido generado</Text>
        </View>
        <Tarjeta estilo={estilos.tarjeta}>
          <Text style={estilos.titulo} accessibilityRole="header">
            {tituloPedido(pedido)}
          </Text>
          <Text style={estilos.fecha}>{formatoFechaLarga(pedido.fecha)}</Text>
          <View style={estilos.separador} />
          <DetalleItems items={pedido.items} />
          {pedido.nota ? (
            <>
              <View style={estilos.separador} />
              <Text style={estilos.nota}>Nota: {pedido.nota}</Text>
            </>
          ) : null}
          <View style={estilos.separador} />
          <View style={estilos.total}>
            <Text style={estilos.totalEtiqueta}>Total</Text>
            <Text style={estilos.totalValor}>{formatoDinero(pedido.total)}</Text>
          </View>
        </Tarjeta>
      </ScrollView>
      <View style={estilos.botones}>
        <Boton titulo="Nuevo pedido" icono="add-circle" grande onPress={onNuevo} />
        <Boton
          titulo="Compartir"
          icono="share-social"
          variante="secundario"
          grande
          onPress={() => void compartirPedido(pedido)}
        />
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  pantalla: {
    flex: 1,
    backgroundColor: colores.fondo,
  },
  contenido: {
    padding: espacio.lg,
    gap: espacio.lg,
  },
  exito: {
    alignItems: 'center',
    gap: espacio.xs,
  },
  exitoTexto: {
    fontSize: letra.grande,
    fontWeight: '800',
    color: colores.exito,
  },
  tarjeta: {
    gap: espacio.sm,
  },
  titulo: {
    fontSize: letra.grande,
    fontWeight: '800',
    color: colores.texto,
  },
  fecha: {
    fontSize: letra.pequena,
    color: colores.textoTenue,
  },
  separador: {
    height: 1,
    backgroundColor: colores.borde,
    marginVertical: espacio.xs,
  },
  nota: {
    fontSize: letra.normal,
    color: colores.textoSecundario,
  },
  total: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  totalEtiqueta: {
    fontSize: letra.media,
    fontWeight: '700',
    color: colores.textoSecundario,
  },
  totalValor: {
    fontSize: letra.enorme,
    fontWeight: '800',
    color: colores.texto,
  },
  botones: {
    padding: espacio.lg,
    gap: espacio.sm,
    borderTopWidth: 1,
    borderTopColor: colores.borde,
    backgroundColor: colores.tarjeta,
  },
});
