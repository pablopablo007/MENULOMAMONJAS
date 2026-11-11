import { Pressable, StyleSheet, Text, View } from 'react-native';

import { formatoDinero, redondear } from '../lib/dinero';
import { diasDeLaSemana, finSemana, formatoMes, formatoRango, inicioSemana, semanasDelMes } from '../lib/fechas';
import { plural } from '../lib/texto';
import { TOQUE_MINIMO, colores, espacio, letra, radio } from '../theme';
import type { TotalDia } from '../types';
import { CabeceraNavegacion } from './CabeceraNavegacion';

/** Letras de los días, la semana empieza el lunes. */
const LETRAS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

interface Props {
  /** Primer día del mes que se muestra ('yyyy-MM-01'). */
  mesVisible: string;
  /** Cualquier fecha de la semana elegida. */
  seleccionada: string;
  hoy: string;
  /** Totales por día; deben cubrir las semanas completas del mes (incluidos días del mes anterior o siguiente). */
  totales: Map<string, TotalDia>;
  /** Recibe el lunes de la semana tocada. */
  onSeleccionar: (lunes: string) => void;
  onCambiarMes: (delta: -1 | 1) => void;
  onHoy: () => void;
}

/** Calendario del modo Semana: una fila por semana del mes, con sus días y el total vendido. */
export function SelectorSemana({ mesVisible, seleccionada, hoy, totales, onSeleccionar, onCambiarMes, onHoy }: Props) {
  const lunesElegido = inicioSemana(seleccionada);
  const lunesHoy = inicioSemana(hoy);
  const mes = mesVisible.slice(0, 7);

  return (
    <View style={estilos.contenedor}>
      <CabeceraNavegacion titulo={formatoMes(mesVisible)} unidad="Mes" onCambiar={onCambiarMes} onHoy={onHoy} />
      <View style={estilos.letras} importantForAccessibility="no-hide-descendants">
        <Text style={estilos.letraRango} />
        {LETRAS.map((l) => (
          <Text key={l} style={estilos.letra}>
            {l}
          </Text>
        ))}
        <Text style={estilos.letraTotal}>Total</Text>
      </View>
      {semanasDelMes(mesVisible).map((lunes) => {
        const dias = diasDeLaSemana(lunes);
        const filas = dias.map((d) => totales.get(d));
        const total = redondear(filas.reduce((suma, t) => suma + (t?.total ?? 0), 0));
        const pedidos = filas.reduce((suma, t) => suma + (t?.pedidos ?? 0), 0);
        const elegida = lunes === lunesElegido;
        const actual = lunes === lunesHoy;
        const rango = formatoRango(lunes, finSemana(lunes));
        return (
          <Pressable
            key={lunes}
            onPress={() => onSeleccionar(lunes)}
            accessibilityRole="button"
            accessibilityState={{ selected: elegida }}
            accessibilityLabel={`${actual ? 'Esta semana, ' : ''}${rango}: ${
              total > 0 ? `vendido ${formatoDinero(total)}, ${plural(pedidos, 'pedido', 'pedidos')}` : 'sin ventas'
            }`}
            style={({ pressed }) => [
              estilos.semana,
              actual && estilos.semanaActual,
              elegida && estilos.semanaElegida,
              pressed && { opacity: 0.7 },
            ]}
          >
            <Text style={[estilos.rango, elegida && estilos.textoElegido]} numberOfLines={2}>
              {rango.replace(/ \d{4}$/, '')}
            </Text>
            {dias.map((d, i) => {
              const conVentas = (filas[i]?.total ?? 0) > 0;
              const fueraDelMes = d.slice(0, 7) !== mes;
              return (
                <View key={d} style={estilos.diaCaja}>
                  <View style={[estilos.dia, conVentas && (elegida ? estilos.diaConVentasElegida : estilos.diaConVentas)]}>
                    <Text
                      style={[
                        estilos.diaNumero,
                        fueraDelMes && estilos.diaFuera,
                        conVentas && !elegida && estilos.diaNumeroConVentas,
                        elegida && estilos.textoElegido,
                      ]}
                    >
                      {Number(d.slice(8))}
                    </Text>
                  </View>
                </View>
              );
            })}
            <Text
              style={[estilos.total, total === 0 && estilos.totalCero, elegida && estilos.textoElegido]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
            >
              {formatoDinero(total)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    backgroundColor: colores.tarjeta,
    borderRadius: radio.lg,
    paddingHorizontal: espacio.sm,
    paddingBottom: espacio.sm,
    gap: espacio.xs,
  },
  letras: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: espacio.xs,
    paddingHorizontal: espacio.sm,
  },
  letraRango: {
    width: 64,
  },
  letra: {
    flex: 1,
    textAlign: 'center',
    fontSize: letra.pequena,
    fontWeight: '700',
    color: colores.textoTenue,
  },
  letraTotal: {
    width: 76,
    textAlign: 'right',
    fontSize: letra.pequena,
    fontWeight: '700',
    color: colores.textoTenue,
  },
  semana: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: TOQUE_MINIMO + 8,
    paddingHorizontal: espacio.sm,
    borderRadius: radio.md,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: colores.fondo,
  },
  semanaActual: {
    borderColor: colores.acento,
  },
  semanaElegida: {
    backgroundColor: colores.acento,
    borderColor: colores.acento,
  },
  rango: {
    width: 64,
    fontSize: letra.pequena,
    fontWeight: '800',
    color: colores.texto,
  },
  diaCaja: {
    flex: 1,
    alignItems: 'center',
  },
  dia: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  diaConVentas: {
    backgroundColor: colores.exitoSuave,
  },
  diaConVentasElegida: {
    backgroundColor: colores.acentoOscuro,
  },
  diaNumero: {
    fontSize: letra.pequena,
    fontWeight: '600',
    color: colores.textoSecundario,
  },
  diaNumeroConVentas: {
    color: colores.exito,
    fontWeight: '800',
  },
  diaFuera: {
    color: colores.deshabilitado,
  },
  total: {
    width: 76,
    textAlign: 'right',
    fontSize: letra.pequena,
    fontWeight: '800',
    color: colores.exito,
  },
  totalCero: {
    color: colores.deshabilitado,
  },
  textoElegido: {
    color: colores.sobreAcento,
  },
});
