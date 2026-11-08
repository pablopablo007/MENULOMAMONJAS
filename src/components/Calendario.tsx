import { Ionicons } from '@expo/vector-icons';
import { createContext, memo, useContext, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Calendar, LocaleConfig, type DateData } from 'react-native-calendars';

import { formatoDinero, formatoDineroCorto } from '../lib/dinero';
import { formatoFechaLarga, formatoMes } from '../lib/fechas';
import { TOQUE_MINIMO, colores, espacio, letra, radio } from '../theme';

// Calendario en español (nombres de meses y días).
LocaleConfig.locales.es = {
  monthNames: [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
  ],
  monthNamesShort: ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'],
  dayNames: ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'],
  dayNamesShort: ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'],
  today: 'Hoy',
};
LocaleConfig.defaultLocale = 'es';

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
      <View style={estilos.cabecera}>
        <Pressable
          onPress={() => onCambiarMes(-1)}
          style={estilos.flecha}
          accessibilityRole="button"
          accessibilityLabel="Mes anterior"
        >
          <Ionicons name="chevron-back" size={26} color={colores.acento} />
        </Pressable>
        <Text style={estilos.mes} accessibilityRole="header">
          {formatoMes(mesVisible)}
        </Text>
        <Pressable
          onPress={() => onCambiarMes(1)}
          style={estilos.flecha}
          accessibilityRole="button"
          accessibilityLabel="Mes siguiente"
        >
          <Ionicons name="chevron-forward" size={26} color={colores.acento} />
        </Pressable>
        <Pressable
          onPress={onHoy}
          style={({ pressed }) => [estilos.hoy, pressed && { opacity: 0.8 }]}
          accessibilityRole="button"
          accessibilityLabel="Ir a hoy"
        >
          <Text style={estilos.hoyTexto}>Hoy</Text>
        </Pressable>
      </View>
      <Contexto.Provider value={contexto}>
        <Calendar
          initialDate={mesVisible}
          firstDay={1}
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
  cabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: espacio.xs,
  },
  flecha: {
    width: TOQUE_MINIMO,
    height: TOQUE_MINIMO,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mes: {
    flex: 1,
    textAlign: 'center',
    fontSize: letra.media,
    fontWeight: '800',
    color: colores.texto,
  },
  hoy: {
    minHeight: TOQUE_MINIMO - 6,
    paddingHorizontal: espacio.md,
    marginLeft: espacio.xs,
    borderRadius: radio.pill,
    backgroundColor: colores.acentoSuave,
    justifyContent: 'center',
  },
  hoyTexto: {
    fontSize: letra.pequena,
    fontWeight: '800',
    color: colores.acentoOscuro,
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
