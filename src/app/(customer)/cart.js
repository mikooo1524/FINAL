import { CartScreen } from '../../customerScreens';
import { useCompatNavigation } from '../../navigationCompat';

export default function CartRoute() {
  return <CartScreen navigation={useCompatNavigation()} />;
}
