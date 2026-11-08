import { Redirect } from 'expo-router';

/** La pantalla inicial es "Tomar pedido". */
export default function Inicio() {
  return <Redirect href="/tomar-pedido" />;
}
