import { useFocusEffect } from 'expo-router';
import { useCallback, useRef } from 'react';

/**
 * Ejecuta `cargar` cada vez que la pantalla gana el foco (por ejemplo al cambiar de pestaña),
 * así los datos se ven actualizados después de tomar un pedido o editar el menú.
 */
export function useAlEnfocar(cargar: () => void): void {
  const ref = useRef(cargar);
  ref.current = cargar;
  useFocusEffect(
    useCallback(() => {
      ref.current();
    }, []),
  );
}
