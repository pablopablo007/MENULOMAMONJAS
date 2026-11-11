/** Textos del estado de la nube (pantalla Nube y tarjeta del Menú). */
import { haceCuanto } from '../lib/fechas';
import { plural } from '../lib/texto';
import type { EstadoNube } from './NubeContext';

/** Título, detalle y tono del estado de la sincronización. */
export function resumenNube(nube: { estado: EstadoNube; pendientes: number; ultima: string | null; error: string | null }): {
  titulo: string;
  detalle: string;
  tono: 'ok' | 'aviso' | 'neutro';
} {
  if (nube.estado === 'sin-configurar') {
    return { titulo: 'Nube sin configurar', detalle: 'Los datos solo están en este celular.', tono: 'neutro' };
  }
  if (nube.estado === 'sin-sesion') {
    return { titulo: 'Sin iniciar sesión', detalle: 'Inicia sesión para guardar una copia en la nube.', tono: 'aviso' };
  }
  if (nube.estado === 'preparando') return { titulo: 'Conectando…', detalle: 'Revisando la nube.', tono: 'neutro' };
  if (nube.estado === 'elegir') {
    return { titulo: 'Falta un paso', detalle: 'La nube ya tiene datos: elige qué hacer.', tono: 'aviso' };
  }
  if (nube.error) {
    return {
      titulo: nube.pendientes > 0 ? `${plural(nube.pendientes, 'cambio', 'cambios')} por subir` : 'No se pudo sincronizar',
      detalle: nube.error,
      tono: 'aviso',
    };
  }
  if (nube.pendientes > 0) {
    return { titulo: `${plural(nube.pendientes, 'cambio', 'cambios')} por subir`, detalle: 'Se subirán solos en unos segundos.', tono: 'neutro' };
  }
  return {
    titulo: 'Todo guardado en la nube',
    detalle: nube.ultima ? `Última sincronización: ${haceCuanto(nube.ultima)}.` : 'Sincronizado.',
    tono: 'ok',
  };
}
