import { createContext, memo, useContext, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Calendar, type DateData } from 'react-native-calendars';

import { formatoDinero, formatoDineroCorto } from '../lib/dinero';
import { formatoFechaLarga, formatoMes } from '../lib/fechas';
import { colores, espacio, letra, radio } from '../theme';
import { CabeceraNavegacion } from './CabeceraNavegacion';
import { PRIMER_DIA_SEMANA } from './calendarioLocale';

/** La semana empieza el lunes. */
const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

interface ContextoCalendario {
  seleccionada: string;
  hoy: string;
  totales: Map<string, number>;
  onSeleccionar: (fecha: string) => void;
}

const Contexto = createContext<ContextoCalendario | null>(null);

/** Día personalizado: número y, debajo, el total vendido en pequeño. */
const DiaCalendario = memo(function DiaCalendario({ date }: { date?: DateData }) {
  const ctx = useContext(Contexto);
  if (!date || !ctx) return null;
  const fecha = date.dateString;
  const total = ctx.totales.get(fecha) ?? 0;
  const conVentas = total > 0;
  const seleccionado = fecha === ctx.seleccionada;
  const esHoy = fecha === ctx.hoy;

  return (
    <Pressable
      onPress={() => ctx.onSeleccionar(fecha)}
      accessibilityRole="button"
      accessibilityState={{ selected: seleccionado }}
      accessibilityLabel={`${esHoy ? 'Hoy, ' : ''}${formatoFechaLarga(fecha)}, ${
        conVentas ? `vendido ${formatoDinero(total)}` : 'sin ventas'
      }`}
      style={({ pressed }) => [
        estilos.dia,
        esHoy && estilos.diaHoy,
        seleccionado && estilos.diaSeleccionado,
        pressed && { opacity: 0.7 },
      ]}
    >
      <Text
        style={[
          estilos.numero,
          !conVentas && estilos.sinVentas,
          esHoy && estilos.numeroHoy,
          seleccionado && estilos.textoSeleccionado,
        ]}
      >
        {date.day}
      </Text>
      <Text
        style={[estilos.monto, seleccionado && estilos.textoSeleccionado]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.85}
      >
        {conVentas ? formatoDineroCorto(total) : ' '}
      </Text>
    </Pressable>
  );
});

function EncabezadoDias() {
  return (
    <View style={estilos.diasSemana} importantForAccessibility="no-hide-descendants">
      {DIAS_SEMANA.map((d) => (
        <Text key={d} style={estilos.diaSemana}>
          {d}
        </Text>
      ))}
    </View>
  );
}

interface Props {
  /** Primer día del mes que se muestra ('yyyy-MM-01'). */
  mesVisible: string;
  seleccionada: string;
  hoy: string;
  totales: Map<string, number>;
  onSeleccionar: (fecha: string) => void;
  onCambiarMes: (delta: -1 | 1) => void;
  onHoy: () => void;
}

export function Calendario({ mesVisible, seleccionada, hoy, totales, onSeleccionar, onCambiarMes, onHoy }: Props) {
  const contexto = useMemo(
    () => ({ seleccionada, hoy, totales, onSeleccionar }),
    [seleccionada, hoy, totales, onSeleccionar],
  );

  return (
    <View style={estilos.contenedor}>
      <CabeceraNavegacion titulo={formatoMes(mesVisible)} unidad="Mes" onCambiar={onCambiarMes} onHoy={onHoy} />
      <Contexto.Provider value={contexto}>
        <Calendar
          initialDate={mesVisible}
          firstDay={PRIMER_DIA_SEMANA}
          hideExtraDays
          hideArrows
          disableMonthChange
          customHeader={EncabezadoDias}
          dayComponent={DiaCalendario}
          theme={{ calendarBackground: colores.tarjeta, weekVerticalMargin: 2 }}
        />
      </Contexto.Provider>
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    backgroundColor: colores.tarjeta,
    borderRadius: radio.lg,
    paddingHorizontal: espacio.sm,
    paddingBottom: espacio.sm,
  },
  diasSemana: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: espacio.sm,
  },
  diaSemana: {
    flex: 1,
    textAlign: 'center',
    fontSize: letra.pequena,
    fontWeight: '700',
    color: colores.textoTenue,
  },
  dia: {
    alignSelf: 'stretch',
    marginHorizontal: 2,
    minHeight: 52,
    borderRadius: radio.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  diaHoy: {
    borderColor: colores.acento,
  },
  diaSeleccionado: {
    backgroundColor: colores.acento,
    borderColor: colores.acento,
  },
  numero: {
    fontSize: letra.normal,
    fontWeight: '700',
    color: colores.texto,
  },
  numeroHoy: {
    color: colores.acentoOscuro,
  },
  sinVentas: {
    color: colores.deshabilitado,
    fontWeight: '500',
  },
  monto: {
    fontSize: letra.pequena,
    fontWeight: '700',
    color: colores.exito,
  },
  textoSeleccionado: {
    color: colores.sobreAcento,
  },
});
