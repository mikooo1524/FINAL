import { AdminUsersScreen } from '../../adminScreens';
import { useCompatNavigation } from '../../navigationCompat';
export default function Screen() { return <AdminUsersScreen navigation={useCompatNavigation()} />; }
