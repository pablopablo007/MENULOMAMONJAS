import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  formatDistanceStrict,
  isSameMonth,
  isSameYear,
  parseISO,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { es } from 'date-fns/locale';

/** La semana empieza el lunes. */
export const OPCIONES_SEMANA = { weekStartsOn: 1 } as const;

/** Fecha local en formato 'yyyy-MM-dd' (la que se guarda en pedidos.fecha). */
export function aFechaISO(fecha: Date): string {
  return format(fecha, 'yyyy-MM-dd');
}

/** Convierte 'yyyy-MM-dd' en un Date a medianoche, hora local del celular. */
export function desdeFechaISO(fecha: string): Date {
  return parseISO(fecha);
}

/** ¿Es un texto con formato 'yyyy-MM-dd' y una fecha real? */
export function esFechaISO(texto: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(texto)) return false;
  const fecha = parseISO(texto);
  return !Number.isNaN(fecha.getTime()) && aFechaISO(fecha) === texto;
}

export function hoyISO(ahora: Date = new Date()): string {
  return aFechaISO(ahora);
}

export function sumarDias(fecha: string, dias: number): string {
  return aFechaISO(addDays(desdeFechaISO(fecha), dias));
}

export function sumarMeses(fecha: string, meses: number): string {
  return aFechaISO(addMonths(desdeFechaISO(fecha), meses));
}

export function inicioSemana(fecha: string): string {
  return aFechaISO(startOfWeek(desdeFechaISO(fecha), OPCIONES_SEMANA));
}

export function finSemana(fecha: string): string {
  return aFechaISO(endOfWeek(desdeFechaISO(fecha), OPCIONES_SEMANA));
}

export function inicioMes(fecha: string): string {
  return aFechaISO(startOfMonth(desdeFechaISO(fecha)));
}

export function finMes(fecha: string): string {
  return aFechaISO(endOfMonth(desdeFechaISO(fecha)));
}

/** Los 7 días (lunes a domingo) de la semana que contiene la fecha. */
export function diasDeLaSemana(fecha: string): string[] {
  const lunes = inicioSemana(fecha);
  return Array.from({ length: 7 }, (_, i) => sumarDias(lunes, i));
}

/** Hora local 'HH:mm' a partir de una fecha-hora ISO. */
export function formatoHora(isoFechaHora: string): string {
  return format(parseISO(isoFechaHora), 'HH:mm');
}

function capitalizar(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/** "Domingo 8 de noviembre de 2026" */
export function formatoFechaLarga(fecha: string): string {
  return capitalizar(format(desdeFechaISO(fecha), "EEEE d 'de' MMMM 'de' yyyy", { locale: es }));
}

/** "Dom 8 nov" */
export function formatoFechaCorta(fecha: string): string {
  return capitalizar(format(desdeFechaISO(fecha), 'EEE d MMM', { locale: es }));
}

/** "08/11/2026" */
export function formatoFechaNumerica(fecha: string): string {
  return format(desdeFechaISO(fecha), 'dd/MM/yyyy');
}

/** "Noviembre 2026" */
export function formatoMes(fecha: string): string {
  return capitalizar(format(desdeFechaISO(fecha), 'LLLL yyyy', { locale: es }));
}

/**
 * Rango de días en formato compacto:
 * "3 – 9 nov 2026", "27 oct – 2 nov 2026" o "29 dic 2025 – 4 ene 2026".
 */
export function formatoRango(desde: string, hasta: string): string {
  const a = desdeFechaISO(desde);
  const b = desdeFechaISO(hasta);
  const fin = format(b, 'd MMM yyyy', { locale: es });
  if (desde === hasta) return fin;
  if (!isSameYear(a, b)) return `${format(a, 'd MMM yyyy', { locale: es })} – ${fin}`;
  if (!isSameMonth(a, b)) return `${format(a, 'd MMM', { locale: es })} – ${fin}`;
  return `${format(a, 'd')} – ${fin}`;
}

/** Letra corta del día para el gráfico: L, M, X, J, V, S, D */
export function letraDia(fecha: string): string {
  const letras = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
  return letras[desdeFechaISO(fecha).getDay()];
}

/** "8 nov 2026, 18:45" */
export function formatoFechaHora(isoFechaHora: string): string {
  return format(parseISO(isoFechaHora), 'd MMM yyyy, HH:mm', { locale: es });
}

/** "hace 3 días" */
export function haceCuanto(isoFechaHora: string, ahora: Date = new Date()): string {
  const fecha = parseISO(isoFechaHora);
  if (ahora.getTime() - fecha.getTime() < 60_000) return 'hace un momento';
  return formatDistanceStrict(fecha, ahora, { locale: es, addSuffix: true });
}

/** Días completos transcurridos entre una fecha-hora ISO y ahora. */
export function diasDesde(isoFechaHora: string, ahora: Date = new Date()): number {
  return Math.floor((ahora.getTime() - parseISO(isoFechaHora).getTime()) / 86_400_000);
}
