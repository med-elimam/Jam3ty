import React, { useCallback } from 'react';
import { Alert, Platform, StyleSheet, View } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { usePreferences } from '@/contexts/PreferencesContext';
import { useColors } from '@/hooks/useColors';
import { EmptyState } from '@/components/ui/EmptyState';

/**
 * Blocks guest sessions from mounting screens whose content is entirely
 * account-bound (courses, files, assignments, exams, timetable, community,
 * profile, notifications, AI). Renders a clear locked state with a
 * login/register call-to-action instead of the children, so the protected
 * hooks in the child screen never run for guests.
 *
 * Screens with PUBLIC content (announcements, events, subscription plans)
 * must NOT be wrapped — they render for guests and guard only their
 * account-bound actions via useRequireAccount().
 */
export function GuestGate({ children }: { children: React.ReactNode }) {
  const { isGuest, logout } = useAuth();
  const { t } = usePreferences();
  const colors = useColors();

  if (!isGuest) return <>{children}</>;

  return (
    <View style={[s.root, { backgroundColor: colors.background }]}>
      <EmptyState
        icon="lock"
        title={t('guest.lockedTitle')}
        body={t('guest.lockedBody')}
        actionLabel={t('guest.loginCta')}
        onAction={() => { logout(); }}
      />
    </View>
  );
}

/**
 * For account-bound ACTIONS inside guest-visible screens (register for an
 * event, redeem a code, subscribe). Returns a function that, when the session
 * is a guest, shows a login prompt and returns true (= blocked). Callers:
 *   if (requireAccount()) return;  // then proceed with the mutation
 */
export function useRequireAccount(): () => boolean {
  const { isGuest, logout } = useAuth();
  const { t } = usePreferences();

  return useCallback(() => {
    if (!isGuest) return false;
    if (Platform.OS === 'web') {
      // react-native-web does not implement Alert — use a native confirm.
      const ok = typeof window !== 'undefined'
        && window.confirm(`${t('guest.lockedTitle')}\n\n${t('guest.actionNeedsAccount')}`);
      if (ok) logout();
    } else {
      Alert.alert(t('guest.lockedTitle'), t('guest.actionNeedsAccount'), [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('auth.login'), onPress: () => { logout(); } },
      ]);
    }
    return true;
  }, [isGuest, logout, t]);
}

const s = StyleSheet.create({
  root: { flex: 1, justifyContent: 'center', paddingBottom: 80 },
});
