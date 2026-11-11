import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Boton } from '../../src/components/Boton';
import { CampoTexto } from '../../src/components/CampoTexto';
import { Chip } from '../../src/components/Chip';
import { EstadoVacio } from '../../src/components/EstadoVacio';
import { useDb } from '../../src/db/DbContext';
import {
  actualizarProducto,
  crearProducto,
  eliminarProducto,
  listarCategorias,
  obtenerProducto,
} from '../../src/db/productosRepo';
import { parsearPrecio, precioParaCampo } from '../../src/lib/dinero';
import { mensajeDeError } from '../../src/lib/errores';
import { textoONulo } from '../../src/lib/texto';
import { colores, espacio, letra } from '../../src/theme';
import type { Categoria } from '../../src/types';

interface Errores {
  nombre?: string;
  categoria?: string;
  precio?: string;
}

export default function ProductoFormulario() {
  const db = useDb();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id?: string }>();
  const id = params.id ? Number(params.id) : null;
  const editando = id !== null && Number.isInteger(id);

  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [nombre, setNombre] = useState('');
  const [categoriaId, setCategoriaId] = useState<number | null>(null);
  const [precio, setPrecio] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [errores, setErrores] = useState<Errores>({});
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [errorCarga, setErrorCarga] = useState<string | null>(null);

  useEffect(() => {
    let activo = true;
    (async () => {
      const cats = await listarCategorias(db);
      const producto = editando && id !== null ? await obtenerProducto(db, id) : null;
      if (!activo) return;
      setCategorias(cats);
      if (producto) {
        setNombre(producto.nombre);
        setCategoriaId(producto.categoria_id);
        setPrecio(precioParaCampo(producto.precio));
        setDescripcion(producto.descripcion ?? '');
      } else if (editando) {
        setErrorCarga('Este producto ya no existe.');
      } else if (cats.length > 0) {
        setCategoriaId(cats[0].id);
      }
    })()
      .catch((e: unknown) => activo && setErrorCarga(mensajeDeError(e)))
      .finally(() => activo && setCargando(false));
    return () => {
      activo = false;
    };
  }, [db, editando, id]);

  const guardar = async () => {
    const nuevosErrores: Errores = {};
    const valorPrecio = parsearPrecio(precio);
    if (!nombre.trim()) nuevosErrores.nombre = 'Escribe el nombre del producto.';
    if (categoriaId === null) nuevosErrores.categoria = 'Elige una categoría.';
    if (valorPrecio === null) nuevosErrores.precio = 'Escribe un precio válido, por ejemplo 2.50.';
    else if (valorPrecio <= 0) nuevosErrores.precio = 'El precio debe ser mayor que 0.';
    setErrores(nuevosErrores);
    if (Object.keys(nuevosErrores).length > 0 || categoriaId === null || valorPrecio === null) return;

    setGuardando(true);
    try {
      const datos = {
        categoria_id: categoriaId,
        nombre,
        descripcion: textoONulo(descripcion),
        precio: valorPrecio,
      };
      if (editando && id !== null) await actualizarProducto(db, id, datos);
      else await crearProducto(db, datos);
      router.back();
    } catch (e) {
      Alert.alert('No se pudo guardar', mensajeDeError(e));
      setGuardando(false);
    }
  };

  const confirmarEliminar = () => {
    if (id === null) return;
    Alert.alert('Eliminar producto', `¿Eliminar "${nombre}" del menú?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () => {
          eliminarProducto(db, id)
            .then((resultado) => {
              if (resultado === 'desactivado') {
                Alert.alert(
                  'Producto desactivado',
                  'Este producto ya aparece en pedidos anteriores, así que no se borró: se marcó como no disponible para que el historial no cambie.',
                );
              }
              router.back();
            })
            .catch((e: unknown) => Alert.alert('No se pudo eliminar', mensajeDeError(e)));
        },
      },
    ]);
  };

  const titulo = editando ? 'Editar producto' : 'Nuevo producto';

  if (cargando) {
    return (
      <>
        <Stack.Screen options={{ title: titulo }} />
        <ActivityIndicator style={estilos.cargando} size="large" color={colores.acento} />
      </>
    );
  }

  if (errorCarga) {
    return (
      <>
        <Stack.Screen options={{ title: titulo }} />
        <EstadoVacio icono="alert-circle-outline" titulo="No se pudo abrir el producto" mensaje={errorCarga}>
          <Boton titulo="Volver" onPress={() => router.back()} />
        </EstadoVacio>
      </>
    );
  }

  if (categorias.length === 0) {
    return (
      <>
        <Stack.Screen options={{ title: titulo }} />
        <EstadoVacio
          icono="folder-open-outline"
          titulo="Primero crea una categoría"
          mensaje="Cada producto pertenece a una categoría, por ejemplo Bebidas o Platos fuertes."
        >
          <Boton titulo="Crear categoría" icono="add" onPress={() => router.replace('/menu/categorias')} />
        </EstadoVacio>
      </>
    );
  }

  return (
    <KeyboardAvoidingView
      style={estilos.pantalla}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <Stack.Screen options={{ title: titulo }} />
      <ScrollView contentContainerStyle={estilos.contenido} keyboardShouldPersistTaps="handled">
        <CampoTexto
          etiqueta="Nombre"
          value={nombre}
          onChangeText={setNombre}
          placeholder="Ej. Seco de chivo"
          error={errores.nombre}
          maxLength={60}
          autoCapitalize="sentences"
        />

        <View style={estilos.grupo}>
          <Text style={estilos.etiqueta}>Categoría</Text>
          <View style={estilos.chips}>
            {categorias.map((c) => (
              <Chip key={c.id} etiqueta={c.nombre} seleccionado={categoriaId === c.id} onPress={() => setCategoriaId(c.id)} />
            ))}
          </View>
          {errores.categoria ? <Text style={estilos.error}>{errores.categoria}</Text> : null}
        </View>

        <CampoTexto
          etiqueta="Precio (USD)"
          value={precio}
          onChangeText={setPrecio}
          placeholder="0.00"
          keyboardType="decimal-pad"
          error={errores.precio}
          ayuda="Precio final, sin calcular IVA aparte."
          maxLength={8}
        />

        <CampoTexto
          etiqueta="Descripción (opcional)"
          value={descripcion}
          onChangeText={setDescripcion}
          placeholder="Ej. Con arroz, maduro y ensalada"
          multiline
          maxLength={120}
        />
      </ScrollView>

      <View style={[estilos.botones, { paddingBottom: Math.max(insets.bottom, espacio.lg) }]}>
        <Boton titulo="Guardar" icono="checkmark" grande cargando={guardando} onPress={() => void guardar()} />
        {editando ? (
          <Boton titulo="Eliminar producto" icono="trash-outline" variante="peligro" onPress={confirmarEliminar} />
        ) : null}
      </View>
    </KeyboardAvoidingView>
  );
}

const estilos = StyleSheet.create({
  pantalla: {
    flex: 1,
    backgroundColor: colores.fondo,
  },
  cargando: {
    marginTop: espacio.xxl,
  },
  contenido: {
    padding: espacio.lg,
    gap: espacio.lg,
  },
  grupo: {
    gap: espacio.sm,
  },
  etiqueta: {
    fontSize: letra.pequena,
    fontWeight: '700',
    color: colores.textoSecundario,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: espacio.sm,
  },
  error: {
    fontSize: letra.pequena,
    color: colores.peligro,
    fontWeight: '600',
  },
  botones: {
    paddingHorizontal: espacio.lg,
    paddingTop: espacio.md,
    gap: espacio.sm,
    backgroundColor: colores.tarjeta,
    borderTopWidth: 1,
    borderTopColor: colores.borde,
  },
});
