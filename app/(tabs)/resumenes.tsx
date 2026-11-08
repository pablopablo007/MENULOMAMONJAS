import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Calendario } from '../../src/components/Calendario';
import { compartirPedido } from '../../src/components/Comprobante';
import { EstadoVacio } from '../../src/components/EstadoVacio';
import { GraficoBarras } from '../../src/components/GraficoBarras';
import { ListaMasVendidos } from '../../src/components/ListaMasVendidos';
import { PedidoDelDia } from '../../src/components/PedidoDelDia';
import { SelectorSegmentado } from '../../src/components/SelectorSegmentado';
import { GrillaResumen, TarjetaResumen } from '../../src/components/TarjetaResumen';
import { useDb } from '../../src/db/DbContext';
import { anularPedido, listarPedidosDelDia } from '../../src/db/pedidosRepo';
import { productosMasVendidos, resumenRango, totalesPorDia } from '../../src/db/resumenRepo';
import { useAlEnfocar } from '../../src/hooks/useAlEnfocar';
import { formatoDinero } from '../../src/lib/dinero';
import { mensajeDeError } from '../../src/lib/errores';
import {
  finMes,
  finSemana,
  formatoFechaCorta,
  formatoFechaLarga,
  formatoMes,
  formatoRango,
  hoyISO,
  inicioMes,
  inicioSemana,
  sumarDias,
  sumarMeses,
} from '../../src/lib/fechas';
import { agruparPorSemana, mejorDia, resumirPeriodo, serieSemanal } from '../../src/lib/resumen';
import { plural } from '../../src/lib/texto';
import { TOQUE_MINIMO, colores, espacio, letra, radio } from '../../src/theme';
import type { PedidoConItems, ProductoVendido, ResumenPeriodo, TotalDia } from '../../src/types';

type Modo = 'dia' | 'semana' | 'mes';

const OPCIONES_MODO: { valor: Modo; etiqueta: string }[] = [
  { valor: 'dia', etiqueta: 'Día' },
  { valor: 'semana', etiqueta: 'Semana' },
  { valor: 'mes', etiqueta: 'Mes' },
];

const LIMITE_MAS_VENDIDOS = 10;

interface DatosDia {
  fecha: string;
  resumen: ResumenPeriodo;
  pedidos: PedidoConItems[];
  masVendidos: ProductoVendido[];
}

interface DatosSemana {
  desde: string;
  dias: TotalDia[];
  masVendidos: ProductoVendido[];
}

interface DatosMes {
  mes: string;
  masVendidos: ProductoVendido[];
}

function Seccion({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <View style={estilos.seccion}>
      <Text style={estilos.seccionTitulo} accessibilityRole="header">
        {titulo}
      </Text>
      {children}
    </View>
  );
}

