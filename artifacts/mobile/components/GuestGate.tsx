import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { usePreferences } from '@/contexts/PreferencesContext';
import { useColors } from '@/hooks/useColors';
import { EmptyState } from '@/components/ui/EmptyState';

/**
 * Blocks guest sessions from mounting screens whose queries all require auth
 * (they would 401 and render misleading empty states). Renders a clear locked
 * state with a login/register call-to-action instead of the children, so the
 * protected hooks in the child screen never run for guests.
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

const s = StyleSheet.create({
  root: { flex: 1, justifyContent: 'center', paddingBottom: 80 },
});
