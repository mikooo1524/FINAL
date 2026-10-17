import { useState } from 'react';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../AppContext';
import { Field } from '../components';
import { colors } from '../theme';

export default function CustomerAuthScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const setupOwner = params.setup === 'owner';
  const { customer, signIn, register } = useApp();
  const [creating, setCreating] = useState(setupOwner || params.mode === 'signup');
  const [form, setForm] = useState({ name: setupOwner ? 'UserDemo' : '', contact: '', email: setupOwner ? 'userdemo@gmail.com' : '', password: '', confirmPassword: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  function field(key, value) { setForm(current => ({ ...current, [key]: value })); }
  function switchMode(value) {
    setCreating(value); setError(''); field('password', ''); field('confirmPassword', '');
  }
  function close() {
    if (busy) return;
    if (router.canGoBack()) router.back();
    else router.replace('/role-selection');
  }
  async function submit() {
    if (busy) return;
    setError('');
    if (creating && form.password !== form.confirmPassword) { setError('Passwords do not match.'); return; }
    setBusy(true);
    try {
      if (creating) await register(form, setupOwner);
      else await signIn(form.email, form.password);
    } catch (reason) { setError(reason.message); }
    finally { setBusy(false); }
  }
  if (customer) return <Redirect href={customer.demo_access ? '/role-selection' : customer.role === 'supplier' ? '/(supplier)' : customer.role === 'admin' ? '/(admin)' : '/(customer)'} />;
  return <KeyboardAvoidingView style={[styles.overlay, { paddingTop: Math.max(20, insets.top), paddingBottom: Math.max(20, insets.bottom) }]}
    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
    <Pressable accessibilityRole="button" accessibilityLabel="Dismiss customer sign in" disabled={busy} onPress={close} style={styles.backdrop} />
    <View style={styles.popup} accessibilityViewIsModal role="dialog" aria-modal accessibilityLabel={creating ? 'Create customer account' : 'Customer sign in'}>
    <ScrollView contentContainerStyle={styles.content} style={{ flexGrow: 0 }} keyboardShouldPersistTaps="handled">
    <View style={styles.header}>
      <Text style={styles.title}>{setupOwner ? 'Set up UserDemo' : creating ? 'Create your account' : 'Welcome back'}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Close customer sign in" disabled={busy} hitSlop={8} onPress={close} style={styles.close}>
        <View pointerEvents="none" style={{ width: 12, height: 12 }}>
          <View style={[styles.closeLine, { transform: [{ rotate: '45deg' }] }]} />
          <View style={[styles.closeLine, { transform: [{ rotate: '-45deg' }] }]} />
        </View>
      </Pressable>
    </View>
    <Text style={styles.lead}>{setupOwner ? 'This owner account can switch all demo roles and assign account roles.' : creating ? 'Create your account. New accounts start as customers.' : 'Sign in to your account.'}</Text>
      {creating && <>
        <Field label="Full name" value={form.name} onChangeText={value => field('name', value)} autoComplete="name" editable={!busy && !setupOwner} />
        <Field label="Contact number" value={form.contact} onChangeText={value => field('contact', value)} keyboardType="phone-pad" autoComplete="tel" editable={!busy} />
      </>}
      <Field label="Email" value={form.email} onChangeText={value => field('email', value)} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" editable={!busy} />
      <Field label="Password" value={form.password} onChangeText={value => field('password', value)} secureTextEntry autoCapitalize="none" autoCorrect={false} autoComplete={creating ? 'new-password' : 'current-password'} editable={!busy} placeholder={creating ? 'At least 8 characters' : ''} maxLength={128} />
      {creating && <Field label="Confirm password" value={form.confirmPassword} onChangeText={value => field('confirmPassword', value)} secureTextEntry autoCapitalize="none" autoCorrect={false} editable={!busy} maxLength={128} />}
      {!!error && <Text style={styles.error} accessibilityRole="alert">{error}</Text>}
      <View style={[styles.actions, creating && { flexDirection: 'column-reverse' }]}>
        {!setupOwner && <Pressable accessibilityRole="button" disabled={busy} onPress={() => creating ? switchMode(false) : submit()}
          style={({ pressed }) => [styles.authButton, styles.signInButton, pressed && styles.pressed, busy && styles.disabled]}>
          {busy && !creating ? <ActivityIndicator color="#2FAFA4" /> : <Text style={styles.signInText}>Sign in</Text>}
        </Pressable>}
        <Pressable accessibilityRole="button" disabled={busy} onPress={() => creating ? submit() : switchMode(true)}
          style={({ pressed }) => [styles.authButton, styles.createAccountButton, pressed && styles.pressed, busy && styles.disabled]}>
          {busy && creating ? <ActivityIndicator color="#FFFFFF" /> : <>
            <Text style={styles.createAccountButtonText}>Create an account</Text>
          </>}
        </Pressable>
      </View>
    </ScrollView>
    </View>
  </KeyboardAvoidingView>;
}
const styles = StyleSheet.create({
  overlay: { flex: 1, paddingHorizontal: 20, justifyContent: 'center', alignItems: 'center' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(11, 31, 58, 0.5)' },
  popup: { width: '100%', maxWidth: 440, maxHeight: '100%', backgroundColor: colors.surface, borderRadius: 22, overflow: 'hidden', borderWidth: 1, borderColor: colors.border },
  content: { padding: 22 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  title: { flex: 1, fontSize: 25, fontWeight: '900', color: colors.navy },
  close: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, borderColor: colors.tealDark, alignItems: 'center', justifyContent: 'center' },
  closeLine: { position: 'absolute', top: 5, left: 0, width: 12, height: 2, borderRadius: 1, backgroundColor: colors.tealDark },
  lead: { color: colors.muted, lineHeight: 21, marginBottom: 22 },
  error: { color: colors.danger, marginBottom: 14, lineHeight: 20 },
  actions: { gap: 12, marginTop: 4 },
  authButton: { width: '100%', minHeight: 50, borderRadius: 28, paddingHorizontal: 22, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14 },
  signInButton: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#C6D2DE' },
  signInText: { color: '#2FAFA4', fontSize: 16, fontWeight: '700' },
  createAccountButton: { backgroundColor: '#2FAFA4' },
  createAccountButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  pressed: { opacity: 0.75 },
  disabled: { opacity: 0.5 },
});
