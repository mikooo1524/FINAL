import { Pressable, StyleSheet, Text } from 'react-native';
import { router } from 'expo-router';
import { useApp } from './AppContext';
import { colors } from './theme';

export default function SwitchRoleButton() {
  const { canSwitchRoles } = useApp();
  if (!canSwitchRoles) return null;
  return <Pressable accessibilityRole="button" onPress={() => router.push('/role-selection')}
    style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
    <Text style={styles.label}>Switch demo role</Text>
  </Pressable>;
}

const styles = StyleSheet.create({
  button: { alignItems: 'center', padding: 18, marginTop: 10 },
  label: { color: colors.tealDark, fontWeight: '800' },
  pressed: { opacity: 0.8 },
});
