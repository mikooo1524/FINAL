import { BookingScreen } from '../customerScreens';
import { useCompatNavigation } from '../navigationCompat';

export default function BookingRoute() {
  return <BookingScreen navigation={useCompatNavigation()} />;
}
