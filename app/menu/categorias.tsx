import { Ionicons } from '@expo/vector-icons';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Boton, type NombreIcono } from '../../src/components/Boton';
import { CampoTexto } from '../../src/components/CampoTexto';
import { EstadoVacio } from '../../src/components/EstadoVacio';
import { HojaInferior } from '../../src/components/HojaInferior';
import { useDb } from '../../src/db/DbContext';
import {
  crearCategoria,
  eliminarCategoria,
  listarCategoriasConConteo,
  moverCategoria,
  renombrarCategoria,
  type CategoriaConConteo,
} from '../../src/db/productosRepo';
import { useAlEnfocar } from '../../src/hooks/useAlEnfocar';
import { mensajeDeError } from '../../src/lib/errores';
import { plural } from '../../src/lib/texto';
import { TOQUE_MINIMO, colores, espacio, letra, radio } from '../../src/theme';

function BotonIcono({
  icono,
  etiqueta,
  onPress,
  deshabilitado = false,
  color = colores.textoSecundario,
}: {
  icono: NombreIcono;
  etiqueta: string;
  onPress: () => void;
  deshabilitado?: boolean;
  color?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={deshabilitado}
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
      accessibilityState={{ disabled: deshabilitado }}
      style={({ pressed }) => [estilos.botonIcono, pressed && { opacity: 0.6 }]}
    >
      <Ionicons name={icono} size={24} color={deshabilitado ? colores.borde : color} />
    </Pressable>
  );
}

