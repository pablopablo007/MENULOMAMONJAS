import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colores, espacio, letra, radio, sombra } from '../theme';
import type { NombreIcono } from './Boton';

interface Props {
  titulo: string;
  valor: string;
  detalle?: string;
  icono?: NombreIcono;
  destacada?: boolean;
}

/** Tarjeta con una cifra del resumen (total, pedidos, ticket promedio...). */
export function TarjetaResumen({ titulo, valor, detalle, icono, destacada = false }: Props) {
  return (
    <View
      style={[estilos.tarjeta, destacada ? estilos.completa : estilos.mitad]}
      accessible
      accessibilityLabel={`${titulo}: ${valor}${detalle ? `, ${detalle}` : ''}`}
    >
      <View style={estilos.fila}>
        {icono ? <Ionicons name={icono} size={18} color={colores.textoTenue} /> : null}
        <Text style={estilos.titulo}>{titulo}</Text>
      </View>
      <Text style={[estilos.valor, destacada && estilos.valorDestacado]} numberOfLines={1} adjustsFontSizeToFit>
        {valor}
      </Text>
      {detalle ? <Text style={estilos.detalle}>{detalle}</Text> : null}
    </View>
  );
}

/** Contenedor que acomoda las tarjetas en dos columnas. */
export function GrillaResumen({ children }: { children: ReactNode }) {
  return <View style={estilos.grilla}>{children}</View>;
}

const estilos = StyleSheet.create({
  grilla: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: espacio.sm,
  },
  tarjeta: {
    backgroundColor: colores.tarjeta,
    borderRadius: radio.lg,
    padding: espacio.md,
    gap: 2,
    ...sombra,
  },
  completa: {
    width: '100%',
  },
  mitad: {
    flexGrow: 1,
    flexBasis: '45%',
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.xs,
  },
  titulo: {
    fontSize: letra.pequena,
    fontWeight: '600',
    color: colores.textoTenue,
  },
  valor: {
    fontSize: letra.grande,
    fontWeight: '800',
    color: colores.texto,
  },
  valorDestacado: {
    fontSize: letra.enorme,
    color: colores.acentoOscuro,
  },
  detalle: {
    fontSize: letra.pequena,
    color: colores.textoSecundario,
  },
});
