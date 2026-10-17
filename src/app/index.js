import RoleSelectionScreen from '../RoleSelectionScreen';
import { useCompatNavigation } from '../navigationCompat';

export default function RoleRoute() {
  return <RoleSelectionScreen navigation={useCompatNavigation()} />;
}
