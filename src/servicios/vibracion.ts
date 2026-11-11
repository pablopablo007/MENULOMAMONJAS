import * as Haptics from 'expo-haptics';

/** Vibración corta al agregar un producto. Si el celular no la soporta, no pasa nada. */
export function vibrarAlAgregar(): void {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
}

/** Vibración de éxito al generar un pedido. */
export function vibrarExito(): void {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
}
