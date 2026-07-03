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
import { useLogin } from '@workspace/api-client-react';
import type { AuthUser } from '@/contexts/AuthContext';

export default function LoginScreen() {
  const colors = useColors();
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const loginMutation = useLogin({
    mutation: {
      onSuccess: async (data: any) => {
        const d = data?.data;
        if (d?.user && d?.tokens) {
          await login(d.user as AuthUser, d.tokens.accessToken, d.tokens.refreshToken);
        }
      },
      onError: (err: any) => {
        const msg = err?.data?.error?.message ?? 'Login failed. Check your email and password.';
        Alert.alert('Login failed', msg);
      },
    },
  });

  const handleLogin = () => {
    if (!email.trim() || !password) {
      Alert.alert('Error', 'Please enter your email and password.');
      return;
    }
    loginMutation.mutate({ data: { email: email.trim().toLowerCase(), password } });
  };

  const s = styles(colors);

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={s.header}>
          <View style={s.logoBox}>
            <Text style={s.logoText}>ط</Text>
          </View>
          <Text style={s.title}>Talib MR</Text>
          <Text style={s.subtitle}>طالب موريتانيا</Text>
        </View>

        {/* Form */}
        <View style={s.form}>
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
            placeholder="••••••••"
            placeholderTextColor={colors.mutedForeground}
            secureTextEntry
          />

          <TouchableOpacity
            style={[s.btn, loginMutation.isPending && s.btnDisabled]}
            onPress={handleLogin}
            disabled={loginMutation.isPending}
          >
            {loginMutation.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={s.btnText}>Sign In</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={s.link} onPress={() => router.push('/(auth)/register')}>
            <Text style={s.linkText}>Don't have an account? <Text style={s.linkBold}>Register</Text></Text>
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
    header: { alignItems: 'center', marginBottom: 40 },
    logoBox: {
      width: 80, height: 80, borderRadius: 24,
      backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center',
      marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 12, elevation: 6,
    },
    logoText: { fontSize: 40, color: colors.gold, fontWeight: '700' },
    title: { fontSize: 28, fontWeight: '700', color: colors.navy, letterSpacing: 0.5 },
    subtitle: { fontSize: 16, color: colors.mutedForeground, marginTop: 4 },
    form: { gap: 8 },
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
