import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { formatoDinero } from '../lib/dinero';
import { cantidadProductos, subtotalItem, totalPedido } from '../lib/pedidoEnCurso';
import { plural } from '../lib/texto';
import { etiquetaMesa } from '../lib/textoPedido';
import { usePedidoActual } from '../store/pedidoActual';
import { TOQUE_MINIMO, colores, espacio, letra, radio } from '../theme';
import { Boton } from './Boton';
import { CampoTexto } from './CampoTexto';
import { Contador } from './Contador';
import { EstadoVacio } from './EstadoVacio';
import { HojaInferior } from './HojaInferior';

interface Props {
  visible: boolean;
  guardando: boolean;
  onCerrar: () => void;
  onGenerar: () => void;
}

/** Vista del pedido antes de generarlo: ítems, nota general, total y botón "Generar pedido". */
export function PedidoSheet({ visible, guardando, onCerrar, onGenerar }: Props) {
  const items = usePedidoActual((s) => s.items);
  const mesa = usePedidoActual((s) => s.mesa);
  const nota = usePedidoActual((s) => s.nota);
  const fijarNota = usePedidoActual((s) => s.fijarNota);
  const agregar = usePedidoActual((s) => s.agregar);
  const restar = usePedidoActual((s) => s.restar);
  const quitar = usePedidoActual((s) => s.quitar);

  const total = useMemo(() => totalPedido(items), [items]);
  const unidades = useMemo(() => cantidadProductos(items), [items]);
  const vacio = items.length === 0;

  return (
    <HojaInferior
      visible={visible}
      onCerrar={onCerrar}
      titulo="Pedido"
      subtitulo={[etiquetaMesa(mesa.trim() || null) ?? 'Sin mesa', plural(unidades, 'producto', 'productos')].join(' · ')}
      pie={
        <>
          <View style={estilos.total}>
            <Text style={estilos.totalEtiqueta}>Total</Text>
            <Text style={estilos.totalValor}>{formatoDinero(total)}</Text>
          </View>
          <Boton
            titulo={guardando ? 'Guardando…' : 'Generar pedido'}
            icono="checkmark-circle"
            grande
            cargando={guardando}
            deshabilitado={vacio}
            onPress={onGenerar}
          />
        </>
      }
    >
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={estilos.cuerpo}>
        {vacio ? (
          <EstadoVacio icono="cart-outline" titulo="El pedido está vacío" mensaje="Agrega productos con el botón +." />
        ) : (
          items.map((item) => (
            <View key={item.producto_id} style={estilos.item}>
              <View style={estilos.itemInfo}>
                <Text style={estilos.itemNombre}>
                  {item.cantidad} × {item.nombre}
                </Text>
                {item.nota ? <Text style={estilos.itemNota}>Nota: {item.nota}</Text> : null}
                <Text style={estilos.itemSubtotal}>{formatoDinero(subtotalItem(item))}</Text>
              </View>
              <Contador
                cantidad={item.cantidad}
                nombre={item.nombre}
                onMas={() => agregar({ id: item.producto_id, nombre: item.nombre, precio: item.precio })}
                onMenos={() => restar(item.producto_id)}
              />
              <Pressable
                onPress={() => quitar(item.producto_id)}
                style={estilos.quitar}
                accessibilityRole="button"
                accessibilityLabel={`Quitar ${item.nombre} del pedido`}
              >
                <Ionicons name="close-circle" size={26} color={colores.peligro} />
              </Pressable>
            </View>
          ))
        )}
        <CampoTexto
          etiqueta="Nota general del pedido"
          value={nota}
          onChangeText={fijarNota}
          placeholder="Ej. traer todo junto, cliente alérgico al maní"
          multiline
          maxLength={200}
        />
      </ScrollView>
    </HojaInferior>
  );
}

const estilos = StyleSheet.create({
  cuerpo: {
    paddingHorizontal: espacio.lg,
    paddingBottom: espacio.sm,
    gap: espacio.sm,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colores.tarjeta,
    borderRadius: radio.md,
    padding: espacio.md,
    gap: espacio.xs,
  },
  itemInfo: {
    flex: 1,
    gap: 2,
  },
  itemNombre: {
    fontSize: letra.normal,
    fontWeight: '700',
    color: colores.texto,
  },
  itemNota: {
    fontSize: letra.pequena,
    color: colores.acentoOscuro,
  },
  itemSubtotal: {
    fontSize: letra.pequena,
    fontWeight: '700',
    color: colores.textoSecundario,
  },
  quitar: {
    width: TOQUE_MINIMO,
    height: TOQUE_MINIMO,
    alignItems: 'center',
    justifyContent: 'center',
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
    fontSize: letra.titulo,
    fontWeight: '800',
    color: colores.texto,
  },
});
