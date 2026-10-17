import { useLocalSearchParams } from 'expo-router';
import { EquipmentFormScreen } from '../supplierScreens';
import { useCompatNavigation } from '../navigationCompat';

export default function EquipmentFormRoute() {
  const params = useLocalSearchParams();
  return <EquipmentFormScreen navigation={useCompatNavigation()} route={{ params }} />;
}
