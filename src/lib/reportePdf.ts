/**
 * Reportes de ventas en PDF. Aquí solo se arma el HTML (funciones puras);
 * convertirlo en PDF y compartirlo lo hace src/servicios/pdf.ts.
 * Los pedidos anulados no suman en ningún total: en el reporte del día aparecen tachados.
 */
import type { PedidoConItems, ProductoVendido, ResumenPeriodo, TotalDia } from '../types';
import { formatoDinero } from './dinero';
import {
  finMes,
  finSemana,
  formatoFechaCorta,
  formatoFechaHora,
  formatoFechaLarga,
  formatoHora,
  formatoMes,
  formatoRango,
  inicioMes,
  inicioSemana,
} from './fechas';
import { agruparPorSemana, mejorDia, resumirPeriodo, serieSemanal } from './resumen';
import { plural } from './texto';

export type ModoReporte = 'dia' | 'semana' | 'mes';

/** Celda de una tabla del reporte. */
export interface Celda {
  texto: string;
  /** Números y montos van alineados a la derecha. */
  numero?: boolean;
  /** Texto en gris pequeño debajo del principal (ej. detalle del pedido). */
  detalle?: string;
  /** Pedido anulado: se muestra tachado. */
  tachado?: boolean;
}

export interface TablaReporte {
  titulo: string;
  columnas: { titulo: string; numero?: boolean }[];
  filas: Celda[][];
  /** Mensaje cuando no hay filas. */
  vacio: string;
  /** Fila de totales al final. */
  pie?: Celda[];
}

export interface Reporte {
  modo: ModoReporte;
  /** "Resumen del día", "Resumen semanal"... */
  titulo: string;
  /** Período en texto: "Domingo 8 de noviembre de 2026". */
  periodo: string;
  resumen: ResumenPeriodo;
  /** Cifra extra junto a las del resumen (ej. el mejor día del mes). */
  destacado?: { titulo: string; valor: string; detalle: string };
  tablas: TablaReporte[];
}

const ETIQUETA_TOTAL: Record<ModoReporte, string> = {
  dia: 'Total del día',
  semana: 'Total de la semana',
  mes: 'Total del mes',
};

function tablaMasVendidos(productos: ProductoVendido[], titulo: string, vacio: string): TablaReporte {
  return {
    titulo,
    columnas: [{ titulo: '#' }, { titulo: 'Producto' }, { titulo: 'Cantidad', numero: true }, { titulo: 'Total', numero: true }],
    filas: productos.map((p, i) => [
      { texto: String(i + 1) },
      { texto: p.nombre },
      { texto: String(p.cantidad), numero: true },
      { texto: formatoDinero(p.total), numero: true },
    ]),
    vacio,
  };
}

/** Reporte de un día: cifras, cada pedido con su detalle y lo más vendido. */
export function reporteDia(fecha: string, pedidos: PedidoConItems[], masVendidos: ProductoVendido[]): Reporte {
  const activos = pedidos.filter((p) => p.estado === 'activo');
  const resumen = resumirPeriodo([
    { fecha, total: activos.reduce((suma, p) => suma + p.total, 0), pedidos: activos.length },
  ]);
  return {
    modo: 'dia',
    titulo: 'Resumen del día',
    periodo: formatoFechaLarga(fecha),
    resumen,
    tablas: [
      {
        titulo: 'Pedidos del día',
        columnas: [{ titulo: 'Pedido' }, { titulo: 'Hora' }, { titulo: 'Mesa' }, { titulo: 'Productos' }, { titulo: 'Total', numero: true }],
        filas: pedidos.map((p) => {
          const anulado = p.estado === 'anulado';
          const detalle = p.items
            .map((i) => `${i.cantidad} × ${i.nombre_producto}${i.nota ? ` (${i.nota})` : ''}`)
            .join(', ');
          return [
            { texto: `#${p.numero}${anulado ? ' · Anulado' : ''}`, tachado: anulado },
            { texto: formatoHora(p.created_at), tachado: anulado },
            { texto: p.mesa ?? '—', tachado: anulado },
            { texto: detalle, detalle: p.nota ? `Nota: ${p.nota}` : undefined, tachado: anulado },
            { texto: formatoDinero(p.total), numero: true, tachado: anulado },
          ];
        }),
        vacio: 'No hubo pedidos este día.',
        pie: pedidos.length
          ? [{ texto: 'Total' }, { texto: '' }, { texto: '' }, { texto: plural(resumen.pedidos, 'pedido', 'pedidos') }, { texto: formatoDinero(resumen.total), numero: true }]
          : undefined,
      },
      tablaMasVendidos(masVendidos, 'Lo más vendido del día', 'Sin ventas este día.'),
    ],
  };
}

