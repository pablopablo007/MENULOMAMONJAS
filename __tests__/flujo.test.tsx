/**
 * Prueba de humo de la app completa: se renderiza el directorio app/ con Expo Router
 * y una base de datos SQLite en memoria (sql.js) en lugar de expo-sqlite.
 */
import { Alert, type AlertButton } from 'react-native';
import { fireEvent, renderRouter, screen, testRouter, waitFor } from 'expo-router/testing-library';

import { formatoDinero } from '../src/lib/dinero';

jest.mock('../src/db/conexion', () => {
  const { crearDbPrueba } = jest.requireActual<typeof import('../src/db/pruebas/dbPrueba')>(
    '../src/db/pruebas/dbPrueba',
  );
  let db: ReturnType<typeof crearDbPrueba> | null = null;
  return { obtenerDb: () => (db ??= crearDbPrueba()) };
});

jest.mock('expo-haptics', () => ({
  impactAsync: () => Promise.resolve(),
  notificationAsync: () => Promise.resolve(),
  ImpactFeedbackStyle: { Light: 'light' },
  NotificationFeedbackType: { Success: 'success' },
}));

/** Responde automáticamente a los Alert con el botón destructivo (Anular, Borrar...). */
function aceptarAlertas() {
  return jest.spyOn(Alert, 'alert').mockImplementation((_titulo, _mensaje, botones?: AlertButton[]) => {
    botones?.find((b) => b.style === 'destructive')?.onPress?.();
  });
}

const mockCompartirPdf = jest.fn((_html: string, _nombre: string, _titulo: string) => Promise.resolve());
jest.mock('../src/servicios/pdf', () => ({
  compartirPdf: (html: string, nombre: string, titulo: string) => mockCompartirPdf(html, nombre, titulo),
}));

jest.setTimeout(60_000);

describe('flujo completo', () => {
  it('toma un pedido, lo ve en Resúmenes y lo anula', async () => {
    await renderRouter('./app', { initialUrl: '/' });

    // Pantalla inicial: Tomar pedido con el menú del local.
    await screen.findByText('Salchipapa');
    expect(screen.getByText('Agrega productos al pedido')).toBeTruthy();

    await fireEvent.changeText(screen.getByLabelText('Mesa'), '4');
    await fireEvent.press(screen.getByLabelText('Agregar Salchipapa'));
    await fireEvent.press(screen.getByLabelText('Agregar uno más de Salchipapa'));
    await fireEvent.press(screen.getByLabelText('Agregar Papinuggets'));
    expect(screen.getByText('Ver pedido · 3 productos · $7.00')).toBeTruthy();

    // Buscador
    await fireEvent.changeText(screen.getByLabelText('Buscar producto'), 'cafe');
    expect(screen.getByText('Café americano')).toBeTruthy();
    expect(screen.queryByText('Hot dog')).toBeNull();
    await fireEvent.changeText(screen.getByLabelText('Buscar producto'), '');

    // Nota de un ítem
    await fireEvent.press(screen.getByText('Papinuggets'));
    await fireEvent.changeText(await screen.findByLabelText('Nota'), 'sin cebolla');
    await fireEvent.press(screen.getByText('Guardar nota'));
    await waitFor(() => expect(screen.getByText('sin cebolla')).toBeTruthy());

    // Vista del pedido y generar
    await fireEvent.press(screen.getByText('Ver pedido · 3 productos · $7.00'));
    await fireEvent.press(await screen.findByText('Generar pedido'));

    await screen.findByText('Pedido generado');
    expect(screen.getByText(/^Pedido #1 · Mesa 4 · \d\d:\d\d$/)).toBeTruthy();
    expect(screen.getByText('2 × Salchipapa')).toBeTruthy();
    expect(screen.getByText('Nota: sin cebolla')).toBeTruthy();
    expect(screen.getAllByText('$7.00').length).toBeGreaterThan(0);

    await fireEvent.press(screen.getByText('Nuevo pedido'));
    await screen.findByText('Agrega productos al pedido');

    // Resúmenes: el pedido aparece en el día de hoy
    await testRouter.navigate('/resumenes');
    await screen.findByText('Total del día');
    await waitFor(() => expect(screen.getAllByText(formatoDinero(7)).length).toBeGreaterThan(0));
    expect(screen.getByText(/^#1 · \d\d:\d\d · Mesa 4$/)).toBeTruthy();
    expect(screen.getByText('$7')).toBeTruthy(); // total del día en el calendario

    // Exportar el día en PDF
    await fireEvent.press(screen.getByText('Exportar día en PDF'));
    await waitFor(() => expect(mockCompartirPdf).toHaveBeenCalledTimes(1));
    expect(mockCompartirPdf.mock.calls[0][0]).toContain('Resumen del día');
    expect(mockCompartirPdf.mock.calls[0][1]).toMatch(/^resumen-dia-\d{4}-\d{2}-\d{2}\.pdf$/);

    // Modo Semana con gráfico
    await fireEvent.press(screen.getByText('Semana'));
    await screen.findByText('Total de la semana');
    expect(screen.getByText('Exportar semana en PDF')).toBeTruthy();
    expect(screen.getByLabelText(/^Esta semana, /)).toBeTruthy(); // selector de semanas
    await fireEvent(screen.getByTestId('grafico-barras'), 'layout', { nativeEvent: { layout: { width: 320, height: 240 } } });
    expect(screen.getByText('Toca una barra para ver el detalle de ese día.')).toBeTruthy();

    // Modo Mes
    await fireEvent.press(screen.getByText('Mes'));
    await screen.findByText('Total del mes');
    expect(screen.getByText('Mejor día')).toBeTruthy();
    expect(await screen.findByLabelText(/^Este mes, .*vendido \$7\.00$/)).toBeTruthy(); // selector de meses
    await fireEvent.press(screen.getByText('Exportar mes en PDF'));
    await waitFor(() => expect(mockCompartirPdf).toHaveBeenCalledTimes(2));
    expect(mockCompartirPdf.mock.calls[1][0]).toContain('Resumen mensual');

    // Anular desde el modo Día
    await fireEvent.press(screen.getByText('Día'));
    await fireEvent.press(await screen.findByText(/^#1 · \d\d:\d\d · Mesa 4$/));
    const alerta = aceptarAlertas();
    await fireEvent.press(screen.getByText('Anular pedido'));
    await screen.findByText('Anulado');
    await waitFor(() => expect(screen.getAllByText('$0.00').length).toBeGreaterThan(0));
    expect(screen.getByText('Sin ventas este día.')).toBeTruthy();
    alerta.mockRestore();
  });

  it('los productos no disponibles desaparecen de Tomar pedido', async () => {
    await renderRouter('./app', { initialUrl: '/menu' });
    await screen.findByText('Hot dog');
    await fireEvent(screen.getByLabelText('Disponible: Hot dog'), 'valueChange', false);
    await screen.findAllByText('No disponible');

    await testRouter.navigate('/tomar-pedido');
    await screen.findByText('Salchipapa');
    expect(screen.queryByText('Hot dog')).toBeNull();
  });
});
