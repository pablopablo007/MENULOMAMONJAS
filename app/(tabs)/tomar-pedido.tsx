import { Ionicons } from '@expo/vector-icons';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Boton } from '../../src/components/Boton';
import { Chip } from '../../src/components/Chip';
import { Comprobante } from '../../src/components/Comprobante';
import { EstadoVacio } from '../../src/components/EstadoVacio';
import { FilaProducto } from '../../src/components/FilaProducto';
import { NotaItemSheet } from '../../src/components/NotaItemSheet';
import { PedidoSheet } from '../../src/components/PedidoSheet';
import { useDb } from '../../src/db/DbContext';
import { guardarPedido } from '../../src/db/pedidosRepo';
import { listarProductos } from '../../src/db/productosRepo';
import { useAlEnfocar } from '../../src/hooks/useAlEnfocar';
import { formatoDinero } from '../../src/lib/dinero';
import { mensajeDeError } from '../../src/lib/errores';
import { aNuevoPedido, cantidadProductos, totalPedido } from '../../src/lib/pedidoEnCurso';
import { normalizar, plural } from '../../src/lib/texto';
import { vibrarAlAgregar, vibrarExito } from '../../src/servicios/vibracion';
import { usePedidoActual } from '../../src/store/pedidoActual';
import { ALTO_BOTON, TOQUE_MINIMO, colores, espacio, letra, radio } from '../../src/theme';
import type { PedidoConItems, ProductoConCategoria } from '../../src/types';

interface CategoriaChip {
  id: number;
  nombre: string;
}

