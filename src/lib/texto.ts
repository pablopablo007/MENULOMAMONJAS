const SIN_TILDE: Record<string, string> = {
  á: 'a', à: 'a', ä: 'a', â: 'a',
  é: 'e', è: 'e', ë: 'e', ê: 'e',
  í: 'i', ì: 'i', ï: 'i', î: 'i',
  ó: 'o', ò: 'o', ö: 'o', ô: 'o',
  ú: 'u', ù: 'u', ü: 'u', û: 'u',
  ñ: 'n', ç: 'c',
};

/**
 * Normaliza texto para búsquedas: minúsculas y sin tildes ("Café" -> "cafe").
 * Usa un mapa propio en vez de String.normalize para no depender del motor de JavaScript.
 */
export function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .replace(/[áàäâéèëêíìïîóòöôúùüûñç]/g, (letra) => SIN_TILDE[letra] ?? letra)
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
