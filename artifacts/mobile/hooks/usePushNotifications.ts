import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { useRegisterPushToken } from '@workspace/api-client-react';
import { useAuth } from '@/contexts/AuthContext';

// Set how notifications are handled when the app is running in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export function usePushNotifications() {
  const { isAuthenticated, isGuest } = useAuth();
  const { mutate: registerToken } = useRegisterPushToken({});
  const responseListener = useRef<Notifications.Subscription | null>(null);

  useEffect(() => {
    // Guest or unauthenticated users don't register tokens
    if (!isAuthenticated || isGuest) return;

    async function registerForPushNotificationsAsync() {
      if (Platform.OS === 'web') return;

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Permission not granted for push notifications');
        return;
      }

      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      if (!projectId) {
        console.error('EAS project ID not found in app.json config');
        return;
      }

      try {
        const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
        const token = tokenData.data;

        if (token) {
          registerToken({
            data: {
              token,
              platform: Platform.OS as 'ios' | 'android',
            },
          });
        }
      } catch (error) {
        console.error('Failed to get Expo Push Token', error);
      }
    }

    registerForPushNotificationsAsync();

    // Listener when a notification is clicked/interacted with
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response: Notifications.NotificationResponse) => {
        // Here you can deep link or route the user to specific pages
        console.log('Notification clicked', response.notification.request.content);
      }
    );

    return () => {
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [isAuthenticated, isGuest, registerToken]);
}
