import { StyleSheet, View } from 'react-native';
import { Calendar } from 'react-native-calendars';

import { colores, espacio } from '../theme';
import { PRIMER_DIA_SEMANA } from './calendarioLocale';
import { HojaInferior } from './HojaInferior';

interface Props {
  visible: boolean;
  titulo: string;
  valor: string;
  onElegir: (fecha: string) => void;
  onCerrar: () => void;
}

/** Bottom sheet con un calendario para elegir una fecha. */
export function SelectorFecha({ visible, titulo, valor, onElegir, onCerrar }: Props) {
  return (
    <HojaInferior visible={visible} onCerrar={onCerrar} titulo={titulo}>
      <View style={estilos.cuerpo}>
        <Calendar
          initialDate={valor}
          firstDay={PRIMER_DIA_SEMANA}
          markedDates={{ [valor]: { selected: true, selectedColor: colores.acento } }}
          onDayPress={(d) => onElegir(d.dateString)}
          enableSwipeMonths
          theme={{
            calendarBackground: colores.tarjeta,
            arrowColor: colores.acento,
            todayTextColor: colores.acento,
            textDayFontSize: 16,
            textMonthFontSize: 18,
            textMonthFontWeight: '800',
            textDayHeaderFontSize: 14,
          }}
          style={estilos.calendario}
        />
      </View>
    </HojaInferior>
  );
}

const estilos = StyleSheet.create({
  cuerpo: {
    paddingHorizontal: espacio.lg,
  },
  calendario: {
    borderRadius: 12,
    paddingBottom: espacio.sm,
  },
});
