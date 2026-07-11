import { Alert, Platform } from 'react-native';

/**
 * react-native-web does NOT implement Alert — on the student web app every
 * Alert.alert() silently does nothing, which made login/register failures
 * invisible. Always use these helpers instead of Alert.alert directly.
 */

/** Informational alert: native Alert on iOS/Android, window.alert on web. */
export function showAlert(title: string, message?: string): void {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') {
      window.alert(message ? `${title}\n\n${message}` : title);
    }
    return;
  }
  Alert.alert(title, message);
}

/** Confirm dialog: runs onConfirm when the user accepts. */
export function showConfirm(
  title: string,
  message: string,
  confirmLabel: string,
  cancelLabel: string,
  onConfirm: () => void,
  destructive = false,
): void {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.confirm(`${title}\n\n${message}`)) {
      onConfirm();
    }
    return;
  }
  Alert.alert(title, message, [
    { text: cancelLabel, style: 'cancel' },
    { text: confirmLabel, style: destructive ? 'destructive' : 'default', onPress: onConfirm },
  ]);
}
