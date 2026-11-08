/** Escribir, compartir y elegir archivos (respaldo JSON y CSV). */
import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

interface OpcionesCompartir {
  nombre: string;
  contenido: string;
  mimeType: string;
  /** Tipo de archivo para iOS. */
  uti: string;
  titulo: string;
}

/**
 * Guarda el contenido en un archivo temporal y abre el menú de compartir
 * (Drive, WhatsApp, correo, Archivos...).
 */
export async function compartirArchivo({ nombre, contenido, mimeType, uti, titulo }: OpcionesCompartir): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Este celular no permite compartir archivos desde la app.');
  }
  const archivo = new File(Paths.cache, nombre);
  archivo.create({ overwrite: true });
  await archivo.write(contenido);
  await Sharing.shareAsync(archivo.uri, { mimeType, UTI: uti, dialogTitle: titulo });
}

/** Abre el selector de archivos y devuelve el texto del archivo elegido (null si se cancela). */
export async function elegirArchivoDeTexto(): Promise<{ nombre: string; contenido: string } | null> {
  const resultado = await DocumentPicker.getDocumentAsync({
    // Se aceptan todos los tipos porque Android a veces no reconoce los .json
    // que llegan por WhatsApp o Drive; el contenido se valida después.
    type: '*/*',
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (resultado.canceled || resultado.assets.length === 0) return null;
  const elegido = resultado.assets[0];
  const contenido = await new File(elegido.uri).text();
  return { nombre: elegido.name, contenido };
}
