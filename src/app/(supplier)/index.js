import { SupplierDashboardScreen } from '../../supplierScreens';
import { useCompatNavigation } from '../../navigationCompat';

export default function SupplierDashboardRoute() {
  return <SupplierDashboardScreen navigation={useCompatNavigation()} />;
}
