import React from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useListNotifications, useMarkAllNotificationsRead } from '@workspace/api-client-react';
import { getListNotificationsQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';

const NOTIF_ICON: Record<string, string> = { announcement: 'bell', assignment: 'clipboard', exam: 'bar-chart-2', file: 'file', event: 'calendar', subscription: 'star', system: 'info', ai: 'cpu' };

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
  const markAll = useMarkAllNotificationsRead({ mutation: { onSuccess: () => qc.invalidateQueries({ queryKey: getListNotificationsQueryKey() }) } });

  const notifications: any[] = (data as any)?.data ?? [];
  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const s = styles(colors);

  return (
    <View style={s.root}>
      {unreadCount > 0 && (
        <TouchableOpacity style={s.markAllBtn} onPress={() => markAll.mutate()}>
          <Text style={s.markAllText}>تحديد الكل كمقروء ({unreadCount})</Text>
        </TouchableOpacity>
      )}
      {isLoading ? <ActivityIndicator color={colors.navy} size="large" style={{ marginTop: 40 }} /> : (
        <FlatList
          data={notifications}
          keyExtractor={(n: any) => n.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
          ListEmptyComponent={<View style={s.empty}><Feather name="bell-off" size={48} color={colors.border} /><Text style={s.emptyText}>لا توجد إشعارات</Text></View>}
          renderItem={({ item }: { item: any }) => (
            <View style={[s.card, !item.isRead && s.cardUnread]}>
              <View style={[s.iconBox, { backgroundColor: colors.navy + '10' }]}>
                <Feather name={(NOTIF_ICON[item.type] ?? 'bell') as any} size={20} color={colors.navy} />
              </View>
              <View style={s.content}>
                <Text style={s.title} numberOfLines={2}>{item.title}</Text>
                {item.body && <Text style={s.body} numberOfLines={2}>{item.body}</Text>}
                <Text style={s.time}>{timeAgo(item.createdAt)}</Text>
              </View>
              {!item.isRead && <View style={s.dot} />}
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    markAllBtn: { backgroundColor: colors.navy + '10', paddingVertical: 10, paddingHorizontal: 16, alignItems: 'center' },
    markAllText: { fontSize: 14, fontWeight: '600', color: colors.navy },
    card: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: colors.card, borderRadius: 12, padding: 14, marginBottom: 8, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 2 },
    cardUnread: { borderLeftWidth: 3, borderLeftColor: colors.navy },
    iconBox: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
    content: { flex: 1 },
    title: { fontSize: 14, fontWeight: '600', color: colors.foreground, textAlign: 'right' },
    body: { fontSize: 13, color: colors.mutedForeground, marginTop: 2, lineHeight: 18, textAlign: 'right' },
    time: { fontSize: 11, color: colors.mutedForeground, marginTop: 4, textAlign: 'right' },
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.navy, marginTop: 6 },
    empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
    emptyText: { fontSize: 15, color: colors.mutedForeground },
  });
