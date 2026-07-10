import React from 'react';
import { ActivityIndicator, Alert, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useListEvents, useRegisterForEvent, Event } from '@workspace/api-client-react';
import { getListEventsQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { GuestGate } from '@/components/GuestGate';
import { usePreferences } from '@/contexts/PreferencesContext';
import { spacing, fontSize, fontWeight, radius } from '@/constants/theme';

// Icons keyed by the real eventTypeEnum values (university/club/training/competition/workshop/conference/other)
const EVENT_ICON: Record<string, React.ComponentProps<typeof Feather>['name']> = {
  university: 'home', club: 'users', training: 'book', competition: 'award',
  workshop: 'tool', conference: 'mic', other: 'calendar',
};

export default function EventsScreen() {
  return (
    <GuestGate>
      <EventsScreenInner />
    </GuestGate>
  );
}

function EventsScreenInner() {
  const colors = useColors();
  const { t, isRTL, language } = usePreferences();
  const qc = useQueryClient();
  const { data, isLoading, isError, refetch, isRefetching } = useListEvents();
  const register = useRegisterForEvent({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListEventsQueryKey() });
        Alert.alert(t('events.registeredTitle'), t('events.registeredBody'));
      },
      onError: () => Alert.alert(t('common.error'), t('events.registerError')),
    },
  });
  const events: Event[] = data?.data ?? [];
  const align = { textAlign: isRTL ? 'right' : 'left' } as const;
  const rowDir = { flexDirection: isRTL ? 'row-reverse' : 'row' } as const;
  const dateLocale = language === 'ar' ? 'ar' : 'fr';

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {isLoading ? (
        <ActivityIndicator color={colors.navy} size="large" style={{ marginTop: 40 }} />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : (
        <FlatList
          data={events}
          keyExtractor={(e) => e.id}
          contentContainerStyle={s.list}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.navy} />}
          ListEmptyComponent={
            <EmptyState icon="calendar" title={t('events.empty')} body={t('events.emptyBody')} />
          }
          renderItem={({ item }: { item: Event }) => (
            <Card style={s.card}>
              <View style={[s.cardHeader, rowDir]}>
                <View style={[s.iconBox, { backgroundColor: colors.navy + '10' }]}>
                  <Feather name={EVENT_ICON[item.type] ?? 'calendar'} size={22} color={colors.navy} />
                </View>
                <View style={s.cardInfo}>
                  <Text style={[s.eventTitle, { color: colors.foreground }, align]} numberOfLines={2}>
                    {item.title}
                  </Text>
                  <Text style={[s.eventType, { color: colors.mutedForeground }, align]}>
                    {t(`eventTypes.${item.type}`)}
                  </Text>
                </View>
                {item.isRegistered && <Feather name="check-circle" size={20} color={colors.success} />}
              </View>
              {item.description && (
                <Text style={[s.desc, { color: colors.mutedForeground }, align]} numberOfLines={2}>
                  {item.description}
                </Text>
              )}
              <View style={[s.metaRow, rowDir]}>
                <Text style={[s.meta, { color: colors.mutedForeground }]}>📅 {new Date(item.startDate).toLocaleDateString(dateLocale)}</Text>
                {item.location && <Text style={[s.meta, { color: colors.mutedForeground }]}>📍 {item.location}</Text>}
              </View>
              {!item.isRegistered && (
                <Button
                  label={t('events.register')}
                  variant="primary"
                  size="sm"
                  loading={register.isPending}
                  onPress={() => register.mutate({ eventId: item.id })}
                />
              )}
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
  cardHeader: { gap: spacing.md, alignItems: 'flex-start' },
  iconBox: { width: 46, height: 46, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  cardInfo: { flex: 1 },
  eventTitle: { fontSize: fontSize.md, fontWeight: fontWeight.bold },
  eventType: { fontSize: fontSize.sm, marginTop: 2 },
  desc: { fontSize: fontSize.sm, lineHeight: fontSize.sm * 1.6 },
  metaRow: { gap: spacing.md, flexWrap: 'wrap' },
  meta: { fontSize: fontSize.sm },
});
