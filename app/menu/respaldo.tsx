import { Ionicons } from '@expo/vector-icons';
import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Boton } from '../../src/components/Boton';
import { Chip } from '../../src/components/Chip';
import { SelectorFecha } from '../../src/components/SelectorFecha';
import { Tarjeta } from '../../src/components/Tarjeta';
import { useDb } from '../../src/db/DbContext';
import { obtenerUltimoRespaldo, registrarRespaldo } from '../../src/db/ajustesRepo';
import { borrarTodosLosPedidos, listarPedidosRango } from '../../src/db/pedidosRepo';
import { contarDatos, exportarRespaldo, restaurarRespaldo, type ConteoDatos } from '../../src/db/respaldoRepo';
import { useAlEnfocar } from '../../src/hooks/useAlEnfocar';
import { generarCsvVentas } from '../../src/lib/csv';
import { mensajeDeError } from '../../src/lib/errores';
import {
  diasDesde,
  finMes,
  finSemana,
  formatoFechaHora,
  formatoFechaNumerica,
  haceCuanto,
  hoyISO,
  inicioMes,
  inicioSemana,
  sumarMeses,
} from '../../src/lib/fechas';
import { ErrorRespaldo, leerRespaldoDesdeTexto, nombreArchivoRespaldo } from '../../src/lib/respaldo';
import { plural } from '../../src/lib/texto';
import { useNube } from '../../src/nube/NubeContext';
import { compartirArchivo, elegirArchivoDeTexto } from '../../src/servicios/archivos';
import { usePedidoActual } from '../../src/store/pedidoActual';
import { TOQUE_MINIMO, colores, espacio, letra, radio } from '../../src/theme';
import type { Respaldo } from '../../src/types';

const DIAS_AVISO = 7;

type Rango = 'hoy' | 'semana' | 'mes' | 'mesAnterior' | 'personalizado';
type Ocupado = 'respaldo' | 'csv' | 'restaurar' | 'borrar' | null;

function rangoPredefinido(rango: Exclude<Rango, 'personalizado'>, hoy: string): [string, string] {
  switch (rango) {
    case 'hoy':
      return [hoy, hoy];
    case 'semana':
      return [inicioSemana(hoy), finSemana(hoy)];
    case 'mes':
      return [inicioMes(hoy), finMes(hoy)];
    case 'mesAnterior': {
      const anterior = sumarMeses(inicioMes(hoy), -1);
      return [anterior, finMes(anterior)];
    }
  }
}

