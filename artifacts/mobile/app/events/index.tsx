import React from 'react';
import { ActivityIndicator, Alert, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useListEvents, useRegisterForEvent } from '@workspace/api-client-react';
import { getListEventsQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { spacing, fontSize, fontWeight, radius } from '@/constants/theme';

const EVENT_ICON: Record<string, React.ComponentProps<typeof Feather>['name']> = {
  conference: 'mic', workshop: 'tool', competition: 'award', hackathon: 'code',
  seminar: 'book', career_fair: 'briefcase', cultural: 'music', sports: 'activity', other: 'calendar',
};
const EVENT_TYPE_AR: Record<string, string> = {
  conference: 'مؤتمر', workshop: 'ورشة عمل', competition: 'مسابقة',
  hackathon: 'هاكاثون', seminar: 'ندوة', career_fair: 'معرض وظائف',
  cultural: 'ثقافي', sports: 'رياضي', other: 'فعالية',
};

export default function EventsScreen() {
  const colors = useColors();
  const qc = useQueryClient();
  const { data, isLoading, refetch, isRefetching } = useListEvents();
  const register = useRegisterForEvent({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListEventsQueryKey() });
        Alert.alert('تم التسجيل!', 'تم تسجيلك في هذه الفعالية بنجاح.');
      },
      onError: () => Alert.alert('خطأ', 'تعذّر التسجيل في هذه الفعالية.'),
    },
  });
  const events: any[] = (data as any)?.data ?? [];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {isLoading ? (
        <ActivityIndicator color={colors.navy} size="large" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={events}
          keyExtractor={(e: any) => e.id}
          contentContainerStyle={s.list}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.navy} />}
          ListEmptyComponent={
            <EmptyState icon="calendar" title="لا توجد فعاليات قادمة" body="ستظهر هنا الفعاليات الطلابية القادمة." />
          }
          renderItem={({ item }: { item: any }) => (
            <Card style={s.card}>
              <View style={s.cardHeader}>
                <View style={[s.iconBox, { backgroundColor: colors.navy + '10' }]}>
                  <Feather name={EVENT_ICON[item.type] ?? 'calendar'} size={22} color={colors.navy} />
                </View>
                <View style={s.cardInfo}>
                  <Text style={[s.eventTitle, { color: colors.foreground }]} numberOfLines={2}>
                    {item.titleAr || item.title}
                  </Text>
                  <Text style={[s.eventType, { color: colors.mutedForeground }]}>
                    {EVENT_TYPE_AR[item.type] ?? item.type}
                  </Text>
                </View>
                {item.isRegistered && <Feather name="check-circle" size={20} color={colors.success} />}
              </View>
              {item.description && (
                <Text style={[s.desc, { color: colors.mutedForeground }]} numberOfLines={2}>
                  {item.descriptionAr || item.description}
                </Text>
              )}
              <View style={s.metaRow}>
                <Text style={[s.meta, { color: colors.mutedForeground }]}>📅 {new Date(item.startDate).toLocaleDateString('ar')}</Text>
                {item.location && <Text style={[s.meta, { color: colors.mutedForeground }]}>📍 {item.location}</Text>}
              </View>
              {item.requiresRegistration && !item.isRegistered && (
                <Button
                  label="التسجيل في الفعالية"
                  variant="primary"
                  size="sm"
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
  cardHeader: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  iconBox: { width: 46, height: 46, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  cardInfo: { flex: 1 },
  eventTitle: { fontSize: fontSize.md, fontWeight: fontWeight.bold, textAlign: 'right' },
  eventType: { fontSize: fontSize.sm, marginTop: 2, textAlign: 'right' },
  desc: { fontSize: fontSize.sm, lineHeight: fontSize.sm * 1.6, textAlign: 'right' },
  metaRow: { flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap' },
  meta: { fontSize: fontSize.sm },
});
