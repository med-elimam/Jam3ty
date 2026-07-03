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
const REGISTER_ENDPOINT = `${BASE_URL}/api/auth/register`;

export default function RegisterScreen() {
  const colors = useColors();
  const router = useRouter();
  const { login } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!fullName.trim() || !email.trim() || !password) {
      Alert.alert('خطأ', 'جميع الحقول مطلوبة.');
      return;
    }
    if (password.length < 8) {
      Alert.alert('خطأ', 'كلمة المرور يجب أن تكون 8 أحرف على الأقل.');
      return;
    }

    setLoading(true);
    try {
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

      if (!response.ok) {
        let msg = 'حدث خطأ غير متوقع. يرجى المحاولة مجدداً.';
        try {
          const parsed = JSON.parse(rawText);
          msg = parsed?.error?.message ?? parsed?.message ?? msg;
        } catch {}
        Alert.alert('فشل إنشاء الحساب', msg);
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
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.back}>
            <Text style={s.backText}>رجوع →</Text>
          </TouchableOpacity>
          <Text style={s.title}>إنشاء حساب</Text>
          <Text style={s.subtitle}>انضم إلى جامعتي</Text>
        </View>

        <View style={s.form}>
          <Text style={s.label}>الاسم الكامل</Text>
          <TextInput
            style={s.input}
            value={fullName}
            onChangeText={setFullName}
            placeholder="أحمد ولد محمد"
            placeholderTextColor={colors.mutedForeground}
            autoCapitalize="words"
            textAlign="right"
          />

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
            placeholder="على الأقل 8 أحرف"
            placeholderTextColor={colors.mutedForeground}
            secureTextEntry
            textAlign="right"
          />

          <TouchableOpacity
            style={[s.btn, loading && s.btnDisabled]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={s.btnText}>إنشاء الحساب</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={s.link} onPress={() => router.back()}>
            <Text style={s.linkText}>
              لديك حساب؟ <Text style={s.linkBold}>تسجيل الدخول</Text>
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
    header: { marginBottom: 24 },
    back: { marginBottom: 16 },
    backText: { color: colors.navy, fontSize: 16, fontWeight: '600' },
    title: { fontSize: 28, fontWeight: '700', color: colors.navy, textAlign: 'right' },
    subtitle: { fontSize: 16, color: colors.mutedForeground, marginTop: 4, textAlign: 'right' },
    form: { gap: 4 },
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
  });
