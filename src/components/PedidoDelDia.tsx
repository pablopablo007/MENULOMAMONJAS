import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { formatoDinero } from '../lib/dinero';
import { formatoHora } from '../lib/fechas';
import { etiquetaMesa } from '../lib/textoPedido';
import { TOQUE_MINIMO, colores, espacio, letra, radio } from '../theme';
import type { PedidoConItems } from '../types';
import { Boton } from './Boton';
import { DetalleItems } from './DetalleItems';

interface Props {
  pedido: PedidoConItems;
  expandido: boolean;
  onAlternar: () => void;
  onAnular: () => void;
  onCompartir: () => void;
}

/** Fila de la lista del día: "#3 · 13:20 · Mesa 4 · $18.50". Al tocarla muestra el detalle. */
export function PedidoDelDia({ pedido, expandido, onAlternar, onAnular, onCompartir }: Props) {
  const anulado = pedido.estado === 'anulado';
  const partes = [`#${pedido.numero}`, formatoHora(pedido.created_at)];
  const mesa = etiquetaMesa(pedido.mesa);
  if (mesa) partes.push(mesa);

  return (
    <View style={[estilos.tarjeta, anulado && estilos.tarjetaAnulada]}>
      <Pressable
        onPress={onAlternar}
        accessibilityRole="button"
        accessibilityState={{ expanded: expandido }}
        accessibilityLabel={`Pedido ${partes.join(', ')}, ${formatoDinero(pedido.total)}${anulado ? ', anulado' : ''}`}
        style={({ pressed }) => [estilos.cabecera, pressed && { opacity: 0.7 }]}
      >
        <View style={estilos.cabeceraTextos}>
          <Text style={[estilos.titulo, anulado && estilos.tachado]} numberOfLines={1}>
            {partes.join(' · ')}
          </Text>
          {anulado ? (
            <View style={estilos.etiquetaAnulado}>
              <Text style={estilos.etiquetaAnuladoTexto}>Anulado</Text>
            </View>
          ) : null}
        </View>
        <Text style={[estilos.total, anulado && estilos.tachado]}>{formatoDinero(pedido.total)}</Text>
        <Ionicons name={expandido ? 'chevron-up' : 'chevron-down'} size={22} color={colores.textoTenue} />
      </Pressable>

      {expandido ? (
        <View style={estilos.detalle}>
          <DetalleItems items={pedido.items} tachado={anulado} />
          {pedido.nota ? <Text style={estilos.nota}>Nota: {pedido.nota}</Text> : null}
          <View style={estilos.botones}>
            <Boton titulo="Compartir" icono="share-social-outline" variante="secundario" onPress={onCompartir} estilo={estilos.boton} />
            {!anulado ? (
              <Boton titulo="Anular pedido" icono="close-circle-outline" variante="peligro" onPress={onAnular} estilo={estilos.boton} />
            ) : null}
          </View>
        </View>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  tarjeta: {
    backgroundColor: colores.tarjeta,
    borderRadius: radio.lg,
    overflow: 'hidden',
  },
  tarjetaAnulada: {
    backgroundColor: colores.fondo,
    borderWidth: 1,
    borderColor: colores.borde,
  },
  cabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.sm,
    minHeight: TOQUE_MINIMO + 8,
    paddingHorizontal: espacio.lg,
  },
  cabeceraTextos: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.sm,
  },
  titulo: {
    flexShrink: 1,
    fontSize: letra.normal,
    fontWeight: '700',
    color: colores.texto,
  },
  total: {
    fontSize: letra.normal,
    fontWeight: '800',
    color: colores.texto,
  },
  tachado: {
    textDecorationLine: 'line-through',
    color: colores.textoTenue,
  },
  etiquetaAnulado: {
    backgroundColor: colores.peligroSuave,
    borderRadius: radio.sm,
    paddingHorizontal: espacio.sm,
    paddingVertical: 2,
  },
  etiquetaAnuladoTexto: {
    fontSize: letra.pequena,
    fontWeight: '800',
    color: colores.peligro,
  },
  detalle: {
    paddingHorizontal: espacio.lg,
    paddingBottom: espacio.lg,
    gap: espacio.md,
    borderTopWidth: 1,
    borderTopColor: colores.borde,
    paddingTop: espacio.md,
  },
  nota: {
    fontSize: letra.pequena,
    color: colores.textoSecundario,
  },
  botones: {
    flexDirection: 'row',
    gap: espacio.sm,
  },
  boton: {
    flex: 1,
  },
});
