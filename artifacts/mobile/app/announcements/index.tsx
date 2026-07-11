import React from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useListAnnouncements, useMarkAnnouncementRead, Announcement, AnnouncementPriority } from '@workspace/api-client-react';
import { getListAnnouncementsQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/Card';
import { Badge, BadgeColor } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { spacing, fontSize, fontWeight } from '@/constants/theme';
import { usePreferences } from '@/contexts/PreferencesContext';
import { useAuth } from '@/contexts/AuthContext';

function timeAgo(date: string, t: (key: string, vars?: Record<string, string | number>) => string) {
  const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (diff < 60) return t('time.now');
  if (diff < 3600) return `${Math.floor(diff / 60)}${t('time.min')}`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}${t('time.hour')}`;
  return `${Math.floor(diff / 86400)}${t('time.day')}`;
}

// Colors keyed by the real announcementPriorityEnum values (normal/important/urgent)
const PRIORITY_COLOR: Record<AnnouncementPriority, BadgeColor> = { urgent: 'danger', important: 'warning', normal: 'muted' };

// Guest-visible: the API serves global-scope announcements anonymously.
// Only the mark-read action is account-bound.
export default function AnnouncementsScreen() {
  const colors = useColors();
  const { t, isRTL } = usePreferences();
  const { isGuest } = useAuth();
  const qc = useQueryClient();
  const { data, isLoading, isError, refetch, isRefetching } = useListAnnouncements();
  const markRead = useMarkAnnouncementRead({
    mutation: { onSuccess: () => qc.invalidateQueries({ queryKey: getListAnnouncementsQueryKey() }) },
  });

  const announcements: Announcement[] = data?.data ?? [];
  const align = { textAlign: isRTL ? 'right' : 'left' } as const;
  const rowDir = { flexDirection: isRTL ? 'row-reverse' : 'row' } as const;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {isLoading ? (
        <ActivityIndicator color={colors.primary} size="large" style={{ marginTop: 40 }} />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : (
        <FlatList
          data={announcements}
          keyExtractor={(a) => a.id}
          contentContainerStyle={s.list}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
          ListEmptyComponent={
            <EmptyState
              icon="bell"
              title={t('announcements.empty')}
              body={t('announcements.emptyBody')}
            />
          }
          renderItem={({ item }: { item: Announcement }) => (
            <Card
              onPress={() => !isGuest && !item.isRead && markRead.mutate({ announcementId: item.id })}
              accent={!isGuest && !item.isRead ? colors.primary : undefined}
              style={s.card}
            >
              <View style={[s.cardTop, rowDir]}>
                <View style={[s.badgeRow, rowDir]}>
                  {!isGuest && !item.isRead && <View style={[s.dot, { backgroundColor: colors.primary }]} />}
                  {item.priority !== 'normal' && (
                    <Badge label={t(`priority.${item.priority}`)} color={PRIORITY_COLOR[item.priority] ?? 'muted'} />
                  )}
                </View>
                <Text style={[s.time, { color: colors.mutedForeground }]}>{timeAgo(item.createdAt, t)}</Text>
              </View>
              <Text style={[s.title, { color: colors.foreground }, align]} numberOfLines={3}>
                {item.title}
              </Text>
              <Text style={[s.body, { color: colors.mutedForeground }, align]} numberOfLines={3}>
                {item.content}
              </Text>
              <Text style={[s.author, { color: colors.mutedForeground }, align]}>{item.createdByName}</Text>
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
  cardTop: { justifyContent: 'space-between', alignItems: 'center' },
  badgeRow: { alignItems: 'center', gap: spacing.sm },
  dot: { width: 7, height: 7, borderRadius: 4 },
  time: { fontSize: fontSize.xs },
  title: { fontSize: fontSize.md, fontWeight: fontWeight.bold },
  body: { fontSize: fontSize.sm, lineHeight: fontSize.sm * 1.6 },
  author: { fontSize: fontSize.xs },
});
