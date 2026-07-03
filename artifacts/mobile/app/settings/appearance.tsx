import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { usePreferences } from '@/contexts/PreferencesContext';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/Screen';
import { OptionRow } from '@/components/ui/SettingControls';
import { spacing } from '@/constants/theme';

export default function AppearanceScreen() {
  const { t, theme, setTheme } = usePreferences();
  return (
    <Screen edges={['bottom']}>
      <ScrollView contentContainerStyle={s.content}>
        <Card style={s.card}>
          <OptionRow label={t('settings.themeSystem')} selected={theme === 'system'} onPress={() => setTheme('system')} />
          <OptionRow label={t('settings.themeLight')} selected={theme === 'light'} onPress={() => setTheme('light')} />
          <OptionRow label={t('settings.themeDark')} selected={theme === 'dark'} onPress={() => setTheme('dark')} last />
        </Card>
      </ScrollView>
    </Screen>
  );
}

const s = StyleSheet.create({
  content: { padding: spacing.base },
  card: { padding: 0, overflow: 'hidden' },
});
