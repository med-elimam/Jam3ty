import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { usePreferences } from '@/contexts/PreferencesContext';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/Screen';
import { OptionRow } from '@/components/ui/SettingControls';
import { spacing, fontSize } from '@/constants/theme';

export default function LanguageScreen() {
  const colors = useColors();
  const { t, isRTL, language, setLanguage } = usePreferences();
  return (
    <Screen edges={['bottom']}>
      <ScrollView contentContainerStyle={s.content}>
        <Card style={s.card}>
          <OptionRow
            label={t('settings.languageArabic')}
            selected={language === 'ar'}
            onPress={() => setLanguage('ar')}
          />
          <OptionRow
            label={t('settings.languageFrench')}
            selected={language === 'fr'}
            onPress={() => setLanguage('fr')}
            last
          />
        </Card>
        <Text style={[s.note, { color: colors.mutedForeground, textAlign: isRTL ? 'right' : 'left' }]}>
          {t('settings.languageNote')}
        </Text>
      </ScrollView>
    </Screen>
  );
}

const s = StyleSheet.create({
  content: { padding: spacing.base, gap: spacing.md },
  card: { padding: 0, overflow: 'hidden' },
  note: { fontSize: fontSize.sm, paddingHorizontal: spacing.xs },
});