export default function CategoriasPantalla() {
  const db = useDb();
  const [categorias, setCategorias] = useState<CategoriaConConteo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [nueva, setNueva] = useState('');
  const [errorNueva, setErrorNueva] = useState<string | null>(null);
  const [editando, setEditando] = useState<CategoriaConConteo | null>(null);
  const [nombreEditado, setNombreEditado] = useState('');

  const cargar = useCallback(() => {
    listarCategoriasConConteo(db)
      .then(setCategorias)
      .catch((e: unknown) => Alert.alert('No se pudieron cargar las categorías', mensajeDeError(e)))
      .finally(() => setCargando(false));
  }, [db]);
  useAlEnfocar(cargar);

  const agregar = async () => {
    if (!nueva.trim()) {
      setErrorNueva('Escribe un nombre.');
      return;
    }
    try {
      await crearCategoria(db, nueva);
      setNueva('');
      setErrorNueva(null);
      cargar();
    } catch (e) {
      setErrorNueva(mensajeDeError(e));
    }
  };

  const mover = async (id: number, direccion: -1 | 1) => {
    try {
      await moverCategoria(db, id, direccion);
      cargar();
    } catch (e) {
      Alert.alert('No se pudo mover', mensajeDeError(e));
    }
  };

  const guardarNombre = async () => {
    if (!editando) return;
    try {
      await renombrarCategoria(db, editando.id, nombreEditado);
      setEditando(null);
      cargar();
    } catch (e) {
      Alert.alert('No se pudo renombrar', mensajeDeError(e));
    }
  };

  const confirmarEliminar = (categoria: CategoriaConConteo) => {
    if (categoria.productos > 0) {
      Alert.alert(
        'No se puede eliminar',
        `"${categoria.nombre}" tiene ${plural(categoria.productos, 'producto', 'productos')}. Muévelos a otra categoría o elimínalos primero.`,
      );
      return;
    }
    Alert.alert('Eliminar categoría', `¿Eliminar "${categoria.nombre}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () => {
          eliminarCategoria(db, categoria.id)
            .then(cargar)
            .catch((e: unknown) => Alert.alert('No se pudo eliminar', mensajeDeError(e)));
        },
      },
    ]);
  };

  return (
    <KeyboardAvoidingView style={estilos.pantalla} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <FlatList
        data={categorias}
        keyExtractor={(c) => String(c.id)}
        contentContainerStyle={estilos.lista}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View style={estilos.nueva}>
            <View style={estilos.nuevaCampo}>
              <CampoTexto
                etiqueta="Nueva categoría"
                value={nueva}
                onChangeText={(t) => {
                  setNueva(t);
                  if (errorNueva) setErrorNueva(null);
                }}
                placeholder="Ej. Sopas"
                error={errorNueva}
                maxLength={40}
                returnKeyType="done"
                onSubmitEditing={() => void agregar()}
              />
            </View>
            <Boton titulo="Agregar" icono="add" onPress={() => void agregar()} estilo={estilos.nuevaBoton} />
          </View>
        }
        ListEmptyComponent={
          cargando ? (
            <ActivityIndicator size="large" color={colores.acento} />
          ) : (
            <EstadoVacio icono="folder-open-outline" titulo="Sin categorías" mensaje="Crea la primera categoría arriba." />
          )
        }
        renderItem={({ item, index }) => (
          <View style={estilos.fila}>
            <View style={estilos.info}>
              <Text style={estilos.nombre}>{item.nombre}</Text>
              <Text style={estilos.conteo}>{plural(item.productos, 'producto', 'productos')}</Text>
            </View>
            <BotonIcono
              icono="arrow-up"
              etiqueta={`Subir ${item.nombre}`}
              deshabilitado={index === 0}
              onPress={() => void mover(item.id, -1)}
            />
            <BotonIcono
              icono="arrow-down"
              etiqueta={`Bajar ${item.nombre}`}
              deshabilitado={index === categorias.length - 1}
              onPress={() => void mover(item.id, 1)}
            />
            <BotonIcono
              icono="create-outline"
              etiqueta={`Renombrar ${item.nombre}`}
              color={colores.acento}
              onPress={() => {
                setNombreEditado(item.nombre);
                setEditando(item);
              }}
            />
            <BotonIcono
              icono="trash-outline"
              etiqueta={`Eliminar ${item.nombre}`}
              color={colores.peligro}
              onPress={() => confirmarEliminar(item)}
            />
          </View>
        )}
        ListFooterComponent={
          categorias.length > 1 ? (
            <Text style={estilos.ayuda}>El orden de las categorías es el que se ve en Tomar pedido y en el Menú.</Text>
          ) : undefined
        }
      />

      <HojaInferior
        visible={editando !== null}
        onCerrar={() => setEditando(null)}
        titulo="Renombrar categoría"
        pie={<Boton titulo="Guardar" icono="checkmark" grande onPress={() => void guardarNombre()} />}
      >
        <View style={estilos.hojaCuerpo}>
          <CampoTexto
            etiqueta="Nombre"
            value={nombreEditado}
            onChangeText={setNombreEditado}
            maxLength={40}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={() => void guardarNombre()}
          />
        </View>
      </HojaInferior>
    </KeyboardAvoidingView>
  );
}

const estilos = StyleSheet.create({
  pantalla: {
    flex: 1,
    backgroundColor: colores.fondo,
  },
  lista: {
    padding: espacio.lg,
    gap: espacio.sm,
  },
  nueva: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: espacio.sm,
    marginBottom: espacio.md,
  },
  nuevaCampo: {
    flex: 1,
  },
  nuevaBoton: {
    marginTop: 24,
    minHeight: TOQUE_MINIMO + 4,
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colores.tarjeta,
    borderRadius: radio.lg,
    paddingLeft: espacio.lg,
    paddingRight: espacio.xs,
    paddingVertical: espacio.sm,
  },
  info: {
    flex: 1,
  },
  nombre: {
    fontSize: letra.normal,
    fontWeight: '700',
    color: colores.texto,
  },
  conteo: {
    fontSize: letra.pequena,
    color: colores.textoTenue,
  },
  botonIcono: {
    width: TOQUE_MINIMO,
    height: TOQUE_MINIMO,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ayuda: {
    fontSize: letra.pequena,
    color: colores.textoTenue,
    textAlign: 'center',
    marginTop: espacio.md,
  },
  hojaCuerpo: {
    paddingHorizontal: espacio.lg,
  },
});
