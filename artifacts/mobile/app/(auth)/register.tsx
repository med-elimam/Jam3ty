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
import { useT } from '@/contexts/PreferencesContext';
import type { AuthUser } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { spacing, fontSize, fontWeight, radius } from '@/constants/theme';

import { API_BASE_URL } from '@/lib/urls';

const REGISTER_ENDPOINT = `${API_BASE_URL}/api/auth/register`;

export default function RegisterScreen() {
  const colors = useColors();
  const router = useRouter();
  const { login } = useAuth();
  const { t } = useT();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!fullName.trim() || !email.trim() || !password) {
      Alert.alert(t('common.error'), t('auth.allFieldsRequired'));
      return;
    }
    if (password.length < 8) {
      Alert.alert(t('common.error'), t('auth.passwordTooShort'));
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
        let msg = t('auth.unexpectedError');
        try {
          const parsed = JSON.parse(rawText);
          msg = parsed?.error?.message ?? parsed?.message ?? msg;
        } catch {}
        Alert.alert(t('auth.registerFailed'), msg);
        return;
      }

      const data = JSON.parse(rawText);
      const d = data?.data;
      if (d?.user && d?.tokens) {
        await login(d.user as AuthUser, d.tokens.accessToken, d.tokens.refreshToken);
      } else {
        Alert.alert(t('common.error'), t('auth.unexpectedResponse'));
      }
    } catch (err: any) {
      Alert.alert(t('auth.connectionError'), err?.message ?? String(err));
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
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={[s.back, { color: colors.navy }]}>→ {t('common.back')}</Text>
          </TouchableOpacity>
          <Text style={[s.title, { color: colors.navy }]}>{t('auth.registerTitle')}</Text>
          <Text style={[s.subtitle, { color: colors.mutedForeground }]}>{t('auth.joinJamiati')}</Text>
        </View>

        {/* Form */}
        <View style={s.form}>
          <Input
            label={t('auth.fullName')}
            value={fullName}
            onChangeText={setFullName}
            placeholder={t('auth.fullNamePlaceholder')}
            autoCapitalize="words"
          />

          <Input
            label={t('auth.email')}
            value={email}
            onChangeText={setEmail}
            placeholder="example@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Input
            label={t('auth.password')}
            value={password}
            onChangeText={setPassword}
            placeholder={t('auth.passwordMin')}
            isPassword
          />

          <Button
            label={t('auth.createAccountBtn')}
            variant="primary"
            size="lg"
            loading={loading}
            onPress={handleRegister}
            style={{ marginTop: spacing.sm }}
          />
        </View>

        {/* Link */}
        <TouchableOpacity onPress={() => router.back()} style={s.linkRow}>
          <Text style={[s.linkText, { color: colors.mutedForeground }]}>
            {t('auth.haveAccount')}{' '}
            <Text style={{ color: colors.navy, fontWeight: fontWeight.semibold }}>{t('auth.login')}</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  scroll: { flexGrow: 1, justifyContent: 'center', padding: spacing.xl, gap: spacing.xl },
  header: { gap: spacing.sm },
  back: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, textAlign: 'right' },
  title: { fontSize: fontSize['3xl'], fontWeight: fontWeight.bold, textAlign: 'right' },
  subtitle: { fontSize: fontSize.md, textAlign: 'right' },
  form: { gap: spacing.md },
  linkRow: { alignItems: 'center', paddingVertical: spacing.xs },
  linkText: { fontSize: fontSize.base, textAlign: 'center' },
});
