import React from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useListNotifications, useMarkAllNotificationsRead } from '@workspace/api-client-react';
import { getListNotificationsQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { EmptyState } from '@/components/ui/EmptyState';
import { Card } from '@/components/ui/Card';
import { spacing, fontSize, fontWeight, radius } from '@/constants/theme';

type FeatherName = React.ComponentProps<typeof Feather>['name'];
const NOTIF_ICON: Record<string, FeatherName> = {
  announcement: 'bell', assignment: 'clipboard', exam: 'bar-chart-2',
  file: 'file', event: 'calendar', subscription: 'star', system: 'info', ai: 'cpu',
};

function timeAgo(date: string) {
  const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (diff < 60) return 'الآن';
  if (diff < 3600) return `${Math.floor(diff / 60)}د`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}س`;
  return `${Math.floor(diff / 86400)}ي`;
}

export default function NotificationsScreen() {
  const colors = useColors();
  const qc = useQueryClient();
  const { data, isLoading, refetch, isRefetching } = useListNotifications();
  const markAll = useMarkAllNotificationsRead({
    mutation: { onSuccess: () => qc.invalidateQueries({ queryKey: getListNotificationsQueryKey() }) },
  });

  const notifications: any[] = (data as any)?.data ?? [];
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {unreadCount > 0 && (
        <TouchableOpacity
          style={[s.markAllBar, { backgroundColor: colors.navy + '10' }]}
          onPress={() => markAll.mutate()}
        >
          <Feather name="check" size={14} color={colors.navy} />
          <Text style={[s.markAllText, { color: colors.navy }]}>تحديد الكل كمقروء ({unreadCount})</Text>
        </TouchableOpacity>
      )}
      {isLoading ? (
        <ActivityIndicator color={colors.navy} size="large" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(n: any) => n.id}
          contentContainerStyle={s.list}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.navy} />}
          ListEmptyComponent={
            <EmptyState icon="bell-off" title="لا توجد إشعارات" body="ستظهر هنا إشعاراتك من التطبيق." />
          }
          renderItem={({ item }: { item: any }) => (
            <Card accent={!item.isRead ? colors.navy : undefined} style={s.card}>
              <View style={[s.iconBox, { backgroundColor: colors.navy + '10' }]}>
                <Feather name={NOTIF_ICON[item.type] ?? 'bell'} size={20} color={colors.navy} />
              </View>
              <View style={s.cardBody}>
                <Text style={[s.notifTitle, { color: colors.foreground }]} numberOfLines={2}>{item.title}</Text>
                {item.body && <Text style={[s.notifBody, { color: colors.mutedForeground }]} numberOfLines={2}>{item.body}</Text>}
                <Text style={[s.notifTime, { color: colors.mutedForeground }]}>{timeAgo(item.createdAt)}</Text>
              </View>
              {!item.isRead && <View style={[s.unreadDot, { backgroundColor: colors.navy }]} />}
            </Card>
          )}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  markAllBar: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.base, paddingVertical: spacing.sm },
  markAllText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  list: { padding: spacing.base, paddingBottom: 100, gap: spacing.sm },
  card: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  iconBox: { width: 42, height: 42, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 },
  cardBody: { flex: 1 },
  notifTitle: { fontSize: fontSize.base, fontWeight: fontWeight.semibold, textAlign: 'right' },
  notifBody: { fontSize: fontSize.sm, marginTop: 2, lineHeight: fontSize.sm * 1.5, textAlign: 'right' },
  notifTime: { fontSize: fontSize.xs, marginTop: spacing.xs, textAlign: 'right' },
  unreadDot: { width: 8, height: 8, borderRadius: 4, marginTop: 6, flexShrink: 0 },
});
