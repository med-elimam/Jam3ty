import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/contexts/AuthContext';
import { useRegister } from '@workspace/api-client-react';
import type { AuthUser } from '@/contexts/AuthContext';

export default function RegisterScreen() {
  const colors = useColors();
  const router = useRouter();
  const { login } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const registerMutation = useRegister({
    mutation: {
      onSuccess: async (data: any) => {
        const d = data?.data;
        if (d?.user && d?.tokens) {
          await login(d.user as AuthUser, d.tokens.accessToken, d.tokens.refreshToken);
        }
      },
      onError: (err: any) => {
        const msg = err?.data?.error?.message ?? 'Registration failed.';
        Alert.alert('Error', msg);
      },
    },
  });

  const handleRegister = () => {
    if (!fullName.trim() || !email.trim() || !password) {
      Alert.alert('Error', 'All fields are required.');
      return;
    }
    if (password.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters.');
      return;
    }
    registerMutation.mutate({ data: { fullName: fullName.trim(), email: email.trim().toLowerCase(), password } });
  };

  const s = styles(colors);

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.back}>
            <Text style={s.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={s.title}>Create Account</Text>
          <Text style={s.subtitle}>إنشاء حساب جديد</Text>
        </View>

        <View style={s.form}>
          <Text style={s.label}>Full Name</Text>
          <TextInput
            style={s.input}
            value={fullName}
            onChangeText={setFullName}
            placeholder="Ahmed Ould Mohamed"
            placeholderTextColor={colors.mutedForeground}
            autoCapitalize="words"
          />

          <Text style={s.label}>Email</Text>
          <TextInput
            style={s.input}
            value={email}
            onChangeText={setEmail}
            placeholder="your@email.com"
            placeholderTextColor={colors.mutedForeground}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={s.label}>Password</Text>
          <TextInput
            style={s.input}
            value={password}
            onChangeText={setPassword}
            placeholder="Min. 8 characters"
            placeholderTextColor={colors.mutedForeground}
            secureTextEntry
          />

          <TouchableOpacity
            style={[s.btn, registerMutation.isPending && s.btnDisabled]}
            onPress={handleRegister}
            disabled={registerMutation.isPending}
          >
            {registerMutation.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={s.btnText}>Register</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={s.link} onPress={() => router.back()}>
            <Text style={s.linkText}>Already have an account? <Text style={s.linkBold}>Sign in</Text></Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
    header: { marginBottom: 32 },
    back: { marginBottom: 16 },
    backText: { color: colors.navy, fontSize: 16, fontWeight: '600' },
    title: { fontSize: 28, fontWeight: '700', color: colors.navy },
    subtitle: { fontSize: 16, color: colors.mutedForeground, marginTop: 4 },
    form: { gap: 4 },
    label: { fontSize: 14, fontWeight: '600', color: colors.foreground, marginBottom: 4 },
    input: {
      borderWidth: 1.5, borderColor: colors.border, borderRadius: 12,
      paddingHorizontal: 16, paddingVertical: 14, fontSize: 16,
      color: colors.foreground, backgroundColor: colors.card, marginBottom: 12,
    },
    btn: {
      backgroundColor: colors.navy, borderRadius: 12,
      paddingVertical: 16, alignItems: 'center', marginTop: 8,
    },
    btnDisabled: { opacity: 0.6 },
    btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
    link: { alignItems: 'center', paddingVertical: 16 },
    linkText: { color: colors.mutedForeground, fontSize: 14 },
    linkBold: { color: colors.navy, fontWeight: '600' },
  });
