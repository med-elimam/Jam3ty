import React from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useListAnnouncements, useMarkAnnouncementRead } from '@workspace/api-client-react';
import { getListAnnouncementsQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { spacing, fontSize, fontWeight } from '@/constants/theme';
import { usePreferences } from '@/contexts/PreferencesContext';

function timeAgo(date: string, t: (key: string, vars?: Record<string, any>) => string) {
  const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (diff < 60) return t('time.now');
  if (diff < 3600) return `${Math.floor(diff / 60)}${t('time.min')}`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}${t('time.hour')}`;
  return `${Math.floor(diff / 86400)}${t('time.day')}`;
}

const PRIORITY_COLOR: Record<string, 'danger' | 'warning' | 'muted'> = { urgent: 'danger', high: 'danger', important: 'warning', medium: 'warning', low: 'muted', normal: 'muted' };

export default function AnnouncementsScreen() {
  const colors = useColors();
  const { t } = usePreferences();
  const qc = useQueryClient();
  const { data, isLoading, refetch, isRefetching } = useListAnnouncements();
  const markRead = useMarkAnnouncementRead({
    mutation: { onSuccess: () => qc.invalidateQueries({ queryKey: getListAnnouncementsQueryKey() }) },
  });

  const announcements: any[] = (data as any)?.data ?? [];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {isLoading ? (
        <ActivityIndicator color={colors.navy} size="large" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={announcements}
          keyExtractor={(a: any) => a.id}
          contentContainerStyle={s.list}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.navy} />}
          ListEmptyComponent={
            <EmptyState
              icon="bell"
              title={t('announcements.empty')}
              body={t('announcements.emptyBody')}
            />
          }
          renderItem={({ item }: { item: any }) => (
            <Card
              onPress={() => !item.isRead && markRead.mutate({ announcementId: item.id })}
              accent={!item.isRead ? colors.navy : undefined}
              style={s.card}
            >
              <View style={s.cardTop}>
                <View style={s.badgeRow}>
                  {!item.isRead && <View style={[s.dot, { backgroundColor: colors.navy }]} />}
                  {item.priority && item.priority !== 'normal' && (
                    <Badge label={t(`priority.${item.priority}`)} color={PRIORITY_COLOR[item.priority] ?? 'muted'} />
                  )}
                </View>
                <Text style={[s.time, { color: colors.mutedForeground }]}>{timeAgo(item.createdAt, t)}</Text>
              </View>
              <Text style={[s.title, { color: colors.foreground }]} numberOfLines={3}>
                {item.titleAr || item.title}
              </Text>
              <Text style={[s.body, { color: colors.mutedForeground }]} numberOfLines={3}>
                {item.contentAr || item.content}
              </Text>
              <Text style={[s.author, { color: colors.mutedForeground }]}>{item.createdByName}</Text>
            </Card>
          )}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  list: { padding: spacing.base, paddingBottom: 100, gap: spacing.sm },
  card: { gap: spacing.sm },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dot: { width: 7, height: 7, borderRadius: 4 },
  time: { fontSize: fontSize.xs },
  title: { fontSize: fontSize.md, fontWeight: fontWeight.bold, textAlign: 'right' },
  body: { fontSize: fontSize.sm, lineHeight: fontSize.sm * 1.6, textAlign: 'right' },
  author: { fontSize: fontSize.xs, textAlign: 'right' },
});
