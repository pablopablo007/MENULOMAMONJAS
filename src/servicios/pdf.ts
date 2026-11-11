/** Convertir un HTML en PDF y compartirlo (reportes de Resúmenes). */
import { File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

/** Tamaño A4 en puntos (72 por pulgada). */
const A4 = { width: 595, height: 842 };
const MARGEN = 36;

/**
 * Genera el PDF, le pone un nombre legible (resumen-dia-2026-11-08.pdf)
 * y abre el menú de compartir (WhatsApp, Drive, correo, imprimir...).
 */
export async function compartirPdf(html: string, nombre: string, titulo: string): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Este celular no permite compartir archivos desde la app.');
  }
  const { uri } = await Print.printToFileAsync({
    html,
    ...A4,
    margins: { left: MARGEN, right: MARGEN, top: MARGEN, bottom: MARGEN },
  });
  const destino = new File(Paths.cache, nombre);
  await new File(uri).move(destino, { overwrite: true });
  await Sharing.shareAsync(destino.uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: titulo });
}