function CampoFecha({ etiqueta, valor, onPress }: { etiqueta: string; valor: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${etiqueta}: ${formatoFechaNumerica(valor)}. Cambiar fecha`}
      style={({ pressed }) => [estilos.campoFecha, pressed && { opacity: 0.7 }]}
    >
      <Text style={estilos.campoFechaEtiqueta}>{etiqueta}</Text>
      <View style={estilos.campoFechaFila}>
        <Ionicons name="calendar-outline" size={18} color={colores.acento} />
        <Text style={estilos.campoFechaValor}>{formatoFechaNumerica(valor)}</Text>
      </View>
    </Pressable>
  );
}

export default function RespaldoPantalla() {
  const db = useDb();
  const nube = useNube();
  const hoy = hoyISO();
  const [ultimo, setUltimo] = useState<string | null>(null);
  const [conteo, setConteo] = useState<ConteoDatos | null>(null);
  const [ocupado, setOcupado] = useState<Ocupado>(null);
  const [rango, setRango] = useState<Rango>('mes');
  const [desde, setDesde] = useState(inicioMes(hoy));
  const [hasta, setHasta] = useState(hoy);
  const [eligiendo, setEligiendo] = useState<'desde' | 'hasta' | null>(null);

  const cargar = useCallback(() => {
    Promise.all([obtenerUltimoRespaldo(db), contarDatos(db)])
      .then(([u, c]) => {
        setUltimo(u);
        setConteo(c);
      })
      .catch((e: unknown) => Alert.alert('No se pudo leer la información', mensajeDeError(e)));
  }, [db]);
  useAlEnfocar(cargar);

  const elegirRango = (nuevo: Exclude<Rango, 'personalizado'>) => {
    const [d, h] = rangoPredefinido(nuevo, hoy);
    setRango(nuevo);
    setDesde(d);
    setHasta(h);
  };

  const exportarJson = async () => {
    setOcupado('respaldo');
    try {
      const datos = await exportarRespaldo(db);
      await compartirArchivo({
        nombre: nombreArchivoRespaldo(hoyISO()),
        contenido: JSON.stringify(datos, null, 2),
        mimeType: 'application/json',
        uti: 'public.json',
        titulo: 'Guardar respaldo',
      });
      await registrarRespaldo(db);
      cargar();
    } catch (e) {
      Alert.alert('No se pudo exportar el respaldo', mensajeDeError(e));
    } finally {
      setOcupado(null);
    }
  };

  const exportarCsv = async () => {
    if (desde > hasta) {
      Alert.alert('Rango no válido', 'La fecha "Desde" debe ser anterior o igual a "Hasta".');
      return;
    }
    setOcupado('csv');
    try {
      const pedidos = await listarPedidosRango(db, desde, hasta);
      if (!pedidos.some((p) => p.estado === 'activo')) {
        Alert.alert('Sin ventas', 'No hay pedidos (sin contar los anulados) en ese rango de fechas.');
        return;
      }
      await compartirArchivo({
        nombre: `ventas-${desde}-a-${hasta}.csv`,
        contenido: generarCsvVentas(pedidos),
        mimeType: 'text/csv',
        uti: 'public.comma-separated-values-text',
        titulo: 'Exportar ventas',
      });
    } catch (e) {
      Alert.alert('No se pudo exportar el CSV', mensajeDeError(e));
    } finally {
      setOcupado(null);
    }
  };

  const aplicarRestauracion = async (respaldo: Respaldo) => {
    setOcupado('restaurar');
    try {
      await restaurarRespaldo(db, respaldo);
      usePedidoActual.getState().limpiar();
      cargar();
      Alert.alert(
        'Respaldo restaurado',
        `Se cargaron ${plural(respaldo.productos.length, 'producto', 'productos')} y ${plural(respaldo.pedidos.length, 'pedido', 'pedidos')}.`,
      );
    } catch (e) {
      Alert.alert('No se pudo restaurar', `${mensajeDeError(e)}\n\nTus datos actuales no se modificaron.`);
    } finally {
      setOcupado(null);
    }
  };

  const restaurar = async () => {
    let elegido: Awaited<ReturnType<typeof elegirArchivoDeTexto>>;
    try {
      elegido = await elegirArchivoDeTexto();
    } catch (e) {
      Alert.alert('No se pudo abrir el archivo', mensajeDeError(e));
      return;
    }
    if (!elegido) return;

    let respaldo: Respaldo;
    try {
      respaldo = leerRespaldoDesdeTexto(elegido.contenido);
    } catch (e) {
      const detalle = e instanceof ErrorRespaldo ? e.message : mensajeDeError(e);
      Alert.alert('Archivo no válido', `"${elegido.nombre}" no se puede restaurar.\n\n${detalle}`);
      return;
    }

    const actuales = conteo ?? (await contarDatos(db));
    const fechaRespaldo = respaldo.exportado_en ? ` del ${formatoFechaHora(respaldo.exportado_en)}` : '';
    Alert.alert(
      '¿Reemplazar todos los datos?',
      `Respaldo${fechaRespaldo}: ${plural(respaldo.productos.length, 'producto', 'productos')} y ${plural(respaldo.pedidos.length, 'pedido', 'pedidos')}.\n\n` +
        `Se BORRARÁN los datos actuales de este celular (${plural(actuales.productos, 'producto', 'productos')} y ${plural(actuales.pedidos, 'pedido', 'pedidos')}) y se reemplazarán por los del respaldo. Esta acción no se puede deshacer.\n\n` +
        'Si no estás seguro, cancela y primero exporta un respaldo de los datos actuales.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Reemplazar datos', style: 'destructive', onPress: () => void aplicarRestauracion(respaldo) },
      ],
    );
  };

  const aplicarBorrado = async () => {
    setOcupado('borrar');
    try {
      const borrados = await borrarTodosLosPedidos(db);
      // Si hay nube, los pedidos se borran también allá en la siguiente sincronización.
      void nube.sincronizarAhora();
      Alert.alert('Listo', `${plural(borrados, 'pedido borrado', 'pedidos borrados')}. El próximo pedido será el #1.`);
      cargar();
    } catch (e) {
      Alert.alert('No se pudieron borrar los pedidos', mensajeDeError(e));
    } finally {
      setOcupado(null);
    }
  };

  const confirmarBorrarPedidos = () => {
    const cantidad = conteo ? plural(conteo.pedidos, 'pedido', 'pedidos') : 'todos los pedidos';
    Alert.alert(
      '¿Borrar todos los pedidos?',
      `Se BORRARÁN ${cantidad} de este celular${nube.estado === 'conectada' ? ' y de la nube' : ''}, también los resúmenes de ventas. ` +
        'El menú y las categorías no se tocan. Esta acción no se puede deshacer.\n\n' +
        'Úsalo solo para empezar de cero después de probar la app.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Borrar pedidos', style: 'destructive', onPress: () => void aplicarBorrado() },
      ],
    );
  };

  const dias = ultimo ? diasDesde(ultimo) : null;
  const aviso = dias === null || dias > DIAS_AVISO;

  return (
    <ScrollView contentContainerStyle={estilos.contenido}>
      <View style={[estilos.estado, aviso ? estilos.estadoAviso : estilos.estadoOk]}>
        <Ionicons
          name={aviso ? 'warning-outline' : 'cloud-done-outline'}
          size={28}
          color={aviso ? colores.aviso : colores.exito}
        />
        <View style={estilos.estadoTextos}>
          <Text style={estilos.estadoTitulo}>
            {ultimo ? `Último respaldo: ${formatoFechaHora(ultimo)}` : 'Aún no has hecho ningún respaldo'}
          </Text>
          <Text style={[estilos.estadoDetalle, aviso && { color: colores.aviso }]}>
            {ultimo
              ? aviso
                ? `Fue ${haceCuanto(ultimo)}. Te recomendamos hacer uno nuevo.`
                : `Fue ${haceCuanto(ultimo)}.`
              : 'Tus datos solo están en este celular. Si se pierde o se daña, se pierden los pedidos.'}
          </Text>
        </View>
      </View>

      <Tarjeta estilo={estilos.tarjeta}>
        <Text style={estilos.titulo}>Exportar respaldo</Text>
        <Text style={estilos.texto}>
          Crea un archivo con el menú, las categorías y todos los pedidos
          {conteo ? ` (${plural(conteo.pedidos, 'pedido', 'pedidos')})` : ''}. Guárdalo en Google Drive, envíalo por
          WhatsApp o por correo.
        </Text>
        <Boton
          titulo="Exportar respaldo"
          icono="cloud-upload-outline"
          grande
          cargando={ocupado === 'respaldo'}
          deshabilitado={ocupado !== null}
          onPress={() => void exportarJson()}
        />
      </Tarjeta>

      <Tarjeta estilo={estilos.tarjeta}>
        <Text style={estilos.titulo}>Exportar ventas a Excel (CSV)</Text>
        <Text style={estilos.texto}>Un archivo con una fila por pedido del rango elegido. Los pedidos anulados no se incluyen.</Text>
        <View style={estilos.chips}>
          <Chip etiqueta="Hoy" seleccionado={rango === 'hoy'} onPress={() => elegirRango('hoy')} />
          <Chip etiqueta="Esta semana" seleccionado={rango === 'semana'} onPress={() => elegirRango('semana')} />
          <Chip etiqueta="Este mes" seleccionado={rango === 'mes'} onPress={() => elegirRango('mes')} />
          <Chip etiqueta="Mes anterior" seleccionado={rango === 'mesAnterior'} onPress={() => elegirRango('mesAnterior')} />
        </View>
        <View style={estilos.fechas}>
          <CampoFecha etiqueta="Desde" valor={desde} onPress={() => setEligiendo('desde')} />
          <CampoFecha etiqueta="Hasta" valor={hasta} onPress={() => setEligiendo('hasta')} />
        </View>
        <Boton
          titulo="Exportar CSV"
          icono="document-text-outline"
          variante="secundario"
          grande
          cargando={ocupado === 'csv'}
          deshabilitado={ocupado !== null}
          onPress={() => void exportarCsv()}
        />
      </Tarjeta>

      <Tarjeta estilo={estilos.tarjeta}>
        <Text style={estilos.titulo}>Restaurar respaldo</Text>
        <Text style={estilos.texto}>
          Elige un archivo de respaldo (.json) exportado desde esta app. Se reemplazarán TODOS los datos de este celular.
          Antes de reemplazar se te pedirá confirmación.
        </Text>
        <Boton
          titulo="Restaurar respaldo"
          icono="cloud-download-outline"
          variante="peligro"
          grande
          cargando={ocupado === 'restaurar'}
          deshabilitado={ocupado !== null}
          onPress={() => void restaurar()}
        />
      </Tarjeta>

      <Tarjeta estilo={estilos.tarjeta}>
        <Text style={estilos.titulo}>Empezar de cero</Text>
        <Text style={estilos.texto}>
          Borra todos los pedidos{conteo ? ` (${plural(conteo.pedidos, 'pedido', 'pedidos')})` : ''} para dejar las ventas en
          cero, por ejemplo después de probar la app. El menú y las categorías se quedan como están.
        </Text>
        <Boton
          titulo="Borrar todos los pedidos"
          icono="trash-outline"
          variante="peligro"
          grande
          cargando={ocupado === 'borrar'}
          deshabilitado={ocupado !== null || conteo?.pedidos === 0}
          onPress={confirmarBorrarPedidos}
        />
      </Tarjeta>

      <SelectorFecha
        visible={eligiendo !== null}
        titulo={eligiendo === 'desde' ? 'Desde' : 'Hasta'}
        valor={eligiendo === 'desde' ? desde : hasta}
        onCerrar={() => setEligiendo(null)}
        onElegir={(fecha) => {
          setRango('personalizado');
          if (eligiendo === 'desde') {
            setDesde(fecha);
            if (fecha > hasta) setHasta(fecha);
          } else {
            setHasta(fecha);
            if (fecha < desde) setDesde(fecha);
          }
          setEligiendo(null);
        }}
      />
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  contenido: {
    padding: espacio.lg,
    gap: espacio.lg,
    paddingBottom: espacio.xxl,
  },
  estado: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.md,
    borderRadius: radio.lg,
    padding: espacio.lg,
  },
  estadoOk: {
    backgroundColor: colores.exitoSuave,
  },
  estadoAviso: {
    backgroundColor: colores.avisoSuave,
  },
  estadoTextos: {
    flex: 1,
    gap: 2,
  },
  estadoTitulo: {
    fontSize: letra.normal,
    fontWeight: '800',
    color: colores.texto,
  },
  estadoDetalle: {
    fontSize: letra.pequena,
    color: colores.textoSecundario,
  },
  tarjeta: {
    gap: espacio.md,
  },
  titulo: {
    fontSize: letra.media,
    fontWeight: '800',
    color: colores.texto,
  },
  texto: {
    fontSize: letra.pequena,
    color: colores.textoSecundario,
    lineHeight: 20,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: espacio.sm,
  },
  fechas: {
    flexDirection: 'row',
    gap: espacio.sm,
  },
  campoFecha: {
    flex: 1,
    minHeight: TOQUE_MINIMO + 12,
    borderWidth: 1.5,
    borderColor: colores.bordeFuerte,
    borderRadius: radio.md,
    paddingHorizontal: espacio.md,
    paddingVertical: espacio.sm,
    justifyContent: 'center',
  },
  campoFechaEtiqueta: {
    fontSize: letra.pequena,
    color: colores.textoTenue,
    fontWeight: '600',
  },
  campoFechaFila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.xs,
  },
  campoFechaValor: {
    fontSize: letra.normal,
    fontWeight: '700',
    color: colores.texto,
  },
});
