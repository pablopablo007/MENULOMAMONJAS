/** Redondea a centavos para evitar errores de coma flotante (0.1 + 0.2). */
export function redondear(valor: number): number {
  return Math.round((valor + Number.EPSILON) * 100) / 100;
}

function conSeparadorMiles(entero: string): string {
  return entero.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** Formato de dinero en USD: $12.50, $1,234.00 */
export function formatoDinero(valor: number): string {
  const redondeado = redondear(valor);
  const signo = redondeado < 0 ? '-' : '';
  const [entero, decimales] = Math.abs(redondeado).toFixed(2).split('.');
  return `${signo}$${conSeparadorMiles(entero)}.${decimales}`;
}

/** Formato compacto para espacios pequeños (calendario): $85, $1.2k, $12k */
export function formatoDineroCorto(valor: number): string {
  const v = Math.abs(valor);
  if (v >= 10000) return `$${Math.round(v / 1000)}k`;
  if (v >= 1000) return `$${(Math.floor(v / 100) / 10).toFixed(1).replace(/\.0$/, '')}k`;
  return `$${Math.round(v)}`;
}

/**
 * Convierte lo que escribe el usuario en un precio.
 * Acepta "2.50", "2,50", "$3" o " 4 ". Devuelve null si no es un número válido.
 */
export function parsearPrecio(texto: string): number | null {
  const limpio = texto.trim().replace(/\$/g, '').replace(/\s/g, '').replace(',', '.');
  if (!/^(\d+(\.\d{0,2})?|\.\d{1,2})$/.test(limpio)) return null;
  const numero = Number(limpio);
  return Number.isFinite(numero) ? redondear(numero) : null;
}

/** Texto para mostrar un precio en un campo editable: 2.5 -> "2.50" */
export function precioParaCampo(valor: number): string {
  return redondear(valor).toFixed(2);
}