export default function TomarPedidoPantalla() {
  const db = useDb();
  const [productos, setProductos] = useState<ProductoConCategoria[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [categoriaId, setCategoriaId] = useState<number | null>(null);
  const [productoNota, setProductoNota] = useState<ProductoConCategoria | null>(null);
  const [verPedido, setVerPedido] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [comprobante, setComprobante] = useState<PedidoConItems | null>(null);
  const guardandoRef = useRef(false);

  const mesa = usePedidoActual((s) => s.mesa);
  const items = usePedidoActual((s) => s.items);
  const fijarMesa = usePedidoActual((s) => s.fijarMesa);
  const agregar = usePedidoActual((s) => s.agregar);
  const restar = usePedidoActual((s) => s.restar);
  const fijarNotaItem = usePedidoActual((s) => s.fijarNotaItem);
  const limpiar = usePedidoActual((s) => s.limpiar);

  const cargar = useCallback(() => {
    listarProductos(db, { soloDisponibles: true })
      .then((lista) => {
        setProductos(lista);
        setError(null);
      })
      .catch((e: unknown) => setError(mensajeDeError(e)))
      .finally(() => setCargando(false));
  }, [db]);
  useAlEnfocar(cargar);

  const categorias = useMemo<CategoriaChip[]>(() => {
    const vistas = new Map<number, CategoriaChip>();
    for (const p of productos) {
      if (!vistas.has(p.categoria_id)) vistas.set(p.categoria_id, { id: p.categoria_id, nombre: p.categoria_nombre });
    }
    return [...vistas.values()];
  }, [productos]);

  const filtrados = useMemo(() => {
    const termino = normalizar(busqueda);
    return productos.filter((p) => {
      if (categoriaId !== null && p.categoria_id !== categoriaId) return false;
      if (!termino) return true;
      return normalizar(`${p.nombre} ${p.descripcion ?? ''}`).includes(termino);
    });
  }, [productos, busqueda, categoriaId]);

  const porProducto = useMemo(() => new Map(items.map((i) => [i.producto_id, i])), [items]);
  const total = useMemo(() => totalPedido(items), [items]);
  const unidades = useMemo(() => cantidadProductos(items), [items]);

  const onAgregar = useCallback(
    (p: ProductoConCategoria) => {
      agregar({ id: p.id, nombre: p.nombre, precio: p.precio });
      vibrarAlAgregar();
    },
    [agregar],
  );

  const generar = async () => {
    if (guardandoRef.current) return; // evita pedidos duplicados por doble toque
    const estado = usePedidoActual.getState();
    if (estado.items.length === 0) {
      Alert.alert('Pedido vacío', 'Agrega al menos un producto antes de generar el pedido.');
      return;
    }
    guardandoRef.current = true;
    setGuardando(true);
    try {
      const pedido = await guardarPedido(db, aNuevoPedido(estado.mesa, estado.nota, estado.items));
      vibrarExito();
      limpiar();
      setVerPedido(false);
      setComprobante(pedido);
    } catch (e) {
      Alert.alert('No se pudo guardar el pedido', mensajeDeError(e));
    } finally {
      guardandoRef.current = false;
      setGuardando(false);
    }
  };

  if (comprobante) {
    return (
      <Comprobante
        pedido={comprobante}
        onNuevo={() => {
          setComprobante(null);
          setBusqueda('');
          setCategoriaId(null);
        }}
      />
    );
  }

  const itemNota = productoNota ? porProducto.get(productoNota.id) : undefined;

  return (
    <View style={estilos.pantalla}>
      <View style={estilos.cabecera}>
        <View style={estilos.filaMesa}>
          <Ionicons name="restaurant-outline" size={20} color={colores.textoTenue} />
          <TextInput
            value={mesa}
            onChangeText={fijarMesa}
            placeholder="Mesa (opcional): 4, Terraza 2…"
            placeholderTextColor={colores.textoTenue}
            style={estilos.campoMesa}
            accessibilityLabel="Mesa"
            returnKeyType="done"
            maxLength={30}
          />
          <Pressable
            onPress={() => fijarMesa(mesa === 'Para llevar' ? '' : 'Para llevar')}
            style={[estilos.paraLlevar, mesa === 'Para llevar' && estilos.paraLlevarActivo]}
            accessibilityRole="button"
            accessibilityState={{ selected: mesa === 'Para llevar' }}
          >
            <Text style={[estilos.paraLlevarTexto, mesa === 'Para llevar' && estilos.paraLlevarTextoActivo]}>
              Para llevar
            </Text>
          </Pressable>
        </View>

        <View style={estilos.buscador}>
          <Ionicons name="search" size={20} color={colores.textoTenue} />
          <TextInput
            value={busqueda}
            onChangeText={setBusqueda}
            placeholder="Buscar producto"
            placeholderTextColor={colores.textoTenue}
            style={estilos.campoBusqueda}
            accessibilityLabel="Buscar producto"
            returnKeyType="search"
            autoCorrect={false}
          />
          {busqueda ? (
            <Pressable
              onPress={() => setBusqueda('')}
              style={estilos.limpiar}
              accessibilityRole="button"
              accessibilityLabel="Borrar búsqueda"
            >
              <Ionicons name="close-circle" size={22} color={colores.textoTenue} />
            </Pressable>
          ) : null}
        </View>

        {categorias.length > 1 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={estilos.chips}
            keyboardShouldPersistTaps="handled"
          >
            <Chip etiqueta="Todas" seleccionado={categoriaId === null} onPress={() => setCategoriaId(null)} />
            {categorias.map((c) => (
              <Chip
                key={c.id}
                etiqueta={c.nombre}
                seleccionado={categoriaId === c.id}
                onPress={() => setCategoriaId(categoriaId === c.id ? null : c.id)}
              />
            ))}
          </ScrollView>
        ) : null}
      </View>

      {cargando ? (
        <ActivityIndicator style={estilos.cargando} size="large" color={colores.acento} />
      ) : error ? (
        <EstadoVacio icono="alert-circle-outline" titulo="No se pudieron cargar los productos" mensaje={error}>
          <Boton titulo="Reintentar" icono="refresh" onPress={cargar} />
        </EstadoVacio>
      ) : (
        <FlatList
          data={filtrados}
          keyExtractor={(p) => String(p.id)}
          contentContainerStyle={estilos.lista}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          renderItem={({ item }) => {
            const enPedido = porProducto.get(item.id);
            return (
              <FilaProducto
                producto={item}
                cantidad={enPedido?.cantidad ?? 0}
                nota={enPedido?.nota ?? ''}
                onAgregar={onAgregar}
                onRestar={restar}
                onNota={setProductoNota}
              />
            );
          }}
          ListEmptyComponent={
            productos.length === 0 ? (
              <EstadoVacio
                icono="fast-food-outline"
                titulo="No hay productos disponibles"
                mensaje="Agrega productos o actívalos en la pestaña Menú."
              />
            ) : (
              <EstadoVacio
                icono="search-outline"
                titulo="Sin resultados"
                mensaje="No hay productos que coincidan con la búsqueda."
              />
            )
          }
        />
      )}

      <View style={estilos.barra}>
        <Pressable
          onPress={() => setVerPedido(true)}
          disabled={items.length === 0}
          accessibilityRole="button"
          accessibilityLabel={`Ver pedido, ${plural(unidades, 'producto', 'productos')}, total ${formatoDinero(total)}`}
          style={({ pressed }) => [
            estilos.botonPedido,
            items.length === 0 && estilos.botonPedidoVacio,
            pressed && { opacity: 0.85 },
          ]}
        >
          {items.length === 0 ? (
            <Text style={estilos.textoPedidoVacio}>Agrega productos al pedido</Text>
          ) : (
            <>
              <Ionicons name="cart" size={22} color={colores.sobreAcento} />
              <Text style={estilos.textoPedido} numberOfLines={1}>
                Ver pedido · {plural(unidades, 'producto', 'productos')} · {formatoDinero(total)}
              </Text>
            </>
          )}
        </Pressable>
      </View>

      <NotaItemSheet
        producto={productoNota}
        notaActual={itemNota?.nota ?? ''}
        enPedido={itemNota !== undefined}
        onCerrar={() => setProductoNota(null)}
        onGuardar={(nota) => {
          if (productoNota) {
            if (!itemNota) vibrarAlAgregar();
            fijarNotaItem({ id: productoNota.id, nombre: productoNota.nombre, precio: productoNota.precio }, nota);
          }
          setProductoNota(null);
        }}
      />

      <PedidoSheet
        visible={verPedido}
        guardando={guardando}
        onCerrar={() => setVerPedido(false)}
        onGenerar={() => void generar()}
      />
    </View>
  );
}

