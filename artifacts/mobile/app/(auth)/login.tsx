import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/contexts/AuthContext';
import type { AuthUser } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { spacing, fontSize, fontWeight, radius } from '@/constants/theme';

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
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
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
      Alert.alert('خطأ في الاتصال', err?.message ?? String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={s.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo */}
        <View style={s.logoSection}>
          <View style={[s.logoBox, { backgroundColor: colors.navy }]}>
            <Text style={[s.logoLetter, { color: colors.gold }]}>ج</Text>
          </View>
          <Text style={[s.appName, { color: colors.navy }]}>جامعتي</Text>
          <Text style={[s.tagline, { color: colors.mutedForeground }]}>جامعتك في جيبك.</Text>
        </View>

        {/* Form */}
        <View style={s.form}>
          <Input
            label="البريد الإلكتروني"
            value={email}
            onChangeText={setEmail}
            placeholder="example@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            containerStyle={s.field}
          />

          <Input
            label="كلمة المرور"
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            isPassword
            containerStyle={s.field}
          />

          <Button
            label="تسجيل الدخول"
            variant="primary"
            size="lg"
            loading={loading}
            onPress={handleLogin}
          />
        </View>

        {/* Links */}
        <View style={s.links}>
          <TouchableOpacity onPress={() => router.push('/(auth)/register')} style={s.linkRow}>
            <Text style={[s.linkText, { color: colors.mutedForeground }]}>
              ليس لديك حساب؟{' '}
              <Text style={{ color: colors.navy, fontWeight: fontWeight.semibold }}>إنشاء حساب</Text>
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={loginAsGuest} style={s.linkRow}>
            <Text style={[s.skipText, { color: colors.mutedForeground }]}>
              تخطي في الوقت الحالي
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  scroll: { flexGrow: 1, justifyContent: 'center', padding: spacing.xl, gap: spacing.xl },
  logoSection: { alignItems: 'center', gap: spacing.sm },
  logoBox: {
    width: 88,
    height: 88,
    borderRadius: radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 8,
  },
  logoLetter: { fontSize: 44, fontWeight: fontWeight.bold },
  appName: { fontSize: fontSize['3xl'], fontWeight: fontWeight.bold, letterSpacing: 0.5 },
  tagline: { fontSize: fontSize.md },

  form: { gap: spacing.md },
  field: { gap: spacing.xs },

  links: { alignItems: 'center', gap: spacing.base },
  linkRow: { paddingVertical: spacing.xs },
  linkText: { fontSize: fontSize.base, textAlign: 'center' },
  skipText: { fontSize: fontSize.sm, opacity: 0.7 },
});
