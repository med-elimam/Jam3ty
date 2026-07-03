import React, { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider } from '@/contexts/AuthContext';
import { PreferencesProvider, usePreferences } from '@/contexts/PreferencesContext';
import { useColors } from '@/hooks/useColors';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 3,   // 3 min
      gcTime: 1000 * 60 * 10,
      retry: 1,
    },
  },
});

function RootLayoutNav() {
  const { t } = usePreferences();
  const colors = useColors();

  const headerScreen = (name: string, titleKey: string) => (
    <Stack.Screen
      name={name}
      options={{
        headerShown: true,
        title: t(titleKey),
        headerStyle: { backgroundColor: colors.navy },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700', fontSize: 17 },
      }}
    />
  );

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      {headerScreen('more/index', 'screens.more')}
      {headerScreen('course/[id]', 'screens.course')}
      {headerScreen('files/index', 'screens.files')}
      {headerScreen('announcements/index', 'screens.announcements')}
      {headerScreen('assignments/index', 'screens.assignments')}
      {headerScreen('exams/index', 'screens.exams')}
      {headerScreen('events/index', 'screens.events')}
      {headerScreen('clubs/index', 'screens.clubs')}
      {headerScreen('opportunities/index', 'screens.opportunities')}
      {headerScreen('ai/index', 'screens.ai')}
      {headerScreen('subscription/index', 'screens.subscription')}
      {headerScreen('notifications/index', 'screens.notifications')}
      <Stack.Screen name="settings" options={{ headerShown: false }} />
    </Stack>
  );
}

function Gate() {
  const { ready } = usePreferences();
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if ((fontsLoaded || fontError) && ready) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError, ready]);

  if ((!fontsLoaded && !fontError) || !ready) return null;

  return <RootLayoutNav />;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <PreferencesProvider>
            <AuthProvider>
              <GestureHandlerRootView style={{ flex: 1 }}>
                <KeyboardProvider>
                  <Gate />
                </KeyboardProvider>
              </GestureHandlerRootView>
            </AuthProvider>
          </PreferencesProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
