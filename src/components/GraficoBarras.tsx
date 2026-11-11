import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';

import { formatoDinero } from '../lib/dinero';
import { formatoFechaLarga, letraDia } from '../lib/fechas';
import { escalaEje } from '../lib/resumen';
import { colores, espacio, letra } from '../theme';
import type { TotalDia } from '../types';

const ANCHO_EJE_Y = 48;
const SECCIONES = 4;

interface Props {
  dias: TotalDia[];
  seleccionada?: string;
  onSeleccionar: (fecha: string) => void;
}

/** Gráfico de barras con el total de cada día. Al tocar una barra se abre ese día. */
export function GraficoBarras({ dias, seleccionada, onSeleccionar }: Props) {
  const [ancho, setAncho] = useState(0);
  const maximo = dias.reduce((m, d) => Math.max(m, d.total), 0);
  const escala = escalaEje(maximo, SECCIONES);

  const anchoGrafico = Math.max(0, ancho - ANCHO_EJE_Y - espacio.md);
  const columna = dias.length > 0 ? anchoGrafico / dias.length : 0;
  const anchoBarra = Math.max(14, Math.floor(columna * 0.6));
  const separacion = Math.max(4, columna - anchoBarra);

  const datos = dias.map((d) => ({
    value: d.total,
    label: letraDia(d.fecha),
    frontColor: d.fecha === seleccionada ? colores.acentoOscuro : colores.acento,
    onPress: () => onSeleccionar(d.fecha),
    accessibilityLabel: `${formatoFechaLarga(d.fecha)}: ${formatoDinero(d.total)}`,
  }));

  return (
    <View style={estilos.contenedor} testID="grafico-barras" onLayout={(e) => setAncho(e.nativeEvent.layout.width)}>
      {ancho > 0 ? (
        <BarChart
          data={datos}
          width={anchoGrafico}
          height={180}
          barWidth={anchoBarra}
          spacing={separacion}
          initialSpacing={separacion / 2}
          endSpacing={0}
          noOfSections={SECCIONES}
          maxValue={escala.maximo}
          stepValue={escala.paso}
          yAxisLabelPrefix="$"
          yAxisLabelWidth={ANCHO_EJE_Y}
          yAxisTextStyle={estilos.ejeTexto}
          xAxisLabelTextStyle={estilos.ejeTexto}
          yAxisColor={colores.borde}
          xAxisColor={colores.bordeFuerte}
          rulesColor={colores.borde}
          barBorderTopLeftRadius={6}
          barBorderTopRightRadius={6}
          disableScroll
        />
      ) : null}
      <Text style={estilos.ayuda}>Toca una barra para ver el detalle de ese día.</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    width: '100%',
    gap: espacio.sm,
  },
  ejeTexto: {
    fontSize: letra.pequena,
    color: colores.textoTenue,
  },
  ayuda: {
    fontSize: letra.pequena,
    color: colores.textoTenue,
    textAlign: 'center',
  },
});