/** Reporte de una semana (lunes a domingo): ventas de cada día y lo más vendido. */
export function reporteSemana(fecha: string, dias: TotalDia[], masVendidos: ProductoVendido[]): Reporte {
  const lunes = inicioSemana(fecha);
  const serie = serieSemanal(dias, lunes);
  const resumen = resumirPeriodo(serie);
  return {
    modo: 'semana',
    titulo: 'Resumen semanal',
    periodo: formatoRango(lunes, finSemana(lunes)),
    resumen,
    tablas: [
      {
        titulo: 'Ventas por día',
        columnas: [{ titulo: 'Día' }, { titulo: 'Pedidos', numero: true }, { titulo: 'Total', numero: true }],
        filas: serie.map((d) => [
          { texto: formatoFechaCorta(d.fecha) },
          { texto: String(d.pedidos), numero: true },
          { texto: formatoDinero(d.total), numero: true },
        ]),
        vacio: 'No hubo ventas esta semana.',
        pie: [{ texto: 'Total' }, { texto: String(resumen.pedidos), numero: true }, { texto: formatoDinero(resumen.total), numero: true }],
      },
      tablaMasVendidos(masVendidos, 'Más vendidos de la semana', 'Sin ventas esta semana.'),
    ],
  };
}

/** Reporte de un mes: mejor día, totales por semana, días con ventas y lo más vendido. */
export function reporteMes(fecha: string, dias: TotalDia[], masVendidos: ProductoVendido[]): Reporte {
  const primero = inicioMes(fecha);
  const ultimo = finMes(fecha);
  const delMes = dias.filter((d) => d.fecha >= primero && d.fecha <= ultimo);
  const resumen = resumirPeriodo(delMes);
  const mejor = mejorDia(delMes);
  return {
    modo: 'mes',
    titulo: 'Resumen mensual',
    periodo: formatoMes(primero),
    resumen,
    destacado: {
      titulo: 'Mejor día',
      valor: mejor ? formatoDinero(mejor.total) : '—',
      detalle: mejor ? `${formatoFechaCorta(mejor.fecha)} · ${plural(mejor.pedidos, 'pedido', 'pedidos')}` : 'Sin ventas este mes',
    },
    tablas: [
      {
        titulo: 'Totales por semana',
        columnas: [{ titulo: 'Semana' }, { titulo: 'Pedidos', numero: true }, { titulo: 'Total', numero: true }],
        filas: agruparPorSemana(delMes, primero).map((s) => [
          { texto: formatoRango(s.desde, s.hasta) },
          { texto: String(s.pedidos), numero: true },
          { texto: formatoDinero(s.total), numero: true },
        ]),
        vacio: 'No hubo ventas este mes.',
        pie: [{ texto: 'Total' }, { texto: String(resumen.pedidos), numero: true }, { texto: formatoDinero(resumen.total), numero: true }],
      },
      {
        titulo: 'Días con ventas',
        columnas: [{ titulo: 'Día' }, { titulo: 'Pedidos', numero: true }, { titulo: 'Total', numero: true }],
        filas: delMes.map((d) => [
          { texto: formatoFechaCorta(d.fecha) },
          { texto: String(d.pedidos), numero: true },
          { texto: formatoDinero(d.total), numero: true },
        ]),
        vacio: 'No hubo ventas este mes.',
      },
      tablaMasVendidos(masVendidos, 'Más vendidos del mes', 'Sin ventas este mes.'),
    ],
  };
}

/** Nombre del archivo: resumen-dia-2026-11-08.pdf, resumen-semana-2026-11-02.pdf, resumen-mes-2026-11.pdf */
export function nombreArchivoReporte(modo: ModoReporte, fecha: string): string {
  if (modo === 'dia') return `resumen-dia-${fecha}.pdf`;
  if (modo === 'semana') return `resumen-semana-${inicioSemana(fecha)}.pdf`;
  return `resumen-mes-${fecha.slice(0, 7)}.pdf`;
}

