import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { usePreferences } from '@/contexts/PreferencesContext';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/Screen';
import { ToggleRow } from '@/components/ui/SettingControls';
import { spacing } from '@/constants/theme';

export default function NotificationsScreen() {
  const { t, notif, setNotif } = usePreferences();
  return (
    <Screen edges={['bottom']}>
      <ScrollView contentContainerStyle={s.content}>
        <Card style={s.card}>
          <ToggleRow label={t('settings.notifAnnouncements')} value={notif.announcements} onValueChange={(v) => setNotif('announcements', v)} />
          <ToggleRow label={t('settings.notifFiles')} value={notif.files} onValueChange={(v) => setNotif('files', v)} />
          <ToggleRow label={t('settings.notifAssignments')} value={notif.assignments} onValueChange={(v) => setNotif('assignments', v)} />
          <ToggleRow label={t('settings.notifExams')} value={notif.exams} onValueChange={(v) => setNotif('exams', v)} />
          <ToggleRow label={t('settings.notifCommunity')} value={notif.community} onValueChange={(v) => setNotif('community', v)} />
          <ToggleRow label={t('settings.notifSubscription')} value={notif.subscription} onValueChange={(v) => setNotif('subscription', v)} last />
        </Card>
      </ScrollView>
    </Screen>
  );
}

const s = StyleSheet.create({
  content: { padding: spacing.base },
  card: { padding: 0, overflow: 'hidden' },
});