const estilos = StyleSheet.create({
  pantalla: {
    flex: 1,
    backgroundColor: colores.fondo,
  },
  cabecera: {
    paddingHorizontal: espacio.lg,
    paddingTop: espacio.md,
    paddingBottom: espacio.sm,
    gap: espacio.sm,
    backgroundColor: colores.fondo,
  },
  filaMesa: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.sm,
    backgroundColor: colores.tarjeta,
    borderRadius: radio.md,
    borderWidth: 1.5,
    borderColor: colores.bordeFuerte,
    paddingLeft: espacio.md,
    paddingRight: espacio.xs,
  },
  campoMesa: {
    flex: 1,
    minHeight: TOQUE_MINIMO + 4,
    fontSize: letra.normal,
    color: colores.texto,
  },
  paraLlevar: {
    minHeight: TOQUE_MINIMO - 6,
    paddingHorizontal: espacio.md,
    borderRadius: radio.sm,
    backgroundColor: colores.fondo,
    justifyContent: 'center',
  },
  paraLlevarActivo: {
    backgroundColor: colores.acento,
  },
  paraLlevarTexto: {
    fontSize: letra.pequena,
    fontWeight: '700',
    color: colores.textoSecundario,
  },
  paraLlevarTextoActivo: {
    color: colores.sobreAcento,
  },
  buscador: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.sm,
    backgroundColor: colores.tarjeta,
    borderRadius: radio.md,
    paddingLeft: espacio.md,
  },
  campoBusqueda: {
    flex: 1,
    minHeight: TOQUE_MINIMO + 4,
    fontSize: letra.normal,
    color: colores.texto,
  },
  limpiar: {
    width: TOQUE_MINIMO,
    height: TOQUE_MINIMO,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chips: {
    gap: espacio.sm,
    paddingVertical: espacio.xs,
  },
  cargando: {
    marginTop: espacio.xxl,
  },
  lista: {
    paddingHorizontal: espacio.lg,
    paddingBottom: espacio.lg,
    gap: espacio.sm,
  },
  barra: {
    paddingHorizontal: espacio.lg,
    paddingVertical: espacio.sm,
    backgroundColor: colores.tarjeta,
    borderTopWidth: 1,
    borderTopColor: colores.borde,
  },
  botonPedido: {
    minHeight: ALTO_BOTON + 4,
    borderRadius: radio.lg,
    backgroundColor: colores.acento,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: espacio.sm,
    paddingHorizontal: espacio.lg,
  },
  botonPedidoVacio: {
    backgroundColor: colores.borde,
  },
  textoPedido: {
    fontSize: letra.media,
    fontWeight: '800',
    color: colores.sobreAcento,
    flexShrink: 1,
  },
  textoPedidoVacio: {
    fontSize: letra.normal,
    fontWeight: '600',
    color: colores.textoSecundario,
  },
});
