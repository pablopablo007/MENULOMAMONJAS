import { Pressable, StyleSheet, Text, View } from 'react-native';

import { formatoDinero, formatoDineroCorto } from '../lib/dinero';
import { formatoAnio, formatoMes, formatoMesCorto, inicioMes, mesesDelAnio } from '../lib/fechas';
import { TOQUE_MINIMO, colores, espacio, letra, radio } from '../theme';
import { CabeceraNavegacion } from './CabeceraNavegacion';

interface Props {
  /** Mes elegido ('yyyy-MM-01'); se muestra su año. */
  mesVisible: string;
  hoy: string;
  /** Total vendido por mes ('yyyy-MM-01' -> total) del año que se muestra. */
  totales: Map<string, number>;
  onSeleccionar: (mes: string) => void;
  onCambiarAnio: (delta: -1 | 1) => void;
  onHoy: () => void;
}

/** Calendario del modo Mes: los 12 meses del año con el total vendido en cada uno. */
export function SelectorMes({ mesVisible, hoy, totales, onSeleccionar, onCambiarAnio, onHoy }: Props) {
  const mesHoy = inicioMes(hoy);
  return (
    <View style={estilos.contenedor}>
      <CabeceraNavegacion titulo={formatoAnio(mesVisible)} unidad="Año" onCambiar={onCambiarAnio} onHoy={onHoy} />
      <View style={estilos.grilla}>
        {mesesDelAnio(mesVisible).map((mes) => {
          const total = totales.get(mes) ?? 0;
          const conVentas = total > 0;
          const elegido = mes === mesVisible;
          const actual = mes === mesHoy;
          return (
            <Pressable
              key={mes}
              onPress={() => onSeleccionar(mes)}
              accessibilityRole="button"
              accessibilityState={{ selected: elegido }}
              accessibilityLabel={`${actual ? 'Este mes, ' : ''}${formatoMes(mes)}, ${
                conVentas ? `vendido ${formatoDinero(total)}` : 'sin ventas'
              }`}
              style={({ pressed }) => [
                estilos.mes,
                actual && estilos.mesActual,
                elegido && estilos.mesElegido,
                pressed && { opacity: 0.7 },
              ]}
            >
              <Text style={[estilos.nombre, !conVentas && estilos.sinVentas, elegido && estilos.textoElegido]}>
                {formatoMesCorto(mes)}
              </Text>
              <Text style={[estilos.monto, elegido && estilos.textoElegido]} numberOfLines={1}>
                {conVentas ? formatoDineroCorto(total) : ' '}
              </Text>
            </Pressable>
          );
        })}
      </View>
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
  grilla: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingTop: espacio.sm,
  },
  mes: {
    width: '31.33%',
    margin: '1%',
    minHeight: TOQUE_MINIMO + 16,
    borderRadius: radio.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colores.fondo,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  mesActual: {
    borderColor: colores.acento,
  },
  mesElegido: {
    backgroundColor: colores.acento,
    borderColor: colores.acento,
  },
  nombre: {
    fontSize: letra.normal,
    fontWeight: '800',
    color: colores.texto,
  },
  sinVentas: {
    color: colores.deshabilitado,
    fontWeight: '600',
  },
  monto: {
    fontSize: letra.pequena,
    fontWeight: '700',
    color: colores.exito,
  },
  textoElegido: {
    color: colores.sobreAcento,
  },
});