/** Escapa texto para meterlo en HTML (nombres de productos, notas, mesas...). */
export function escaparHtml(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function htmlCelda(celda: Celda, etiqueta: 'td' | 'th' = 'td'): string {
  const clases = [celda.numero && 'num', celda.tachado && 'tachado'].filter(Boolean).join(' ');
  const detalle = celda.detalle ? `<div class="detalle">${escaparHtml(celda.detalle)}</div>` : '';
  return `<${etiqueta}${clases ? ` class="${clases}"` : ''}>${escaparHtml(celda.texto)}${detalle}</${etiqueta}>`;
}

function htmlTabla(tabla: TablaReporte): string {
  const cuerpo = tabla.filas.length
    ? `<table>
        <thead><tr>${tabla.columnas
          .map((c) => `<th${c.numero ? ' class="num"' : ''}>${escaparHtml(c.titulo)}</th>`)
          .join('')}</tr></thead>
        <tbody>${tabla.filas.map((fila) => `<tr>${fila.map((c) => htmlCelda(c)).join('')}</tr>`).join('')}</tbody>
        ${tabla.pie ? `<tfoot><tr>${tabla.pie.map((c) => htmlCelda(c)).join('')}</tr></tfoot>` : ''}
      </table>`
    : `<p class="vacio">${escaparHtml(tabla.vacio)}</p>`;
  return `<section><h2>${escaparHtml(tabla.titulo)}</h2>${cuerpo}</section>`;
}

function htmlCifra(titulo: string, valor: string, detalle?: string, principal = false): string {
  return `<div class="cifra${principal ? ' principal' : ''}">
    <div class="cifra-titulo">${escaparHtml(titulo)}</div>
    <div class="cifra-valor">${escaparHtml(valor)}</div>
    ${detalle ? `<div class="cifra-detalle">${escaparHtml(detalle)}</div>` : ''}
  </div>`;
}

const ESTILOS = `
  * { box-sizing: border-box; }
  body { font-family: -apple-system, Roboto, 'Helvetica Neue', Arial, sans-serif; color: #111827; margin: 0; font-size: 12px; }
  header { border-bottom: 3px solid #C2410C; padding-bottom: 10px; margin-bottom: 16px; }
  .negocio { color: #C2410C; font-weight: 800; font-size: 12px; letter-spacing: 1px; text-transform: uppercase; }
  h1 { font-size: 22px; margin: 4px 0 2px; }
  .periodo { font-size: 15px; color: #374151; font-weight: 600; }
  .cifras { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 8px; }
  .cifra { flex: 1 1 22%; border: 1px solid #E5E7EB; border-radius: 8px; padding: 8px 10px; }
  .cifra.principal { background: #FFEDD5; border-color: #FFEDD5; }
  .cifra-titulo { font-size: 11px; color: #6B7280; font-weight: 600; }
  .cifra-valor { font-size: 18px; font-weight: 800; margin-top: 2px; }
  .cifra-detalle { font-size: 10px; color: #6B7280; margin-top: 2px; }
  section { margin-top: 16px; }
  h2 { font-size: 14px; margin: 0 0 6px; }
  table { width: 100%; border-collapse: collapse; }
  tr { page-break-inside: avoid; }
  th { text-align: left; font-size: 11px; color: #6B7280; border-bottom: 1.5px solid #D1D5DB; padding: 5px 6px; }
  td { border-bottom: 1px solid #E5E7EB; padding: 5px 6px; vertical-align: top; }
  tfoot td { font-weight: 800; border-top: 1.5px solid #D1D5DB; border-bottom: none; }
  .num { text-align: right; white-space: nowrap; }
  .tachado { text-decoration: line-through; color: #9CA3AF; }
  .detalle { font-size: 10px; color: #6B7280; margin-top: 2px; }
  .vacio { color: #6B7280; font-style: italic; margin: 0; }
  footer { margin-top: 20px; font-size: 10px; color: #9CA3AF; text-align: center; }
`;

/** HTML completo del reporte, listo para convertir en PDF. */
export function generarHtmlReporte(reporte: Reporte, generadoEn: Date = new Date()): string {
  const { resumen, destacado } = reporte;
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escaparHtml(`${reporte.titulo} · ${reporte.periodo}`)}</title>
  <style>${ESTILOS}</style>
</head>
<body>
  <header>
    <div class="negocio">Mirador Loma de Monjas</div>
    <h1>${escaparHtml(reporte.titulo)}</h1>
    <div class="periodo">${escaparHtml(reporte.periodo)}</div>
  </header>
  <div class="cifras">
    ${htmlCifra(ETIQUETA_TOTAL[reporte.modo], formatoDinero(resumen.total), undefined, true)}
    ${htmlCifra('Pedidos', String(resumen.pedidos))}
    ${htmlCifra('Ticket promedio', formatoDinero(resumen.ticketPromedio))}
    ${destacado ? htmlCifra(destacado.titulo, destacado.valor, destacado.detalle) : ''}
  </div>
  ${reporte.tablas.map(htmlTabla).join('\n')}
  <footer>Generado el ${escaparHtml(formatoFechaHora(generadoEn.toISOString()))} · Los pedidos anulados no se suman en los totales.</footer>
</body>
</html>`;
}
