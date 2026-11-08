/** Normaliza texto para búsquedas: minúsculas y sin tildes ("Café" -> "cafe"). */
export function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

/** Convierte un texto vacío o con solo espacios en null. */
export function textoONulo(texto: string | null | undefined): string | null {
  if (texto == null) return null;
  const limpio = texto.trim();
  return limpio.length > 0 ? limpio : null;
}

/** "1 producto", "3 productos" */
export function plural(cantidad: number, singular: string, pluralTexto: string): string {
  return `${cantidad} ${cantidad === 1 ? singular : pluralTexto}`;
}
