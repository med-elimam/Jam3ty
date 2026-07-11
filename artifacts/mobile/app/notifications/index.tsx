import React from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { useListNotifications, useMarkAllNotificationsRead, Notification } from '@workspace/api-client-react';
import { getListNotificationsQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { GuestGate } from '@/components/GuestGate';
import { Card } from '@/components/ui/Card';
import { usePreferences } from '@/contexts/PreferencesContext';
import { spacing, fontSize, fontWeight, radius } from '@/constants/theme';

type FeatherName = React.ComponentProps<typeof Feather>['name'];
const NOTIF_ICON: Record<string, FeatherName> = {
  announcement: 'bell', assignment: 'clipboard', exam: 'bar-chart-2',
  file: 'file', event: 'calendar', subscription: 'star', system: 'info', ai: 'cpu',
};

// The notification contract exposes only `type` (no structured payload), so
// navigation maps known types to their list screens. Unknown types stay put.
const NOTIF_ROUTE: Record<string, Href> = {
  announcement: '/announcements',
  assignment: '/assignments',
  exam: '/exams',
  file: '/files',
  event: '/events',
  subscription: '/subscription',
};

function timeAgo(date: string, t: (key: string, vars?: Record<string, string | number>) => string) {
  const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (diff < 60) return t('time.now');
  if (diff < 3600) return `${Math.floor(diff / 60)}${t('time.min')}`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}${t('time.hour')}`;
  return `${Math.floor(diff / 86400)}${t('time.day')}`;
}

export default function NotificationsScreen() {
  return (
    <GuestGate>
      <NotificationsScreenInner />
    </GuestGate>
  );
}

function NotificationsScreenInner() {
  const colors = useColors();
  const router = useRouter();
  const { t, isRTL } = usePreferences();
  const qc = useQueryClient();
  const { data, isLoading, isError, refetch, isRefetching } = useListNotifications();
  const markAll = useMarkAllNotificationsRead({
    mutation: { onSuccess: () => qc.invalidateQueries({ queryKey: getListNotificationsQueryKey() }) },
  });

  const notifications: Notification[] = data?.data ?? [];
  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const align = { textAlign: isRTL ? 'right' : 'left' } as const;
  const rowDir = { flexDirection: isRTL ? 'row-reverse' : 'row' } as const;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {unreadCount > 0 && (
        <TouchableOpacity
          style={[s.markAllBar, rowDir, { backgroundColor: colors.primary + '0A' }]}
          onPress={() => markAll.mutate()}
        >
          <Feather name="check" size={14} color={colors.primary} />
          <Text style={[s.markAllText, { color: colors.primary }]}>{t('notifications.markAllRead', { n: unreadCount })}</Text>
        </TouchableOpacity>
      )}
      {isLoading ? (
        <ActivityIndicator color={colors.primary} size="large" style={{ marginTop: 40 }} />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(n) => n.id}
          contentContainerStyle={s.list}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
          ListEmptyComponent={
            <EmptyState icon="bell-off" title={t('notifications.empty')} body={t('notifications.emptyBody')} />
          }
          renderItem={({ item }: { item: Notification }) => {
            const route = NOTIF_ROUTE[item.type];
            return (
              <Card
                accent={!item.isRead ? colors.primary : undefined}
                onPress={route ? () => router.push(route) : undefined}
                style={[s.card, rowDir]}
              >
                <View style={[s.iconBox, { backgroundColor: colors.primary + '12' }]}>
                  <Feather name={NOTIF_ICON[item.type] ?? 'bell'} size={20} color={colors.primary} />
                </View>
                <View style={s.cardBody}>
                  <Text style={[s.notifTitle, { color: colors.foreground }, align]} numberOfLines={2}>{item.title}</Text>
                  {item.body && <Text style={[s.notifBody, { color: colors.mutedForeground }, align]} numberOfLines={2}>{item.body}</Text>}
                  <Text style={[s.notifTime, { color: colors.mutedForeground }, align]}>{timeAgo(item.createdAt, t)}</Text>
                </View>
                {!item.isRead && <View style={[s.unreadDot, { backgroundColor: colors.primary }]} />}
              </Card>
            );
          }}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  markAllBar: { alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.base, paddingVertical: spacing.sm },
  markAllText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  list: { padding: spacing.base, paddingBottom: 100, gap: spacing.sm },
  card: { alignItems: 'flex-start', gap: spacing.md },
  iconBox: { width: 42, height: 42, borderRadius: 10, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 },
  cardBody: { flex: 1 },
  notifTitle: { fontSize: fontSize.base, fontWeight: fontWeight.semibold },
  notifBody: { fontSize: fontSize.sm, marginTop: 2, lineHeight: fontSize.sm * 1.5 },
  notifTime: { fontSize: fontSize.xs, marginTop: spacing.xs },
  unreadDot: { width: 8, height: 8, borderRadius: 4, marginTop: 6, flexShrink: 0 },
});
