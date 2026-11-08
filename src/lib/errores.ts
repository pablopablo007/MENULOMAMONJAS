/** Convierte cualquier error en un mensaje legible para mostrar al usuario. */
export function mensajeDeError(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'string' && error) return error;
  return 'Ocurrió un error inesperado. Intenta de nuevo.';
}
