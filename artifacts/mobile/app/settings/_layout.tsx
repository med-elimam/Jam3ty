import React from 'react';
import { Stack } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { usePreferences } from '@/contexts/PreferencesContext';
import { directionalHeaderOptions } from '@/components/DirectionalHeaderTitle';

export default function SettingsLayout() {
  const colors = useColors();
  const { t, isRTL } = usePreferences();

  const headerOptions = (titleKey: string) =>
    directionalHeaderOptions(t(titleKey), isRTL);

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: colors.navy },
        headerTintColor: '#fff',
        headerBackButtonDisplayMode: 'minimal',
      }}
    >
      <Stack.Screen name="index" options={headerOptions('screens.settings')} />
      <Stack.Screen name="language" options={headerOptions('settings.languageTitle')} />
      <Stack.Screen name="appearance" options={headerOptions('settings.appearanceTitle')} />
      <Stack.Screen name="notifications" options={headerOptions('settings.notificationsTitle')} />
      <Stack.Screen name="privacy" options={headerOptions('settings.privacyTitle')} />
    </Stack>
  );
}
