import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TOQUE_MINIMO, colores, espacio, letra, radio } from '../theme';

interface Props {
  visible: boolean;
  onCerrar: () => void;
  titulo: string;
  subtitulo?: string;
  children: ReactNode;
  /** Contenido fijo abajo (botones). */
  pie?: ReactNode;
  /** Alto máximo como fracción de la pantalla. */
  altoMaximo?: `${number}%`;
}

/** Modal tipo "bottom sheet": sube desde abajo, se cierra tocando el fondo o la X. */
export function HojaInferior({ visible, onCerrar, titulo, subtitulo, children, pie, altoMaximo = '90%' }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onCerrar}
      statusBarTranslucent
      navigationBarTranslucent
    >
      <KeyboardAvoidingView
        style={estilos.fondo}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onCerrar}
          accessibilityRole="button"
          accessibilityLabel="Cerrar"
        />
        <View style={[estilos.hoja, { maxHeight: altoMaximo, paddingBottom: Math.max(insets.bottom, espacio.lg) }]}>
          <View style={estilos.agarre} />
          <View style={estilos.encabezado}>
            <View style={estilos.textos}>
              <Text style={estilos.titulo} numberOfLines={2}>
                {titulo}
              </Text>
              {subtitulo ? <Text style={estilos.subtitulo}>{subtitulo}</Text> : null}
            </View>
            <Pressable
              onPress={onCerrar}
              style={estilos.cerrar}
              accessibilityRole="button"
              accessibilityLabel="Cerrar"
            >
              <Ionicons name="close" size={26} color={colores.textoSecundario} />
            </Pressable>
          </View>
          <View style={estilos.cuerpo}>{children}</View>
          {pie ? <View style={estilos.pie}>{pie}</View> : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const estilos = StyleSheet.create({
  fondo: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: colores.fondoModal,
  },
  hoja: {
    backgroundColor: colores.fondo,
    borderTopLeftRadius: radio.lg + 4,
    borderTopRightRadius: radio.lg + 4,
    paddingTop: espacio.sm,
  },
  agarre: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: colores.bordeFuerte,
    marginBottom: espacio.sm,
  },
  encabezado: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: espacio.lg,
    paddingBottom: espacio.sm,
    gap: espacio.sm,
  },
  textos: {
    flex: 1,
  },
  titulo: {
    fontSize: letra.grande,
    fontWeight: '800',
    color: colores.texto,
  },
  subtitulo: {
    fontSize: letra.pequena,
    color: colores.textoTenue,
    marginTop: 2,
  },
  cerrar: {
    width: TOQUE_MINIMO,
    height: TOQUE_MINIMO,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cuerpo: {
    flexShrink: 1,
  },
  pie: {
    paddingHorizontal: espacio.lg,
    paddingTop: espacio.md,
    gap: espacio.sm,
  },
});
