import type { PedidoConItems, TotalDia } from '../../types';
import { generarCsvVentas, celdaCsv } from '../csv';
import { formatoDinero, formatoDineroCorto, parsearPrecio, redondear } from '../dinero';
import {
  diasDeLaSemana,
  esFechaISO,
  finMes,
  formatoFechaLarga,
  formatoMes,
  formatoMesCorto,
  formatoRango,
  inicioSemana,
  letraDia,
  mesesDelAnio,
  semanasDelMes,
} from '../fechas';
import { aNuevoPedido, cantidadProductos, totalPedido, type ItemEnCurso } from '../pedidoEnCurso';
import {
  escaparHtml,
  generarHtmlReporte,
  nombreArchivoReporte,
  reporteDia,
  reporteMes,
  reporteSemana,
} from '../reportePdf';
import { ErrorRespaldo, leerRespaldoDesdeTexto, nombreArchivoRespaldo, validarRespaldo } from '../respaldo';
import {
  agruparPorSemana,
  escalaEje,
  mejorDia,
  ordenarMasVendidos,
  resumirPeriodo,
  serieSemanal,
  ticketPromedio,
} from '../resumen';
import { normalizar, textoONulo } from '../texto';
import { etiquetaMesa, textoPedido, tituloPedido } from '../textoPedido';

describe('dinero', () => {
  it('formatea en dólares con dos decimales', () => {
    expect(formatoDinero(12.5)).toBe('$12.50');
    expect(formatoDinero(0)).toBe('$0.00');
    expect(formatoDinero(1234.5)).toBe('$1,234.50');
    expect(formatoDinero(0.1 + 0.2)).toBe('$0.30');
  });

  it('redondea a centavos', () => {
    expect(redondear(0.1 + 0.2)).toBe(0.3);
    expect(redondear(1.005)).toBe(1.01);
    expect(redondear(3 * 1.15)).toBe(3.45);
  });

  it('formato corto para el calendario', () => {
    expect(formatoDineroCorto(85.4)).toBe('$85');
    expect(formatoDineroCorto(1250)).toBe('$1.2k');
    expect(formatoDineroCorto(1000)).toBe('$1k');
    expect(formatoDineroCorto(15300)).toBe('$15k');
  });

  it('interpreta precios escritos con punto o coma', () => {
    expect(parsearPrecio('2.50')).toBe(2.5);
    expect(parsearPrecio('2,5')).toBe(2.5);
    expect(parsearPrecio('$3')).toBe(3);
    expect(parsearPrecio('.75')).toBe(0.75);
    expect(parsearPrecio('abc')).toBeNull();
    expect(parsearPrecio('1.234')).toBeNull();
    expect(parsearPrecio('')).toBeNull();
  });
});

describe('fechas', () => {
  it('la semana va de lunes a domingo', () => {
    expect(inicioSemana('2026-11-08')).toBe('2026-11-02'); // domingo -> lunes anterior
    expect(inicioSemana('2026-11-09')).toBe('2026-11-09');
    expect(diasDeLaSemana('2026-11-05')).toEqual([
      '2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06', '2026-11-07', '2026-11-08',
    ]);
    expect(diasDeLaSemana('2026-11-05').map(letraDia).join('')).toBe('LMXJVSD');
  });

  it('formatea rangos de semana en español', () => {
    expect(formatoRango('2026-11-03', '2026-11-09')).toBe('3 – 9 nov 2026');
    expect(formatoRango('2026-10-26', '2026-11-01')).toBe('26 oct – 1 nov 2026');
    expect(formatoRango('2025-12-29', '2026-01-04')).toBe('29 dic 2025 – 4 ene 2026');
  });

  it('formatea fechas y meses en español', () => {
    expect(formatoFechaLarga('2026-11-08')).toBe('Domingo 8 de noviembre de 2026');
    expect(formatoMes('2026-11-08')).toBe('Noviembre 2026');
    expect(finMes('2026-02-10')).toBe('2026-02-28');
  });

  it('semanas de un mes y meses de un año', () => {
    // Noviembre 2026 empieza en domingo: la primera semana es la del lunes 26 de octubre.
    expect(semanasDelMes('2026-11-15')).toEqual(['2026-10-26', '2026-11-02', '2026-11-09', '2026-11-16', '2026-11-23', '2026-11-30']);
    expect(mesesDelAnio('2026-11-08')).toHaveLength(12);
    expect(mesesDelAnio('2026-11-08')[0]).toBe('2026-01-01');
    expect(mesesDelAnio('2026-11-08')[11]).toBe('2026-12-01');
    expect(formatoMesCorto('2026-11-01')).toBe('Nov');
  });

  it('reconoce fechas válidas', () => {
    expect(esFechaISO('2026-11-08')).toBe(true);
    expect(esFechaISO('2026-02-30')).toBe(false);
    expect(esFechaISO('08/11/2026')).toBe(false);
  });
});

