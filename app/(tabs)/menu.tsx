import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SectionList,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';

import { Boton } from '../../src/components/Boton';
import { EstadoVacio } from '../../src/components/EstadoVacio';
import { useDb } from '../../src/db/DbContext';
import { obtenerUltimoRespaldo } from '../../src/db/ajustesRepo';
import { useNube } from '../../src/nube/NubeContext';
import { resumenNube } from '../../src/nube/resumen';
import {
  borrarDatosEjemplo,
  cambiarDisponibilidad,
  hayDatosEjemplo,
  listarCategorias,
  listarProductos,
} from '../../src/db/productosRepo';
import { useAlEnfocar } from '../../src/hooks/useAlEnfocar';
import { formatoDinero } from '../../src/lib/dinero';
import { mensajeDeError } from '../../src/lib/errores';
import { diasDesde, haceCuanto } from '../../src/lib/fechas';
import { plural } from '../../src/lib/texto';
import { TOQUE_MINIMO, colores, espacio, letra, radio, sombra } from '../../src/theme';
import type { Categoria, ProductoConCategoria } from '../../src/types';

const DIAS_AVISO_RESPALDO = 7;

interface Seccion {
  categoria: Categoria;
  data: ProductoConCategoria[];
}

export default function MenuPantalla() {
  const db = useDb();
  const nube = useNube();
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [productos, setProductos] = useState<ProductoConCategoria[]>([]);
  const [conEjemplos, setConEjemplos] = useState(false);
  const [ultimoRespaldo, setUltimoRespaldo] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(() => {
    Promise.all([listarCategorias(db), listarProductos(db), hayDatosEjemplo(db), obtenerUltimoRespaldo(db)])
      .then(([cats, prods, ejemplos, respaldo]) => {
        setCategorias(cats);
        setProductos(prods);
        setConEjemplos(ejemplos);
        setUltimoRespaldo(respaldo);
        setError(null);
      })
      .catch((e: unknown) => setError(mensajeDeError(e)))
      .finally(() => setCargando(false));
  }, [db]);
  useAlEnfocar(cargar);

  const secciones = useMemo<Seccion[]>(
    () =>
      categorias.map((categoria) => ({
        categoria,
        data: productos.filter((p) => p.categoria_id === categoria.id),
      })),
    [categorias, productos],
  );

  const alternarDisponible = async (producto: ProductoConCategoria, disponible: boolean) => {
    const valor = disponible ? 1 : 0;
    setProductos((lista) => lista.map((p) => (p.id === producto.id ? { ...p, activo: valor } : p)));
    try {
      await cambiarDisponibilidad(db, producto.id, disponible);
    } catch (e) {
      setProductos((lista) => lista.map((p) => (p.id === producto.id ? { ...p, activo: producto.activo } : p)));
      Alert.alert('No se pudo cambiar la disponibilidad', mensajeDeError(e));
    }
  };

  const confirmarBorrarEjemplos = () => {
    Alert.alert(
      'Borrar datos de ejemplo',
      'Se eliminarán los productos y categorías de ejemplo. Los que ya se usaron en pedidos solo se marcarán como no disponibles. Tus propios productos no se tocan.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Borrar',
          style: 'destructive',
          onPress: () => {
            borrarDatosEjemplo(db)
              .then(({ eliminados, desactivados }) => {
                const partes = [`${plural(eliminados, 'producto eliminado', 'productos eliminados')}`];
                if (desactivados > 0) partes.push(plural(desactivados, 'desactivado', 'desactivados'));
                Alert.alert('Listo', `${partes.join(', ')}.`);
                cargar();
              })
              .catch((e: unknown) => Alert.alert('No se pudieron borrar', mensajeDeError(e)));
          },
        },
      ],
    );
  };

  if (cargando) {
    return <ActivityIndicator style={estilos.cargando} size="large" color={colores.acento} />;
  }

  const dias = ultimoRespaldo ? diasDesde(ultimoRespaldo) : null;
  const avisoRespaldo = dias === null || dias > DIAS_AVISO_RESPALDO;
  const estadoNube = resumenNube(nube);
  const avisoNube = estadoNube.tono === 'aviso';

  const encabezado = (
    <View style={estilos.encabezado}>
      <Pressable
        onPress={() => router.push('/menu/respaldo')}
        accessibilityRole="button"
        accessibilityLabel="Abrir respaldo"
        style={({ pressed }) => [estilos.respaldo, avisoRespaldo && estilos.respaldoAviso, pressed && { opacity: 0.85 }]}
      >
        <Ionicons
          name={avisoRespaldo ? 'warning-outline' : 'cloud-done-outline'}
          size={26}
          color={avisoRespaldo ? colores.aviso : colores.exito}
        />
        <View style={estilos.respaldoTextos}>
          <Text style={estilos.respaldoTitulo}>Respaldo</Text>
          <Text style={[estilos.respaldoDetalle, avisoRespaldo && { color: colores.aviso }]}>
            {ultimoRespaldo ? `Último: ${haceCuanto(ultimoRespaldo)}` : 'Aún no has hecho ningún respaldo'}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={22} color={colores.textoTenue} />
      </Pressable>

      <Pressable
        onPress={() => router.push('/menu/nube')}
        accessibilityRole="button"
        accessibilityLabel={`Abrir nube: ${estadoNube.titulo}`}
        style={({ pressed }) => [estilos.respaldo, avisoNube && estilos.respaldoAviso, pressed && { opacity: 0.85 }]}
      >
        <Ionicons
          name={estadoNube.tono === 'ok' ? 'cloud-done-outline' : avisoNube ? 'cloud-offline-outline' : 'cloud-outline'}
          size={26}
          color={estadoNube.tono === 'ok' ? colores.exito : avisoNube ? colores.aviso : colores.textoTenue}
        />
        <View style={estilos.respaldoTextos}>
          <Text style={estilos.respaldoTitulo}>Nube</Text>
          <Text style={[estilos.respaldoDetalle, avisoNube && { color: colores.aviso }]} numberOfLines={2}>
            {estadoNube.titulo}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={22} color={colores.textoTenue} />
      </Pressable>

      <View style={estilos.acciones}>
        <Boton
          titulo="Agregar producto"
          icono="add"
          estilo={estilos.accionPrincipal}
          onPress={() => router.push('/menu/producto')}
        />
        <Boton
          titulo="Categorías"
          icono="list"
          variante="secundario"
          onPress={() => router.push('/menu/categorias')}
        />
      </View>
      {error ? <Text style={estilos.error}>{error}</Text> : null}
    </View>
  );

  return (
    <SectionList
      sections={secciones}
      keyExtractor={(p) => String(p.id)}
      stickySectionHeadersEnabled={false}
      contentContainerStyle={estilos.lista}
      ListHeaderComponent={encabezado}
      renderSectionHeader={({ section }) => (
        <View style={estilos.seccion}>
          <Text style={estilos.seccionTitulo} accessibilityRole="header">
            {section.categoria.nombre}
          </Text>
          <Text style={estilos.seccionConteo}>{plural(section.data.length, 'producto', 'productos')}</Text>
        </View>
      )}
      renderSectionFooter={({ section }) =>
        section.data.length === 0 ? <Text style={estilos.seccionVacia}>Sin productos en esta categoría.</Text> : null
      }
      renderItem={({ item }) => (
        <View style={estilos.fila}>
          <Pressable
            style={({ pressed }) => [estilos.filaInfo, pressed && { opacity: 0.7 }]}
            onPress={() => router.push({ pathname: '/menu/producto', params: { id: String(item.id) } })}
            accessibilityRole="button"
            accessibilityHint="Editar producto"
          >
            <Text style={[estilos.nombre, item.activo === 0 && estilos.inactivo]} numberOfLines={2}>
              {item.nombre}
            </Text>
            {item.descripcion ? (
              <Text style={estilos.descripcion} numberOfLines={1}>
                {item.descripcion}
              </Text>
            ) : null}
            <Text style={estilos.precio}>{formatoDinero(item.precio)}</Text>
          </Pressable>
          <View style={estilos.disponible}>
            <Switch
              value={item.activo === 1}
              onValueChange={(valor) => void alternarDisponible(item, valor)}
              trackColor={{ true: colores.acento, false: colores.bordeFuerte }}
              thumbColor={colores.tarjeta}
              accessibilityLabel={`Disponible: ${item.nombre}`}
            />
            <Text style={[estilos.disponibleTexto, item.activo === 1 && { color: colores.exito }]}>
              {item.activo === 1 ? 'Disponible' : 'No disponible'}
            </Text>
          </View>
        </View>
      )}
      ListEmptyComponent={
        <EstadoVacio
          icono="restaurant-outline"
          titulo="Tu menú está vacío"
          mensaje="Crea una categoría y luego agrega tus productos con sus precios."
        />
      }
      ListFooterComponent={
        conEjemplos ? (
          <View style={estilos.pie}>
            <Text style={estilos.pieTexto}>
              Los productos de ejemplo están para que pruebes la app. Cuando cargues tu menú, puedes borrarlos.
            </Text>
            <Boton titulo="Borrar datos de ejemplo" icono="trash-outline" variante="peligro" onPress={confirmarBorrarEjemplos} />
          </View>
        ) : undefined
      }
    />
  );
}

