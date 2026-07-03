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
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="more" options={{ headerShown: true, title: 'More Modules' }} />
      <Stack.Screen name="course/[id]" options={{ headerShown: true, title: '' }} />
      <Stack.Screen name="files" options={{ headerShown: true, title: 'Files' }} />
      <Stack.Screen name="announcements" options={{ headerShown: true, title: 'Announcements' }} />
      <Stack.Screen name="assignments" options={{ headerShown: true, title: 'Assignments' }} />
      <Stack.Screen name="exams" options={{ headerShown: true, title: 'Exams' }} />
      <Stack.Screen name="events" options={{ headerShown: true, title: 'Events' }} />
      <Stack.Screen name="clubs" options={{ headerShown: true, title: 'Clubs' }} />
      <Stack.Screen name="opportunities" options={{ headerShown: true, title: 'Opportunities' }} />
      <Stack.Screen name="ai" options={{ headerShown: true, title: 'AI Assistant' }} />
      <Stack.Screen name="subscription" options={{ headerShown: true, title: 'Subscription' }} />
      <Stack.Screen name="notifications" options={{ headerShown: true, title: 'Notifications' }} />
      <Stack.Screen name="settings" options={{ headerShown: true, title: 'Settings' }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <GestureHandlerRootView style={{ flex: 1 }}>
              <KeyboardProvider>
                <RootLayoutNav />
              </KeyboardProvider>
            </GestureHandlerRootView>
          </AuthProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
