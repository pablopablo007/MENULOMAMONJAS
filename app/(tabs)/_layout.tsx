import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router/tabs';

import type { NombreIcono } from '../../src/components/Boton';
import { colores, letra } from '../../src/theme';

function IconoTab({ nombre, activo, size }: { nombre: NombreIcono; activo: boolean; size: number }) {
  return <Ionicons name={nombre} size={size} color={activo ? colores.acento : colores.textoTenue} />;
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colores.acento,
        tabBarInactiveTintColor: colores.textoTenue,
        tabBarLabelStyle: { fontSize: letra.pequena, fontWeight: '600' },
        tabBarStyle: { backgroundColor: colores.tarjeta, borderTopColor: colores.borde },
        headerStyle: { backgroundColor: colores.tarjeta },
        headerTitleStyle: { color: colores.texto, fontSize: letra.media, fontWeight: '700' },
        sceneStyle: { backgroundColor: colores.fondo },
      }}
    >
      <Tabs.Screen
        name="tomar-pedido"
        options={{
          title: 'Tomar pedido',
          tabBarIcon: ({ focused, size }) => <IconoTab nombre="receipt-outline" activo={focused} size={size} />,
        }}
      />
      <Tabs.Screen
        name="resumenes"
        options={{
          title: 'Resúmenes',
          tabBarIcon: ({ focused, size }) => <IconoTab nombre="stats-chart-outline" activo={focused} size={size} />,
        }}
      />
      <Tabs.Screen
        name="menu"
        options={{
          title: 'Menú',
          tabBarIcon: ({ focused, size }) => <IconoTab nombre="restaurant-outline" activo={focused} size={size} />,
        }}
      />
    </Tabs>
  );
}