describe('resúmenes (cálculos puros)', () => {
  const dias: TotalDia[] = [
    { fecha: '2026-11-02', total: 40, pedidos: 4 },
    { fecha: '2026-11-08', total: 85.5, pedidos: 6 },
    { fecha: '2026-11-09', total: 85.5, pedidos: 5 },
    { fecha: '2026-11-30', total: 10.25, pedidos: 1 },
  ];

  it('ticket promedio', () => {
    expect(ticketPromedio(100, 3)).toBe(33.33);
    expect(ticketPromedio(0, 0)).toBe(0);
  });

  it('resume un período', () => {
    expect(resumirPeriodo(dias)).toEqual({ total: 221.25, pedidos: 16, ticketPromedio: 13.83 });
    expect(resumirPeriodo([])).toEqual({ total: 0, pedidos: 0, ticketPromedio: 0 });
  });

  it('mejor día (en empate gana el primero)', () => {
    expect(mejorDia(dias)).toEqual(dias[1]);
    expect(mejorDia([])).toBeNull();
    expect(mejorDia([{ fecha: '2026-11-01', total: 0, pedidos: 0 }])).toBeNull();
  });

  it('serie semanal rellena con ceros los días sin ventas', () => {
    const serie = serieSemanal(dias, '2026-11-05');
    expect(serie).toHaveLength(7);
    expect(serie[0]).toEqual(dias[0]);
    expect(serie[3]).toEqual({ fecha: '2026-11-05', total: 0, pedidos: 0 });
    expect(serie[6]).toEqual(dias[1]);
  });

  it('agrupa por semana dentro del mes (lunes a domingo, recortando los bordes)', () => {
    const semanas = agruparPorSemana(dias, '2026-11-15');
    expect(semanas.map((s) => [s.desde, s.hasta])).toEqual([
      ['2026-11-01', '2026-11-01'],
      ['2026-11-02', '2026-11-08'],
      ['2026-11-09', '2026-11-15'],
      ['2026-11-16', '2026-11-22'],
      ['2026-11-23', '2026-11-29'],
      ['2026-11-30', '2026-11-30'],
    ]);
    expect(semanas.map((s) => s.total)).toEqual([0, 125.5, 85.5, 0, 0, 10.25]);
    expect(semanas.reduce((suma, s) => suma + s.total, 0)).toBe(221.25);
  });

  it('escala redonda para el eje del gráfico', () => {
    expect(escalaEje(85)).toEqual({ maximo: 100, paso: 25 });
    expect(escalaEje(5.25)).toEqual({ maximo: 8, paso: 2 });
    expect(escalaEje(1000)).toEqual({ maximo: 1000, paso: 250 });
    expect(escalaEje(0)).toEqual({ maximo: 4, paso: 1 });
  });

  it('ordena los más vendidos por cantidad, luego por total y combina repetidos', () => {
    const resultado = ordenarMasVendidos(
      [
        { producto_id: 1, nombre: 'Cola', cantidad: 5, total: 5 },
        { producto_id: 2, nombre: 'Seco', cantidad: 5, total: 27.5 },
        { producto_id: 3, nombre: 'Jugo', cantidad: 2, total: 3.5 },
        { producto_id: 3, nombre: 'Jugo', cantidad: 4, total: 7 },
      ],
      2,
    );
    expect(resultado).toEqual([
      { producto_id: 3, nombre: 'Jugo', cantidad: 6, total: 10.5 },
      { producto_id: 2, nombre: 'Seco', cantidad: 5, total: 27.5 },
    ]);
  });
});

