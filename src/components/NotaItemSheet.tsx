import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { formatoDinero } from '../lib/dinero';
import type { ProductoParaPedido } from '../store/pedidoActual';
import { espacio } from '../theme';
import { Boton } from './Boton';
import { CampoTexto } from './CampoTexto';
import { Chip } from './Chip';
import { HojaInferior } from './HojaInferior';

const SUGERENCIAS = ['Sin cebolla', 'Sin ají', 'Sin sal', 'Sin hielo', 'Bien cocido', 'Para llevar'];

interface Props {
  producto: ProductoParaPedido | null;
  notaActual: string;
  enPedido: boolean;
  onGuardar: (nota: string) => void;
  onCerrar: () => void;
}

/** Bottom sheet para escribir la nota de un ítem (ej. "sin cebolla"). */
export function NotaItemSheet({ producto, notaActual, enPedido, onGuardar, onCerrar }: Props) {
  const [texto, setTexto] = useState(notaActual);

  useEffect(() => {
    if (producto) setTexto(notaActual);
  }, [producto, notaActual]);

  const agregarSugerencia = (sugerencia: string) => {
    setTexto((previo) => {
      const limpio = previo.trim();
      if (limpio.toLowerCase().includes(sugerencia.toLowerCase())) return previo;
      return limpio ? `${limpio}, ${sugerencia.toLowerCase()}` : sugerencia;
    });
  };

  return (
    <HojaInferior
      visible={producto !== null}
      onCerrar={onCerrar}
      titulo={producto?.nombre ?? ''}
      subtitulo={producto ? `${formatoDinero(producto.precio)} · Nota para este producto` : undefined}
      pie={
        <>
          <Boton
            titulo={enPedido ? 'Guardar nota' : 'Agregar al pedido con nota'}
            icono={enPedido ? 'checkmark' : 'add'}
            grande
            onPress={() => onGuardar(texto.trim())}
          />
          {enPedido && notaActual ? (
            <Boton titulo="Quitar nota" variante="fantasma" onPress={() => onGuardar('')} />
          ) : null}
        </>
      }
    >
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={estilos.cuerpo}>
        <CampoTexto
          etiqueta="Nota"
          value={texto}
          onChangeText={setTexto}
          placeholder="Ej. sin cebolla, término medio"
          multiline
          maxLength={140}
          autoFocus
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={estilos.sugerencias}>
            {SUGERENCIAS.map((s) => (
              <Chip key={s} etiqueta={s} onPress={() => agregarSugerencia(s)} />
            ))}
          </View>
        </ScrollView>
      </ScrollView>
    </HojaInferior>
  );
}

const estilos = StyleSheet.create({
  cuerpo: {
    paddingHorizontal: espacio.lg,
    gap: espacio.md,
  },
  sugerencias: {
    flexDirection: 'row',
    gap: espacio.sm,
  },
});
