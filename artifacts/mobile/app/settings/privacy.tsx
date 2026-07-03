import React from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { usePreferences } from '@/contexts/PreferencesContext';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/Screen';
import { OptionRow, ToggleRow } from '@/components/ui/SettingControls';
import { spacing, fontSize, fontWeight } from '@/constants/theme';

export default function PrivacyScreen() {
  const colors = useColors();
  const { t, isRTL, privacy, setPrivacy } = usePreferences();
  const align = { textAlign: isRTL ? 'right' : 'left' } as const;

  return (
    <Screen edges={['bottom']}>
      <ScrollView contentContainerStyle={s.content}>
        <Text style={[s.label, { color: colors.mutedForeground }, align]}>{t('settings.profileVisibility')}</Text>
        <Card style={s.card}>
          <OptionRow label={t('settings.visPrivate')} selected={privacy.profileVisibility === 'private'} onPress={() => setPrivacy('profileVisibility', 'private')} />
          <OptionRow label={t('settings.visUniversity')} selected={privacy.profileVisibility === 'university'} onPress={() => setPrivacy('profileVisibility', 'university')} />
          <OptionRow label={t('settings.visPublic')} selected={privacy.profileVisibility === 'public'} onPress={() => setPrivacy('profileVisibility', 'public')} last />
        </Card>

        <Card style={s.card}>
          <ToggleRow label={t('settings.allowMessages')} value={privacy.allowMessages} onValueChange={(v) => setPrivacy('allowMessages', v)} last />
        </Card>

        <Text style={[s.label, { color: colors.mutedForeground }, align]}>{t('settings.blockedUsers')}</Text>
        <Card style={s.emptyCard}>
          <Text style={[s.empty, { color: colors.mutedForeground }, align]}>{t('settings.blockedEmpty')}</Text>
        </Card>
      </ScrollView>
    </Screen>
  );
}

const s = StyleSheet.create({
  content: { padding: spacing.base, gap: spacing.sm },
  card: { padding: 0, overflow: 'hidden', marginBottom: spacing.sm },
  emptyCard: { padding: spacing.base },
  label: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: spacing.sm,
  },
  empty: { fontSize: fontSize.sm },
});
