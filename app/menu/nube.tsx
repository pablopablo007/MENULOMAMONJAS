import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Boton, type NombreIcono } from '../../src/components/Boton';
import { CampoTexto } from '../../src/components/CampoTexto';
import { Tarjeta } from '../../src/components/Tarjeta';
import { mensajeDeError } from '../../src/lib/errores';
import { formatoFechaHora } from '../../src/lib/fechas';
import { plural } from '../../src/lib/texto';
import { useNube } from '../../src/nube/NubeContext';
import { resumenNube } from '../../src/nube/resumen';
import { colores, espacio, letra, radio } from '../../src/theme';

type Ocupado = 'sesion' | 'sincronizar' | 'descargar' | 'subir' | null;

/** Mínimo de Supabase para una contraseña. */
const MINIMO_CLAVE = 6;

function Estado({ icono, titulo, detalle, tono }: { icono: NombreIcono; titulo: string; detalle: string; tono: 'ok' | 'aviso' | 'neutro' }) {
  const color = tono === 'ok' ? colores.exito : tono === 'aviso' ? colores.aviso : colores.textoTenue;
  return (
    <View style={[estilos.estado, tono === 'ok' ? estilos.estadoOk : tono === 'aviso' ? estilos.estadoAviso : estilos.estadoNeutro]}>
      <Ionicons name={icono} size={28} color={color} />
      <View style={estilos.estadoTextos}>
        <Text style={estilos.estadoTitulo}>{titulo}</Text>
        <Text style={[estilos.estadoDetalle, tono === 'aviso' && { color: colores.aviso }]}>{detalle}</Text>
      </View>
    </View>
  );
}

