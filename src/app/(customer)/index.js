import { CustomerHomeScreen } from '../../customerScreens';
import { useCompatNavigation } from '../../navigationCompat';

export default function CustomerHomeRoute() {
  return <CustomerHomeScreen navigation={useCompatNavigation()} />;
}
