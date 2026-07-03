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
import type { AuthUser } from '@/contexts/AuthContext';

// ─── Read the env var at module scope so we can see exactly what Metro baked in ─
const BAKED_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? '(NOT SET)';
const REGISTER_ENDPOINT = `${BAKED_BASE_URL.replace(/\/+$/, '')}/api/auth/register`;

export default function RegisterScreen() {
  const colors = useColors();
  const router = useRouter();
  const { login } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // ── Debug state ──────────────────────────────────────────────────────────────
  const [debugStatus, setDebugStatus] = useState<number | null>(null);
  const [debugBody, setDebugBody] = useState<string>('');
  const [debugError, setDebugError] = useState<string>('');

  const handleRegister = async () => {
    if (!fullName.trim() || !email.trim() || !password) {
      Alert.alert('Error', 'All fields are required.');
      return;
    }
    if (password.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters.');
      return;
    }

    setLoading(true);
    setDebugStatus(null);
    setDebugBody('');
    setDebugError('');

    try {
      console.log('[Register] URL:', REGISTER_ENDPOINT);
      const response = await fetch(REGISTER_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: email.trim().toLowerCase(),
          password,
        }),
      });

      const rawText = await response.text();
      setDebugStatus(response.status);
      setDebugBody(rawText);
      console.log('[Register] status:', response.status, 'body:', rawText);

      if (!response.ok) {
        let msg = `HTTP ${response.status}`;
        try {
          const parsed = JSON.parse(rawText);
          msg = parsed?.error?.message ?? parsed?.message ?? msg;
        } catch {}
        Alert.alert(`Error (${response.status})`, msg);
        return;
      }

      const data = JSON.parse(rawText);
      const d = data?.data;
      if (d?.user && d?.tokens) {
        await login(d.user as AuthUser, d.tokens.accessToken, d.tokens.refreshToken);
      } else {
        Alert.alert('Error', 'Unexpected response shape from server.');
      }
    } catch (err: any) {
      const msg = err?.message ?? String(err);
      setDebugError(msg);
      console.log('[Register] Network error:', msg);
      Alert.alert('Network Error', msg);
    } finally {
      setLoading(false);
    }
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

        {/* ── DEBUG PANEL ─────────────────────────────────────────── */}
        <View style={s.debug}>
          <Text style={s.debugTitle}>🔍 DEBUG</Text>
          <Text style={s.debugRow}>
            <Text style={s.debugKey}>EXPO_PUBLIC_API_BASE_URL: </Text>
            <Text style={s.debugVal}>{BAKED_BASE_URL}</Text>
          </Text>
          <Text style={s.debugRow}>
            <Text style={s.debugKey}>Endpoint: </Text>
            <Text style={s.debugVal}>{REGISTER_ENDPOINT}</Text>
          </Text>
          {debugStatus !== null && (
            <Text style={[s.debugRow, { color: debugStatus < 300 ? '#4ade80' : '#f87171' }]}>
              Status: {debugStatus}
            </Text>
          )}
          {debugBody !== '' && (
            <Text style={s.debugRow} numberOfLines={6}>
              <Text style={s.debugKey}>Response: </Text>
              <Text style={s.debugVal}>{debugBody}</Text>
            </Text>
          )}
          {debugError !== '' && (
            <Text style={[s.debugRow, { color: '#f87171' }]}>
              Network Error: {debugError}
            </Text>
          )}
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
            style={[s.btn, loading && s.btnDisabled]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={s.btnText}>Register</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={s.link} onPress={() => router.back()}>
            <Text style={s.linkText}>
              Already have an account? <Text style={s.linkBold}>Sign in</Text>
            </Text>
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
    header: { marginBottom: 16 },
    back: { marginBottom: 16 },
    backText: { color: colors.navy, fontSize: 16, fontWeight: '600' },
    title: { fontSize: 28, fontWeight: '700', color: colors.navy },
    subtitle: { fontSize: 16, color: colors.mutedForeground, marginTop: 4 },
    // debug panel
    debug: {
      backgroundColor: '#0f172a',
      borderRadius: 8,
      padding: 10,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: '#334155',
    },
    debugTitle: { color: '#94a3b8', fontSize: 11, fontWeight: '700', marginBottom: 6 },
    debugRow: { fontSize: 10, color: '#cbd5e1', marginBottom: 2, flexWrap: 'wrap' },
    debugKey: { color: '#64748b', fontWeight: '600' },
    debugVal: { color: '#e2e8f0' },
    // form
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
