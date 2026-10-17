import { PaymentScreen } from '../customerScreens';
import { useCompatNavigation } from '../navigationCompat';

export default function PaymentRoute() {
  return <PaymentScreen navigation={useCompatNavigation()} />;
}
