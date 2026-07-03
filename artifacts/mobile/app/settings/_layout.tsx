import React from 'react';
import { Stack } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { usePreferences } from '@/contexts/PreferencesContext';

export default function SettingsLayout() {
  const colors = useColors();
  const { t } = usePreferences();

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: colors.navy },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700', fontSize: 17 },
        headerBackButtonDisplayMode: 'minimal',
      }}
    >
      <Stack.Screen name="index" options={{ title: t('screens.settings') }} />
      <Stack.Screen name="language" options={{ title: t('settings.languageTitle') }} />
      <Stack.Screen name="appearance" options={{ title: t('settings.appearanceTitle') }} />
      <Stack.Screen name="notifications" options={{ title: t('settings.notificationsTitle') }} />
      <Stack.Screen name="privacy" options={{ title: t('settings.privacyTitle') }} />
    </Stack>
  );
}
