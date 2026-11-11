import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';

import { ALTO_BOTON, TOQUE_MINIMO, colores, espacio, letra, radio } from '../theme';

export type NombreIcono = ComponentProps<typeof Ionicons>['name'];
type Variante = 'primario' | 'secundario' | 'peligro' | 'fantasma';

interface Props {
  titulo: string;
  onPress: () => void;
  variante?: Variante;
  icono?: NombreIcono;
  cargando?: boolean;
  deshabilitado?: boolean;
  grande?: boolean;
  estilo?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

const COLORES: Record<Variante, { fondo: string; texto: string; borde: string }> = {
  primario: { fondo: colores.acento, texto: colores.sobreAcento, borde: colores.acento },
  secundario: { fondo: colores.tarjeta, texto: colores.acento, borde: colores.acento },
  peligro: { fondo: colores.tarjeta, texto: colores.peligro, borde: colores.peligro },
  fantasma: { fondo: 'transparent', texto: colores.acento, borde: 'transparent' },
};

export function Boton({
  titulo,
  onPress,
  variante = 'primario',
  icono,
  cargando = false,
  deshabilitado = false,
  grande = false,
  estilo,
  accessibilityLabel,
}: Props) {
  const inactivo = deshabilitado || cargando;
  const c = COLORES[variante];
  const fondo = inactivo && variante === 'primario' ? colores.deshabilitado : c.fondo;
  const borde = inactivo && variante !== 'fantasma' ? colores.deshabilitado : c.borde;
  const texto = inactivo && variante !== 'primario' ? colores.deshabilitado : c.texto;

  return (
    <Pressable
      onPress={onPress}
      disabled={inactivo}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? titulo}
      accessibilityState={{ disabled: inactivo, busy: cargando }}
      style={({ pressed }) => [
        estilos.base,
        grande && estilos.grande,
        { backgroundColor: fondo, borderColor: borde, opacity: pressed ? 0.8 : 1 },
        estilo,
      ]}
    >
      {cargando ? (
        <ActivityIndicator color={texto} />
      ) : (
        icono && <Ionicons name={icono} size={grande ? 22 : 20} color={texto} />
      )}
      <Text style={[estilos.texto, grande && estilos.textoGrande, { color: texto }]} numberOfLines={1}>
        {titulo}
      </Text>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  base: {
    minHeight: TOQUE_MINIMO,
    paddingHorizontal: espacio.lg,
    borderRadius: radio.md,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: espacio.sm,
  },
  grande: {
    minHeight: ALTO_BOTON + 4,
    borderRadius: radio.lg,
  },
  texto: {
    fontSize: letra.normal,
    fontWeight: '700',
    flexShrink: 1,
  },
  textoGrande: {
    fontSize: letra.media,
  },
});
