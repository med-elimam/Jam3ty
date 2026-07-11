import { LogBox } from 'react-native';
import React, { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Platform } from 'react-native';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import Feather from '@expo/vector-icons/Feather';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider } from '@/contexts/AuthContext';
import { PreferencesProvider, usePreferences } from '@/contexts/PreferencesContext';
import { useColors } from '@/hooks/useColors';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { directionalHeaderOptions } from '@/components/DirectionalHeaderTitle';

// Suppress harmless "Codegen didn't run" warnings (expected in Expo Go with newArchEnabled)
LogBox.ignoreLogs([/Codegen didn't run/]);

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
  const { t, isRTL } = usePreferences();
  const colors = useColors();

  const headerScreen = (name: string, titleKey: string) => (
    <Stack.Screen
      name={name}
      options={{
        headerShown: true,
        ...directionalHeaderOptions(t(titleKey), isRTL),
        headerStyle: { backgroundColor: colors.card },
        headerTintColor: colors.foreground,
        headerShadowVisible: false,
      }}
    />
  );

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      {headerScreen('more/index', 'screens.more')}
      {headerScreen('course/[id]', 'screens.course')}
      {headerScreen('content/[id]', 'screens.content')}
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
  usePushNotifications();
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    ...FontAwesome.font,
    ...Feather.font,
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
                <KeyboardProvider enabled={Platform.OS !== 'web'}>
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
