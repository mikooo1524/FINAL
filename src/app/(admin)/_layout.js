import { Tabs } from 'expo-router';
import { colors } from '../../theme';
import { OverviewGlyph } from '../../OverviewIcon';
import SignOutButton from '../../SignOutButton';
const icons = { index: 'home', users: 'users', reservations: 'clipboard', reports: 'chart' };
export default function AdminTabsLayout() {
  return <Tabs screenOptions={({ route }) => ({ headerStyle: { backgroundColor: colors.navy }, headerTintColor: '#FFFFFF',
    headerRight: () => <SignOutButton style={{ marginRight: 12 }} />,
    tabBarActiveTintColor: colors.tealDark, tabBarInactiveTintColor: '#8490A1',
    tabBarStyle: { height: 66, paddingTop: 7, paddingBottom: 8, borderTopColor: colors.border, backgroundColor: '#FFFFFF' },
    tabBarLabelStyle: { fontSize: 10, fontWeight: '700' },
    tabBarIcon: ({ color }) => <OverviewGlyph name={icons[route.name]} size={23} color={color} /> })}>
    <Tabs.Screen name="index" options={{ title: 'Dashboard', headerTitle: 'Administrator' }} />
    <Tabs.Screen name="users" options={{ title: 'Users' }} />
    <Tabs.Screen name="reservations" options={{ title: 'Bookings', headerTitle: 'Admin Bookings' }} /><Tabs.Screen name="reports" options={{ title: 'Reports' }} />
  </Tabs>;
}
