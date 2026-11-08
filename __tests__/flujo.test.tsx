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

jest.setTimeout(60_000);

describe('flujo completo', () => {
  it('toma un pedido, lo ve en Resúmenes y lo anula', async () => {
    await renderRouter('./app', { initialUrl: '/' });

    // Pantalla inicial: Tomar pedido con los productos de ejemplo.
    await screen.findByText('Bolón de verde');
    expect(screen.getByText('Agrega productos al pedido')).toBeTruthy();

    await fireEvent.changeText(screen.getByLabelText('Mesa'), '4');
    await fireEvent.press(screen.getByLabelText('Agregar Bolón de verde'));
    await fireEvent.press(screen.getByLabelText('Agregar uno más de Bolón de verde'));
    await fireEvent.press(screen.getByLabelText('Agregar Seco de pollo'));
    expect(screen.getByText('Ver pedido · 3 productos · $10.50')).toBeTruthy();

    // Buscador
    await fireEvent.changeText(screen.getByLabelText('Buscar producto'), 'cafe');
    expect(screen.getByText('Café pasado')).toBeTruthy();
    expect(screen.queryByText('Churrasco')).toBeNull();
    await fireEvent.changeText(screen.getByLabelText('Buscar producto'), '');

    // Nota de un ítem
    await fireEvent.press(screen.getByText('Seco de pollo'));
    await fireEvent.changeText(await screen.findByLabelText('Nota'), 'sin cebolla');
    await fireEvent.press(screen.getByText('Guardar nota'));
    await waitFor(() => expect(screen.getByText('sin cebolla')).toBeTruthy());

    // Vista del pedido y generar
    await fireEvent.press(screen.getByText('Ver pedido · 3 productos · $10.50'));
    await fireEvent.press(await screen.findByText('Generar pedido'));

    await screen.findByText('Pedido generado');
    expect(screen.getByText(/^Pedido #1 · Mesa 4 · \d\d:\d\d$/)).toBeTruthy();
    expect(screen.getByText('2 × Bolón de verde')).toBeTruthy();
    expect(screen.getByText('Nota: sin cebolla')).toBeTruthy();
    expect(screen.getAllByText('$10.50').length).toBeGreaterThan(0);

    await fireEvent.press(screen.getByText('Nuevo pedido'));
    await screen.findByText('Agrega productos al pedido');

    // Resúmenes: el pedido aparece en el día de hoy
    await testRouter.navigate('/resumenes');
    await screen.findByText('Total del día');
    await waitFor(() => expect(screen.getAllByText(formatoDinero(10.5)).length).toBeGreaterThan(0));
    expect(screen.getByText(/^#1 · \d\d:\d\d · Mesa 4$/)).toBeTruthy();
    expect(screen.getByText('$11')).toBeTruthy(); // total del día en el calendario

    // Modo Semana con gráfico
    await fireEvent.press(screen.getByText('Semana'));
    await screen.findByText('Total de la semana');
    await fireEvent(screen.getByTestId('grafico-barras'), 'layout', { nativeEvent: { layout: { width: 320, height: 240 } } });
    expect(screen.getByText('Toca una barra para ver el detalle de ese día.')).toBeTruthy();

    // Modo Mes
    await fireEvent.press(screen.getByText('Mes'));
    await screen.findByText('Total del mes');
    expect(screen.getByText('Mejor día')).toBeTruthy();

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
    await screen.findByText('Empanadas de viento');
    await fireEvent(screen.getByLabelText('Disponible: Empanadas de viento'), 'valueChange', false);
    await screen.findAllByText('No disponible');

    await testRouter.navigate('/tomar-pedido');
    await screen.findByText('Bolón de verde');
    expect(screen.queryByText('Empanadas de viento')).toBeNull();
  });
});