describe('pedido en curso', () => {
  const items: ItemEnCurso[] = [
    { producto_id: 1, nombre: 'Seco de pollo', precio: 5.5, cantidad: 2, nota: ' sin cebolla ' },
    { producto_id: 2, nombre: 'Cola', precio: 0.1, cantidad: 3, nota: '' },
  ];

  it('calcula total y número de productos', () => {
    expect(totalPedido(items)).toBe(11.3);
    expect(cantidadProductos(items)).toBe(5);
  });

  it('convierte al formato para guardar, limpiando textos vacíos', () => {
    expect(aNuevoPedido('  ', ' Sin ají ', items)).toEqual({
      mesa: null,
      nota: 'Sin ají',
      items: [
        { producto_id: 1, nombre_producto: 'Seco de pollo', precio_unitario: 5.5, cantidad: 2, nota: 'sin cebolla' },
        { producto_id: 2, nombre_producto: 'Cola', precio_unitario: 0.1, cantidad: 3, nota: null },
      ],
    });
  });
});

const pedidoEjemplo: PedidoConItems = {
  id: 1,
  numero: 12,
  fecha: '2026-11-08',
  created_at: new Date(2026, 10, 8, 18, 45).toISOString(),
  mesa: '4',
  nota: 'Sin ají',
  total: 12.75,
  estado: 'activo',
  items: [
    { id: 1, pedido_id: 1, producto_id: 4, nombre_producto: 'Seco de pollo', precio_unitario: 5.5, cantidad: 2, nota: 'sin cebolla', subtotal: 11 },
    { id: 2, pedido_id: 1, producto_id: 7, nombre_producto: 'Jugo natural, mora', precio_unitario: 1.75, cantidad: 1, nota: null, subtotal: 1.75 },
  ],
};

describe('texto del pedido', () => {
  it('título del comprobante', () => {
    expect(tituloPedido(pedidoEjemplo)).toBe('Pedido #12 · Mesa 4 · 18:45');
    expect(tituloPedido({ ...pedidoEjemplo, mesa: null })).toBe('Pedido #12 · 18:45');
    expect(etiquetaMesa('Para llevar')).toBe('Para llevar');
  });

  it('texto plano para compartir', () => {
    expect(textoPedido(pedidoEjemplo)).toBe(
      [
        '*Pedido #12 · Mesa 4 · 18:45*',
        '08/11/2026',
        '',
        '2 × Seco de pollo — $11.00',
        '   Nota: sin cebolla',
        '1 × Jugo natural, mora — $1.75',
        '',
        'Nota: Sin ají',
        '',
        '*Total: $12.75*',
      ].join('\n'),
    );
  });
});

describe('CSV', () => {
  it('escapa comas y comillas', () => {
    expect(celdaCsv('a,b')).toBe('"a,b"');
    expect(celdaCsv('dijo "hola"')).toBe('"dijo ""hola"""');
    expect(celdaCsv(null)).toBe('');
  });

  it('una fila por pedido activo; los anulados no se exportan como ventas', () => {
    const csv = generarCsvVentas([pedidoEjemplo, { ...pedidoEjemplo, id: 2, numero: 13, estado: 'anulado' }]);
    const lineas = csv.replace('﻿', '').trim().split('\r\n');
    expect(lineas).toHaveLength(2);
    expect(lineas[1]).toBe(
      '08/11/2026,18:45,12,4,2,3,"2 x Seco de pollo (sin cebolla); 1 x Jugo natural, mora",Sin ají,12.75',
    );
  });
});

describe('respaldo', () => {
  const valido = {
    formato: 'pedidos-respaldo',
    version: 1,
    exportado_en: '2026-11-08T23:00:00.000Z',
    categorias: [{ id: 1, nombre: 'Bebidas', orden: 1, ejemplo: 0 }],
    productos: [
      { id: 1, categoria_id: 1, nombre: 'Cola', descripcion: null, precio: 1, activo: 1, created_at: '2026-11-01T10:00:00.000Z', ejemplo: 0 },
    ],
    pedidos: [
      { id: 1, numero: 1, fecha: '2026-11-08', created_at: '2026-11-08T17:00:00.000Z', mesa: null, nota: null, total: 2, estado: 'activo' },
    ],
    pedido_items: [
      { id: 1, pedido_id: 1, producto_id: 1, nombre_producto: 'Cola', precio_unitario: 1, cantidad: 2, nota: null, subtotal: 2 },
    ],
  };

  it('nombre del archivo con la fecha', () => {
    expect(nombreArchivoRespaldo('2026-11-08')).toBe('respaldo-pedidos-2026-11-08.json');
  });

  it('acepta un respaldo válido', () => {
    expect(validarRespaldo(valido).pedidos).toHaveLength(1);
    expect(leerRespaldoDesdeTexto(JSON.stringify(valido)).productos[0].nombre).toBe('Cola');
  });

  it('rechaza archivos que no son respaldos o tienen datos inconsistentes', () => {
    expect(() => leerRespaldoDesdeTexto('no es json')).toThrow(ErrorRespaldo);
    expect(() => validarRespaldo({ ...valido, formato: 'otro' })).toThrow('no es un respaldo');
    expect(() => validarRespaldo({ ...valido, pedidos: 'x' })).toThrow('Falta la lista "pedidos"');
    expect(() =>
      validarRespaldo({ ...valido, pedidos: [{ ...valido.pedidos[0], estado: 'borrado' }] }),
    ).toThrow('estado');
    expect(() =>
      validarRespaldo({ ...valido, pedido_items: [{ ...valido.pedido_items[0], producto_id: 9 }] }),
    ).toThrow('producto que no existe');
    expect(() =>
      validarRespaldo({ ...valido, productos: [{ ...valido.productos[0], precio: -1 }] }),
    ).toThrow('mayor que 0');
  });
});

