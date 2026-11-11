/**
 * Tema visual de la app: colores, espaciados, tamaños de letra y radios.
 * Todas las pantallas y componentes usan estos valores (nada de colores sueltos).
 */
export const colores = {
  fondo: '#F3F4F6',
  tarjeta: '#FFFFFF',
  texto: '#111827',
  textoSecundario: '#374151',
  textoTenue: '#6B7280',
  borde: '#E5E7EB',
  bordeFuerte: '#D1D5DB',
  acento: '#C2410C',
  acentoOscuro: '#9A3412',
  acentoSuave: '#FFEDD5',
  sobreAcento: '#FFFFFF',
  peligro: '#B91C1C',
  peligroSuave: '#FEE2E2',
  exito: '#15803D',
  exitoSuave: '#DCFCE7',
  aviso: '#92400E',
  avisoSuave: '#FEF3C7',
  deshabilitado: '#9CA3AF',
  fondoModal: 'rgba(17, 24, 39, 0.45)',
} as const;

export const espacio = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const letra = {
  /** Tamaño mínimo permitido en la app (14 pt). */
  pequena: 14,
  normal: 16,
  media: 18,
  grande: 20,
  titulo: 24,
  enorme: 30,
} as const;

export const radio = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
} as const;

/** Alto mínimo de cualquier elemento táctil (44 pt). */
export const TOQUE_MINIMO = 44;
/** Alto de los botones principales. */
export const ALTO_BOTON = 52;

export const sombra = {
  shadowColor: '#000000',
  shadowOpacity: 0.06,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 2 },
  elevation: 2,
} as const;
