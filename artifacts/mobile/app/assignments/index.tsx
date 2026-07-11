import React, { useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useListAssignments, ListAssignmentsStatus, Assignment } from '@workspace/api-client-react';
import { Card } from '@/components/ui/Card';
import { Badge, BadgeColor } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { GuestGate } from '@/components/GuestGate';
import { spacing, fontSize, fontWeight, radius } from '@/constants/theme';
import { usePreferences } from '@/contexts/PreferencesContext';

const STATUS_COLOR: Record<string, BadgeColor> = {
  submitted: 'success', late: 'danger', pending: 'warning', not_submitted: 'warning', reviewed: 'muted',
};

function daysLeft(deadline: string, t: (key: string, vars?: Record<string, string | number>) => string) {
  const d = Math.ceil((new Date(deadline).getTime() - Date.now()) / 86400000);
  if (d < 0) return t('assignments.deadlinePassed');
  if (d === 0) return t('common.today');
  if (d === 1) return t('common.tomorrow');
  return t('assignments.daysLeft', { n: d });
}

const FILTERS: { labelKey: string; value: ListAssignmentsStatus | undefined }[] = [
  { labelKey: 'common.all', value: undefined },
  { labelKey: 'assignmentStatus.pending', value: ListAssignmentsStatus.pending },
  { labelKey: 'assignmentStatus.submitted', value: ListAssignmentsStatus.submitted },
  { labelKey: 'assignmentStatus.late', value: ListAssignmentsStatus.late },
];

export default function AssignmentsScreen() {
  return (
    <GuestGate>
      <AssignmentsScreenInner />
    </GuestGate>
  );
}

function AssignmentsScreenInner() {
  const colors = useColors();
  const { t, isRTL } = usePreferences();
  const [filter, setFilter] = useState<ListAssignmentsStatus | undefined>(undefined);
  const { data, isLoading, isError, refetch, isRefetching } = useListAssignments({ status: filter });
  const assignments: Assignment[] = data?.data ?? [];
  const align = { textAlign: isRTL ? 'right' : 'left' } as const;
  const rowDir = { flexDirection: isRTL ? 'row-reverse' : 'row' } as const;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Filter row */}
      <View style={[s.filterRow, rowDir]}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={String(f.value ?? 'all')}
            activeOpacity={0.75}
            style={[
              s.filterChip,
              { backgroundColor: filter === f.value ? colors.primary : colors.card, borderColor: filter === f.value ? colors.primary : colors.border },
            ]}
            onPress={() => setFilter(f.value)}
          >
            <Text style={[s.filterLabel, { color: filter === f.value ? '#fff' : colors.mutedForeground }]}>{t(f.labelKey)}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.primary} size="large" style={{ marginTop: 40 }} />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : (
        <FlatList
          data={assignments}
          keyExtractor={(a) => a.id}
          contentContainerStyle={s.list}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
          ListEmptyComponent={
            <EmptyState icon="clipboard" title={t('assignments.empty')} body={t('assignments.emptyBody')} />
          }
          renderItem={({ item }: { item: Assignment }) => (
            <Card style={s.card}>
              <View style={[s.cardTop, rowDir]}>
                <Badge label={t(`assignmentStatus.${item.submissionStatus ?? 'pending'}`)} color={STATUS_COLOR[item.submissionStatus ?? 'pending'] ?? 'muted'} />
                <View style={s.cardInfo}>
                  <Text style={[s.cardTitle, { color: colors.foreground }, align]} numberOfLines={2}>
                    {item.title}
                  </Text>
                  <Text style={[s.cardCourse, { color: colors.mutedForeground }, align]}>{item.courseName}</Text>
                </View>
              </View>
              <View style={[s.cardBottom, rowDir]}>
                <Text style={[s.daysLeft, { color: colors.mutedForeground }]}>{daysLeft(item.deadline, t)}</Text>
              </View>
            </Card>
          )}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  filterRow: { gap: spacing.sm, paddingHorizontal: spacing.base, paddingVertical: spacing.md },
  filterChip: {
    paddingHorizontal: spacing.md,
    height: 32,
    borderRadius: radius.full,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterLabel: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  list: { paddingHorizontal: spacing.base, paddingBottom: 100, gap: spacing.sm },
  card: { gap: spacing.sm },
  cardTop: { alignItems: 'flex-start', gap: spacing.sm },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: fontSize.md, fontWeight: fontWeight.semibold },
  cardCourse: { fontSize: fontSize.sm, marginTop: 2 },
  cardBottom: { justifyContent: 'space-between', alignItems: 'center' },
  daysLeft: { fontSize: fontSize.sm },
});
