import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ProveedorDb } from '../src/db/DbContext';
import { colores, letra } from '../src/theme';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <ProveedorDb>
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colores.tarjeta },
            headerTintColor: colores.acento,
            headerTitleStyle: { color: colores.texto, fontSize: letra.media, fontWeight: '700' },
            contentStyle: { backgroundColor: colores.fondo },
            headerBackTitle: 'Atrás',
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="menu/producto" options={{ title: 'Producto', presentation: 'modal' }} />
          <Stack.Screen name="menu/categorias" options={{ title: 'Categorías' }} />
          <Stack.Screen name="menu/respaldo" options={{ title: 'Respaldo' }} />
        </Stack>
      </ProveedorDb>
    </SafeAreaProvider>
  );
}