export default function NubePantalla() {
  const nube = useNube();
  const [correo, setCorreo] = useState('');
  const [clave, setClave] = useState('');
  const [repetir, setRepetir] = useState('');
  const [creando, setCreando] = useState(false);
  const [errorSesion, setErrorSesion] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState<Ocupado>(null);

  const ejecutar = async (accion: Exclude<Ocupado, null>, tarea: () => Promise<void>, titulo: string, exito?: string) => {
    setOcupado(accion);
    try {
      await tarea();
      if (exito) Alert.alert('Listo', exito);
    } catch (e) {
      Alert.alert(titulo, mensajeDeError(e));
    } finally {
      setOcupado(null);
    }
  };

  const entrar = async () => {
    if (!correo.trim() || !clave) {
      setErrorSesion('Escribe el correo y la contraseña.');
      return;
    }
    setErrorSesion(null);
    setOcupado('sesion');
    try {
      await nube.iniciarSesion(correo, clave);
      setClave('');
    } catch (e) {
      setErrorSesion(mensajeDeError(e));
    } finally {
      setOcupado(null);
    }
  };

  const crear = async () => {
    if (!correo.trim() || !clave) {
      setErrorSesion('Escribe el correo y la contraseña.');
      return;
    }
    if (clave.length < MINIMO_CLAVE) {
      setErrorSesion(`La contraseña debe tener al menos ${MINIMO_CLAVE} caracteres.`);
      return;
    }
    if (clave !== repetir) {
      setErrorSesion('Las contraseñas no coinciden.');
      return;
    }
    setErrorSesion(null);
    setOcupado('sesion');
    try {
      const resultado = await nube.crearCuenta(correo, clave);
      setClave('');
      setRepetir('');
      setCreando(false);
      if (resultado === 'confirmar') {
        Alert.alert(
          'Revisa tu correo',
          `Te enviamos un enlace a ${correo.trim()}. Ábrelo para confirmar la cuenta y después inicia sesión aquí.`,
        );
      }
    } catch (e) {
      setErrorSesion(mensajeDeError(e));
    } finally {
      setOcupado(null);
    }
  };

  const cambiarModo = () => {
    setCreando(!creando);
    setErrorSesion(null);
    setRepetir('');
  };

  const confirmarDescargar = () => {
    Alert.alert(
      '¿Descargar de la nube?',
      'Se BORRARÁN los datos de este celular (menú y pedidos) y se reemplazarán por los que están en la nube. Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Descargar',
          style: 'destructive',
          onPress: () =>
            void ejecutar('descargar', nube.descargar, 'No se pudo descargar', 'Los datos de la nube ya están en este celular.'),
        },
      ],
    );
  };

  const confirmarSubir = () => {
    Alert.alert(
      '¿Reemplazar la nube?',
      'Se BORRARÁ lo que hay en la nube y se subirán los datos de este celular. Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Reemplazar nube',
          style: 'destructive',
          onPress: () =>
            void ejecutar('subir', nube.reemplazarNube, 'No se pudo subir', 'Los datos de este celular ya están en la nube.'),
        },
      ],
    );
  };

  const confirmarCerrarSesion = () => {
    const aviso =
      nube.pendientes > 0
        ? `Hay ${plural(nube.pendientes, 'cambio', 'cambios')} sin subir. Se subirán cuando vuelvas a iniciar sesión con esta cuenta.\n\n`
        : '';
    Alert.alert('¿Cerrar sesión?', `${aviso}Los datos se quedan en este celular.`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Cerrar sesión', style: 'destructive', onPress: () => void nube.cerrarSesion() },
    ]);
  };

  const resumen = resumenNube(nube);
  const icono: NombreIcono =
    resumen.tono === 'ok' ? 'cloud-done-outline' : resumen.tono === 'aviso' ? 'cloud-offline-outline' : 'cloud-outline';

  return (
    <KeyboardAvoidingView style={estilos.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={estilos.contenido} keyboardShouldPersistTaps="handled">
        <Estado icono={icono} titulo={resumen.titulo} detalle={resumen.detalle} tono={resumen.tono} />

        {nube.estado === 'sin-configurar' ? (
          <Tarjeta estilo={estilos.tarjeta}>
            <Text style={estilos.titulo}>Configurar Supabase</Text>
            <Text style={estilos.texto}>
              Para guardar una copia en la nube hay que poner la URL y la clave pública (anon) del proyecto de Supabase en el
              archivo .env.local de la app (ver README, sección «Nube con Supabase»). Mientras tanto la app funciona normal y
              todo se guarda en este celular.
            </Text>
          </Tarjeta>
        ) : null}

        {nube.estado === 'sin-sesion' ? (
          <Tarjeta estilo={estilos.tarjeta}>
            <Text style={estilos.titulo}>{creando ? 'Crear cuenta del local' : 'Iniciar sesión'}</Text>
            <Text style={estilos.texto}>
              {creando
                ? 'Crea una cuenta con el correo del local y una contraseña. Con ella se guarda la copia en la nube.'
                : 'Usa el correo y la contraseña de la cuenta del local. Solo se hace una vez: la sesión queda guardada en este celular.'}
            </Text>
            <CampoTexto
              etiqueta="Correo"
              value={correo}
              onChangeText={setCorreo}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              textContentType="emailAddress"
              placeholder="local@correo.com"
            />
            <CampoTexto
              etiqueta="Contraseña"
              value={clave}
              onChangeText={setClave}
              secureTextEntry
              autoComplete={creando ? 'new-password' : 'password'}
              textContentType={creando ? 'newPassword' : 'password'}
              error={creando ? null : errorSesion}
              ayuda={creando ? `Al menos ${MINIMO_CLAVE} caracteres.` : undefined}
              onSubmitEditing={creando ? undefined : () => void entrar()}
            />
            {creando ? (
              <CampoTexto
                etiqueta="Repetir contraseña"
                value={repetir}
                onChangeText={setRepetir}
                secureTextEntry
                autoComplete="new-password"
                textContentType="newPassword"
                error={errorSesion}
                onSubmitEditing={() => void crear()}
              />
            ) : null}
            {creando ? (
              <Boton titulo="Crear cuenta" icono="person-add-outline" grande cargando={ocupado === 'sesion'} onPress={() => void crear()} />
            ) : (
              <Boton titulo="Iniciar sesión" icono="log-in-outline" grande cargando={ocupado === 'sesion'} onPress={() => void entrar()} />
            )}
            <Boton
              titulo={creando ? 'Ya tengo cuenta: iniciar sesión' : '¿No tienes cuenta? Crear una'}
              variante="fantasma"
              deshabilitado={ocupado !== null}
              onPress={cambiarModo}
            />
          </Tarjeta>
        ) : null}

        {nube.estado === 'elegir' ? (
          <Tarjeta estilo={estilos.tarjeta}>
            <Text style={estilos.titulo}>La nube ya tiene datos</Text>
            <Text style={estilos.texto}>
              Esta cuenta ya tiene un menú y pedidos guardados en la nube. ¿Qué quieres hacer?
            </Text>
            <Boton
              titulo="Descargar de la nube a este celular"
              icono="cloud-download-outline"
              grande
              cargando={ocupado === 'descargar'}
              deshabilitado={ocupado !== null}
              onPress={confirmarDescargar}
            />
            <Text style={estilos.ayuda}>Úsalo si cambiaste de celular o reinstalaste la app.</Text>
            <Boton
              titulo="Subir este celular a la nube"
              icono="cloud-upload-outline"
              variante="peligro"
              grande
              cargando={ocupado === 'subir'}
              deshabilitado={ocupado !== null}
              onPress={confirmarSubir}
            />
            <Text style={estilos.ayuda}>Borra lo que hay en la nube y guarda lo de este celular.</Text>
          </Tarjeta>
        ) : null}

        {nube.estado === 'conectada' ? (
          <>
            <Tarjeta estilo={estilos.tarjeta}>
              <Text style={estilos.titulo}>Copia automática</Text>
              <Text style={estilos.texto}>
                Cada pedido, producto o categoría que guardes se sube solo a la nube. Sin internet la app sigue funcionando y
                los cambios se suben cuando vuelva la conexión.
              </Text>
              {nube.ultima ? <Text style={estilos.ayuda}>Última sincronización: {formatoFechaHora(nube.ultima)}</Text> : null}
              <Boton
                titulo="Sincronizar ahora"
                icono="sync-outline"
                variante="secundario"
                grande
                cargando={nube.sincronizando || ocupado === 'sincronizar'}
                deshabilitado={ocupado !== null}
                onPress={() => void ejecutar('sincronizar', nube.sincronizarAhora, 'No se pudo sincronizar')}
              />
            </Tarjeta>

            <Tarjeta estilo={estilos.tarjeta}>
              <Text style={estilos.titulo}>Descargar de la nube</Text>
              <Text style={estilos.texto}>
                Reemplaza los datos de este celular por los de la nube. Úsalo si cambiaste de celular o reinstalaste la app.
              </Text>
              <Boton
                titulo="Descargar de la nube"
                icono="cloud-download-outline"
                variante="peligro"
                grande
                cargando={ocupado === 'descargar'}
                deshabilitado={ocupado !== null}
                onPress={confirmarDescargar}
              />
            </Tarjeta>
          </>
        ) : null}

        {nube.correo ? (
          <Tarjeta estilo={estilos.tarjeta}>
            <Text style={estilos.texto}>
              Sesión iniciada como <Text style={estilos.negrita}>{nube.correo}</Text>
            </Text>
            <Boton titulo="Cerrar sesión" icono="log-out-outline" variante="fantasma" onPress={confirmarCerrarSesion} />
          </Tarjeta>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const estilos = StyleSheet.create({
  flex: {
    flex: 1,
  },
  contenido: {
    padding: espacio.lg,
    gap: espacio.lg,
    paddingBottom: espacio.xxl,
  },
  estado: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.md,
    borderRadius: radio.lg,
    padding: espacio.lg,
  },
  estadoOk: {
    backgroundColor: colores.exitoSuave,
  },
  estadoAviso: {
    backgroundColor: colores.avisoSuave,
  },
  estadoNeutro: {
    backgroundColor: colores.tarjeta,
  },
  estadoTextos: {
    flex: 1,
    gap: 2,
  },
  estadoTitulo: {
    fontSize: letra.normal,
    fontWeight: '800',
    color: colores.texto,
  },
  estadoDetalle: {
    fontSize: letra.pequena,
    color: colores.textoSecundario,
  },
  tarjeta: {
    gap: espacio.md,
  },
  titulo: {
    fontSize: letra.media,
    fontWeight: '800',
    color: colores.texto,
  },
  texto: {
    fontSize: letra.pequena,
    color: colores.textoSecundario,
    lineHeight: 20,
  },
  ayuda: {
    fontSize: letra.pequena,
    color: colores.textoTenue,
    marginTop: -espacio.sm,
  },
  negrita: {
    fontWeight: '800',
    color: colores.texto,
  },
});