export default function ResumenesPantalla() {
  const db = useDb();
  const hoy = hoyISO();
  const [modo, setModo] = useState<Modo>('dia');
  const [seleccionada, setSeleccionada] = useState(hoy);
  const [mesVisible, setMesVisible] = useState(inicioMes(hoy));
  const [version, setVersion] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const [totalesMes, setTotalesMes] = useState<TotalDia[]>([]);
  const [dia, setDia] = useState<DatosDia | null>(null);
  const [semana, setSemana] = useState<DatosSemana | null>(null);
  const [mes, setMes] = useState<DatosMes | null>(null);
  const [expandido, setExpandido] = useState<number | null>(null);

  // Cada vez que se entra a la pestaña se vuelven a consultar los totales.
  useAlEnfocar(() => setVersion((v) => v + 1));

  const lunes = inicioSemana(seleccionada);

  // Totales por día del mes visible (para el calendario y el modo Mes).
  useEffect(() => {
    if (version === 0) return;
    let vigente = true;
    totalesPorDia(db, mesVisible, finMes(mesVisible))
      .then((filas) => vigente && setTotalesMes(filas))
      .catch((e: unknown) => vigente && setError(mensajeDeError(e)));
    return () => {
      vigente = false;
    };
  }, [db, mesVisible, version]);

  // Datos del modo seleccionado.
  useEffect(() => {
    if (version === 0) return;
    let vigente = true;
    const fallar = (e: unknown) => vigente && setError(mensajeDeError(e));
    setError(null);
    if (modo === 'dia') {
      Promise.all([
        resumenRango(db, seleccionada, seleccionada),
        listarPedidosDelDia(db, seleccionada),
        productosMasVendidos(db, seleccionada, seleccionada),
      ])
        .then(([resumen, pedidos, masVendidos]) => {
          if (vigente) setDia({ fecha: seleccionada, resumen, pedidos, masVendidos });
        })
        .catch(fallar);
    } else if (modo === 'semana') {
      const domingo = finSemana(lunes);
      Promise.all([totalesPorDia(db, lunes, domingo), productosMasVendidos(db, lunes, domingo, LIMITE_MAS_VENDIDOS)])
        .then(([dias, masVendidos]) => {
          if (vigente) setSemana({ desde: lunes, dias, masVendidos });
        })
        .catch(fallar);
    } else {
      productosMasVendidos(db, mesVisible, finMes(mesVisible), LIMITE_MAS_VENDIDOS)
        .then((masVendidos) => {
          if (vigente) setMes({ mes: mesVisible, masVendidos });
        })
        .catch(fallar);
    }
    return () => {
      vigente = false;
    };
  }, [db, modo, seleccionada, lunes, mesVisible, version]);

  const mapaTotales = useMemo(() => new Map(totalesMes.map((t) => [t.fecha, t.total])), [totalesMes]);

  const irADia = useCallback((fecha: string) => {
    setSeleccionada(fecha);
    setMesVisible(inicioMes(fecha));
    setExpandido(null);
    setModo('dia');
  }, []);

  const cambiarSemana = (delta: -1 | 1) => {
    const nueva = sumarDias(seleccionada, delta * 7);
    setSeleccionada(nueva);
    setMesVisible(inicioMes(nueva));
  };

  const confirmarAnular = (pedido: PedidoConItems) => {
    Alert.alert(
      `Anular pedido #${pedido.numero}`,
      `¿Seguro que quieres anular este pedido de ${formatoDinero(pedido.total)}? Ya no se contará en los totales. Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Anular',
          style: 'destructive',
          onPress: () => {
            anularPedido(db, pedido.id)
              .then(() => setVersion((v) => v + 1))
              .catch((e: unknown) => Alert.alert('No se pudo anular', mensajeDeError(e)));
          },
        },
      ],
    );
  };

  const renderDia = () => {
    if (!dia || dia.fecha !== seleccionada) return <ActivityIndicator color={colores.acento} />;
    const { resumen, pedidos, masVendidos } = dia;
    return (
      <>
        <Text style={estilos.tituloPeriodo}>{formatoFechaLarga(seleccionada)}</Text>
        <GrillaResumen>
          <TarjetaResumen titulo="Total del día" valor={formatoDinero(resumen.total)} icono="cash-outline" destacada />
          <TarjetaResumen titulo="Pedidos" valor={String(resumen.pedidos)} icono="receipt-outline" />
          <TarjetaResumen titulo="Ticket promedio" valor={formatoDinero(resumen.ticketPromedio)} icono="pricetag-outline" />
        </GrillaResumen>

        <Seccion titulo="Pedidos del día">
          {pedidos.length === 0 ? (
            <EstadoVacio icono="calendar-clear-outline" titulo="No hubo pedidos este día" />
          ) : (
            <View style={estilos.lista}>
              {pedidos.map((p) => (
                <PedidoDelDia
                  key={p.id}
                  pedido={p}
                  expandido={expandido === p.id}
                  onAlternar={() => setExpandido(expandido === p.id ? null : p.id)}
                  onAnular={() => confirmarAnular(p)}
                  onCompartir={() => void compartirPedido(p)}
                />
              ))}
            </View>
          )}
        </Seccion>

        <Seccion titulo="Lo más vendido del día">
          <ListaMasVendidos productos={masVendidos} vacio="Sin ventas este día." />
        </Seccion>
      </>
    );
  };

  const renderSemana = () => {
    const domingo = finSemana(lunes);
    const datos = semana && semana.desde === lunes ? semana : null;
    const serie = serieSemanal(datos?.dias ?? [], lunes);
    const resumen = resumirPeriodo(datos?.dias ?? []);
    return (
      <>
        <View style={estilos.navegador}>
          <Pressable
            onPress={() => cambiarSemana(-1)}
            style={estilos.flecha}
            accessibilityRole="button"
            accessibilityLabel="Semana anterior"
          >
            <Ionicons name="chevron-back" size={26} color={colores.acento} />
          </Pressable>
          <Text style={estilos.navegadorTexto} accessibilityRole="header">
            {formatoRango(lunes, domingo)}
          </Text>
          <Pressable
            onPress={() => cambiarSemana(1)}
            style={estilos.flecha}
            accessibilityRole="button"
            accessibilityLabel="Semana siguiente"
          >
            <Ionicons name="chevron-forward" size={26} color={colores.acento} />
          </Pressable>
        </View>
        {!datos ? (
          <ActivityIndicator color={colores.acento} />
        ) : (
          <>
            <GrillaResumen>
              <TarjetaResumen titulo="Total de la semana" valor={formatoDinero(resumen.total)} icono="cash-outline" destacada />
              <TarjetaResumen titulo="Pedidos" valor={String(resumen.pedidos)} icono="receipt-outline" />
              <TarjetaResumen titulo="Ticket promedio" valor={formatoDinero(resumen.ticketPromedio)} icono="pricetag-outline" />
            </GrillaResumen>

            <Seccion titulo="Ventas por día">
              <View style={estilos.tarjetaGrafico}>
                {resumen.pedidos === 0 ? (
                  <EstadoVacio icono="bar-chart-outline" titulo="No hubo ventas esta semana" />
                ) : (
                  <GraficoBarras dias={serie} seleccionada={seleccionada} onSeleccionar={irADia} />
                )}
              </View>
            </Seccion>

            <Seccion titulo="Más vendidos de la semana">
              <ListaMasVendidos productos={datos.masVendidos} vacio="Sin ventas esta semana." />
            </Seccion>
          </>
        )}
      </>
    );
  };

  const renderMes = () => {
    const resumen = resumirPeriodo(totalesMes);
    const mejor = mejorDia(totalesMes);
    const semanas = agruparPorSemana(totalesMes, mesVisible);
    const maxSemana = semanas.reduce((m, s) => Math.max(m, s.total), 0);
    const datos = mes && mes.mes === mesVisible ? mes : null;
    return (
      <>
        <Text style={estilos.tituloPeriodo}>{formatoMes(mesVisible)}</Text>
        <GrillaResumen>
          <TarjetaResumen titulo="Total del mes" valor={formatoDinero(resumen.total)} icono="cash-outline" destacada />
          <TarjetaResumen titulo="Pedidos" valor={String(resumen.pedidos)} icono="receipt-outline" />
          <TarjetaResumen titulo="Ticket promedio" valor={formatoDinero(resumen.ticketPromedio)} icono="pricetag-outline" />
          <TarjetaResumen
            titulo="Mejor día"
            valor={mejor ? formatoDinero(mejor.total) : '—'}
            detalle={mejor ? `${formatoFechaCorta(mejor.fecha)} · ${plural(mejor.pedidos, 'pedido', 'pedidos')}` : 'Sin ventas este mes'}
            icono="trophy-outline"
            destacada
          />
        </GrillaResumen>

        <Seccion titulo="Totales por semana">
          <View style={estilos.semanas}>
            {semanas.map((s) => (
              <Pressable
                key={s.desde}
                onPress={() => {
                  setSeleccionada(s.desde);
                  setModo('semana');
                }}
                accessibilityRole="button"
                accessibilityLabel={`Semana ${formatoRango(s.desde, s.hasta)}: ${formatoDinero(s.total)}`}
                style={({ pressed }) => [estilos.semana, pressed && { opacity: 0.7 }]}
              >
                <View style={estilos.semanaTextos}>
                  <Text style={estilos.semanaRango}>{formatoRango(s.desde, s.hasta)}</Text>
                  <Text style={estilos.semanaPedidos}>{plural(s.pedidos, 'pedido', 'pedidos')}</Text>
                  <View style={estilos.barraFondo}>
                    <View
                      style={[
                        estilos.barra,
                        { width: `${maxSemana > 0 ? Math.max(2, (s.total / maxSemana) * 100) : 0}%` },
                      ]}
                    />
                  </View>
                </View>
                <Text style={[estilos.semanaTotal, s.total === 0 && { color: colores.deshabilitado }]}>
                  {formatoDinero(s.total)}
                </Text>
              </Pressable>
            ))}
          </View>
        </Seccion>

        <Seccion titulo="Más vendidos del mes">
          {datos ? (
            <ListaMasVendidos productos={datos.masVendidos} vacio="Sin ventas este mes." />
          ) : (
            <ActivityIndicator color={colores.acento} />
          )}
        </Seccion>
      </>
    );
  };

  return (
    <ScrollView contentContainerStyle={estilos.contenido}>
      <SelectorSegmentado opciones={OPCIONES_MODO} valor={modo} onCambiar={setModo} />

      <Calendario
        mesVisible={mesVisible}
        seleccionada={seleccionada}
        hoy={hoy}
        totales={mapaTotales}
        onSeleccionar={irADia}
        onCambiarMes={(delta) => setMesVisible(sumarMeses(mesVisible, delta))}
        onHoy={() => {
          setSeleccionada(hoy);
          setMesVisible(inicioMes(hoy));
        }}
      />

      {error ? (
        <EstadoVacio icono="alert-circle-outline" titulo="No se pudieron cargar los datos" mensaje={error} />
      ) : modo === 'dia' ? (
        renderDia()
      ) : modo === 'semana' ? (
        renderSemana()
      ) : (
        renderMes()
      )}
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  contenido: {
    padding: espacio.lg,
    gap: espacio.lg,
    paddingBottom: espacio.xxl,
  },
  tituloPeriodo: {
    fontSize: letra.grande,
    fontWeight: '800',
    color: colores.texto,
  },
  seccion: {
    gap: espacio.sm,
  },
  seccionTitulo: {
    fontSize: letra.media,
    fontWeight: '800',
    color: colores.texto,
  },
  lista: {
    gap: espacio.sm,
  },
  navegador: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colores.tarjeta,
    borderRadius: radio.lg,
  },
  flecha: {
    width: TOQUE_MINIMO + 4,
    height: TOQUE_MINIMO + 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navegadorTexto: {
    flex: 1,
    textAlign: 'center',
    fontSize: letra.media,
    fontWeight: '800',
    color: colores.texto,
  },
  tarjetaGrafico: {
    backgroundColor: colores.tarjeta,
    borderRadius: radio.lg,
    padding: espacio.md,
  },
  semanas: {
    backgroundColor: colores.tarjeta,
    borderRadius: radio.lg,
    paddingHorizontal: espacio.md,
  },
  semana: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.md,
    paddingVertical: espacio.md,
    borderBottomWidth: 1,
    borderBottomColor: colores.borde,
    minHeight: TOQUE_MINIMO,
  },
  semanaTextos: {
    flex: 1,
    gap: 2,
  },
  semanaRango: {
    fontSize: letra.normal,
    fontWeight: '700',
    color: colores.texto,
  },
  semanaPedidos: {
    fontSize: letra.pequena,
    color: colores.textoTenue,
  },
  barraFondo: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colores.fondo,
    marginTop: espacio.xs,
    overflow: 'hidden',
  },
  barra: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colores.acento,
  },
  semanaTotal: {
    fontSize: letra.normal,
    fontWeight: '800',
    color: colores.texto,
  },
});