describe('texto', () => {
  it('normaliza para buscar sin tildes', () => {
    expect(normalizar('  Café Pasado ')).toBe('cafe pasado');
    expect(normalizar('BOLÓN')).toBe('bolon');
    expect(normalizar('Piña con Ají')).toBe('pina con aji');
  });

  it('convierte vacíos en null', () => {
    expect(textoONulo('   ')).toBeNull();
    expect(textoONulo(' hola ')).toBe('hola');
    expect(textoONulo(undefined)).toBeNull();
  });
});

describe('reporte PDF', () => {
  const masVendidos = [{ producto_id: 1, nombre: 'Seco de pollo', cantidad: 2, total: 9 }];

  it('reporte del día: los anulados aparecen tachados y no suman', () => {
    const anulado = { ...pedidoEjemplo, id: 2, numero: 13, estado: 'anulado' as const };
    const reporte = reporteDia('2026-11-08', [pedidoEjemplo, anulado], masVendidos);
    expect(reporte.resumen).toEqual({ total: 12.75, pedidos: 1, ticketPromedio: 12.75 });
    expect(reporte.periodo).toBe('Domingo 8 de noviembre de 2026');
    const filaAnulada = reporte.tablas[0].filas[1];
    expect(filaAnulada[0]).toEqual({ texto: '#13 · Anulado', tachado: true });

    const html = generarHtmlReporte(reporte, new Date(2026, 10, 8, 20, 0));
    expect(html).toContain('Resumen del día');
    expect(html).toContain('Total del día');
    expect(html).toContain('$12.75');
    expect(html).toContain('Nota: Sin ají');
    expect(html).toContain('class="tachado"');
  });

  it('reporte de la semana con los 7 días', () => {
    const reporte = reporteSemana('2026-11-05', [{ fecha: '2026-11-04', total: 20, pedidos: 2 }], masVendidos);
    expect(reporte.periodo).toBe('2 – 8 nov 2026');
    expect(reporte.tablas[0].filas).toHaveLength(7);
    expect(reporte.resumen.total).toBe(20);
  });

  it('reporte del mes con mejor día y sin días de otros meses', () => {
    const dias: TotalDia[] = [
      { fecha: '2026-10-31', total: 99, pedidos: 9 },
      { fecha: '2026-11-03', total: 10, pedidos: 1 },
      { fecha: '2026-11-20', total: 30, pedidos: 3 },
    ];
    const reporte = reporteMes('2026-11-01', dias, masVendidos);
    expect(reporte.resumen.total).toBe(40);
    expect(reporte.destacado?.valor).toBe('$30.00');
    expect(reporte.tablas[1].filas).toHaveLength(2);
  });

  it('escapa el HTML y nombra los archivos por período', () => {
    expect(escaparHtml('<b>"Ají" & sal</b>')).toBe('&lt;b&gt;&quot;Ají&quot; &amp; sal&lt;/b&gt;');
    expect(nombreArchivoReporte('dia', '2026-11-08')).toBe('resumen-dia-2026-11-08.pdf');
    expect(nombreArchivoReporte('semana', '2026-11-08')).toBe('resumen-semana-2026-11-02.pdf');
    expect(nombreArchivoReporte('mes', '2026-11-01')).toBe('resumen-mes-2026-11.pdf');
  });
});
