import React from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useListAnnouncements, useMarkAnnouncementRead } from '@workspace/api-client-react';
import { getListAnnouncementsQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';

function timeAgo(date: string) {
  const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const PRIORITY_COLORS: Record<string, string> = { high: '#EF4444', medium: '#F59E0B', low: '#10B981', normal: '#6B7280' };

export default function AnnouncementsScreen() {
  const colors = useColors();
  const qc = useQueryClient();
  const { data, isLoading, refetch, isRefetching } = useListAnnouncements();
  const markRead = useMarkAnnouncementRead({ mutation: { onSuccess: () => qc.invalidateQueries({ queryKey: getListAnnouncementsQueryKey() }) } });

  const announcements: any[] = (data as any)?.data ?? [];
  const s = styles(colors);

  return (
    <View style={s.root}>
      {isLoading ? <ActivityIndicator color={colors.navy} size="large" style={{ marginTop: 40 }} /> : (
        <FlatList
          data={announcements}
          keyExtractor={(a: any) => a.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
          ListEmptyComponent={<View style={s.empty}><Feather name="bell-off" size={48} color={colors.border} /><Text style={s.emptyText}>No announcements</Text></View>}
          renderItem={({ item }: { item: any }) => (
            <TouchableOpacity style={[s.card, !item.isRead && s.cardUnread]} onPress={() => !item.isRead && markRead.mutate({ announcementId: item.id })}>
              <View style={s.cardTop}>
                <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                  {!item.isRead && <View style={s.dot} />}
                  {item.priority && item.priority !== 'normal' && (
                    <View style={[s.priority, { backgroundColor: PRIORITY_COLORS[item.priority] + '20' }]}>
                      <Text style={[s.priorityText, { color: PRIORITY_COLORS[item.priority] }]}>{item.priority.toUpperCase()}</Text>
                    </View>
                  )}
                  <Text style={s.scope}>{item.scope}</Text>
                </View>
                <Text style={s.time}>{timeAgo(item.createdAt)}</Text>
              </View>
              <Text style={s.title} numberOfLines={3}>{item.titleAr || item.title}</Text>
              <Text style={s.content} numberOfLines={3}>{item.contentAr || item.content}</Text>
              <Text style={s.author}>{item.createdByName}</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    card: { backgroundColor: colors.card, borderRadius: 12, padding: 14, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 2 },
    cardUnread: { borderLeftWidth: 3, borderLeftColor: colors.navy },
    cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.navy },
    priority: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    priorityText: { fontSize: 9, fontWeight: '700' },
    scope: { fontSize: 11, color: colors.mutedForeground, textTransform: 'capitalize' },
    time: { fontSize: 11, color: colors.mutedForeground },
    title: { fontSize: 15, fontWeight: '700', color: colors.foreground, marginBottom: 6 },
    content: { fontSize: 13, color: colors.mutedForeground, lineHeight: 20 },
    author: { fontSize: 11, color: colors.mutedForeground, marginTop: 8 },
    empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
    emptyText: { fontSize: 15, color: colors.mutedForeground },
  });
