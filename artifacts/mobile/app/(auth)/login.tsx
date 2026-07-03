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

const BASE_URL = (process.env.EXPO_PUBLIC_API_BASE_URL ?? '').replace(/\/+$/, '');
const LOGIN_ENDPOINT = `${BASE_URL}/api/auth/login`;

export default function LoginScreen() {
  const colors = useColors();
  const router = useRouter();
  const { login, loginAsGuest } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert('خطأ', 'يرجى إدخال البريد الإلكتروني وكلمة المرور.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(LOGIN_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
        }),
      });

      const rawText = await response.text();

      if (!response.ok) {
        let msg = 'حدث خطأ غير متوقع. يرجى المحاولة مجدداً.';
        try {
          const parsed = JSON.parse(rawText);
          msg = parsed?.error?.message ?? parsed?.message ?? msg;
        } catch {}
        Alert.alert('فشل تسجيل الدخول', msg);
        return;
      }

      const data = JSON.parse(rawText);
      const d = data?.data;
      if (d?.user && d?.tokens) {
        await login(d.user as AuthUser, d.tokens.accessToken, d.tokens.refreshToken);
      } else {
        Alert.alert('خطأ', 'استجابة غير متوقعة من الخادم. يرجى المحاولة مجدداً.');
      }
    } catch (err: any) {
      const msg = err?.message ?? String(err);
      Alert.alert('خطأ في الاتصال', msg);
    } finally {
      setLoading(false);
    }
  };

  const s = styles(colors);

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={s.header}>
          <View style={s.logoBox}>
            <Text style={s.logoText}>ج</Text>
          </View>
          <Text style={s.title}>جامعتي</Text>
          <Text style={s.subtitle}>جامعتك في جيبك.</Text>
        </View>

        {/* Form */}
        <View style={s.form}>
          <Text style={s.label}>البريد الإلكتروني</Text>
          <TextInput
            style={s.input}
            value={email}
            onChangeText={setEmail}
            placeholder="example@email.com"
            placeholderTextColor={colors.mutedForeground}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            textAlign="right"
          />

          <Text style={s.label}>كلمة المرور</Text>
          <TextInput
            style={s.input}
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            placeholderTextColor={colors.mutedForeground}
            secureTextEntry
            textAlign="right"
          />

          <TouchableOpacity
            style={[s.btn, loading && s.btnDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={s.btnText}>تسجيل الدخول</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={s.link} onPress={() => router.push('/(auth)/register')}>
            <Text style={s.linkText}>
              ليس لديك حساب؟ <Text style={s.linkBold}>إنشاء حساب</Text>
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.skipBtn} onPress={loginAsGuest}>
            <Text style={s.skipText}>تخطي في الوقت الحالي</Text>
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
    header: { alignItems: 'center', marginBottom: 32 },
    logoBox: {
      width: 80, height: 80, borderRadius: 24,
      backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center',
      marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 12, elevation: 6,
    },
    logoText: { fontSize: 40, color: colors.gold, fontWeight: '700' },
    title: { fontSize: 28, fontWeight: '700', color: colors.navy, letterSpacing: 0.5 },
    subtitle: { fontSize: 16, color: colors.mutedForeground, marginTop: 4 },
    form: { gap: 8 },
    label: { fontSize: 14, fontWeight: '600', color: colors.foreground, marginBottom: 4, textAlign: 'right' },
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
    skipBtn: { alignItems: 'center', paddingVertical: 12 },
    skipText: { color: colors.mutedForeground, fontSize: 13, opacity: 0.7 },
  });