const estilos = StyleSheet.create({
  cargando: {
    marginTop: espacio.xxl,
  },
  lista: {
    padding: espacio.lg,
    paddingBottom: espacio.xxl,
  },
  encabezado: {
    gap: espacio.md,
    marginBottom: espacio.sm,
  },
  respaldo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.md,
    backgroundColor: colores.tarjeta,
    borderRadius: radio.lg,
    padding: espacio.lg,
    minHeight: TOQUE_MINIMO,
    ...sombra,
  },
  respaldoAviso: {
    backgroundColor: colores.avisoSuave,
  },
  respaldoTextos: {
    flex: 1,
  },
  respaldoTitulo: {
    fontSize: letra.normal,
    fontWeight: '800',
    color: colores.texto,
  },
  respaldoDetalle: {
    fontSize: letra.pequena,
    color: colores.textoSecundario,
  },
  acciones: {
    flexDirection: 'row',
    gap: espacio.sm,
  },
  accionPrincipal: {
    flex: 1,
  },
  error: {
    fontSize: letra.pequena,
    color: colores.peligro,
  },
  seccion: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginTop: espacio.lg,
    marginBottom: espacio.sm,
  },
  seccionTitulo: {
    fontSize: letra.media,
    fontWeight: '800',
    color: colores.texto,
  },
  seccionConteo: {
    fontSize: letra.pequena,
    color: colores.textoTenue,
  },
  seccionVacia: {
    fontSize: letra.pequena,
    color: colores.textoTenue,
    paddingVertical: espacio.sm,
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colores.tarjeta,
    borderRadius: radio.lg,
    paddingVertical: espacio.md,
    paddingHorizontal: espacio.lg,
    marginBottom: espacio.sm,
    gap: espacio.md,
  },
  filaInfo: {
    flex: 1,
    minHeight: TOQUE_MINIMO,
    justifyContent: 'center',
    gap: 2,
  },
  nombre: {
    fontSize: letra.normal,
    fontWeight: '700',
    color: colores.texto,
  },
  inactivo: {
    color: colores.textoTenue,
  },
  descripcion: {
    fontSize: letra.pequena,
    color: colores.textoTenue,
  },
  precio: {
    fontSize: letra.normal,
    fontWeight: '700',
    color: colores.acentoOscuro,
  },
  disponible: {
    alignItems: 'center',
    minWidth: 96,
  },
  disponibleTexto: {
    fontSize: letra.pequena,
    color: colores.textoTenue,
    fontWeight: '600',
  },
  pie: {
    marginTop: espacio.xl,
    gap: espacio.md,
  },
  pieTexto: {
    fontSize: letra.pequena,
    color: colores.textoTenue,
    textAlign: 'center',
  },
});
