import React, { useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useListAssignments, ListAssignmentsStatus } from '@workspace/api-client-react';
import { Card } from '@/components/ui/Card';
import { Badge, BadgeColor } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { spacing, fontSize, fontWeight, radius } from '@/constants/theme';

const STATUS_LABELS: Record<string, string> = {
  submitted: 'مُسلَّم', late: 'متأخر', pending: 'معلّق', not_submitted: 'معلّق', reviewed: 'مراجَع',
};
const STATUS_COLOR: Record<string, BadgeColor> = {
  submitted: 'success', late: 'danger', pending: 'warning', not_submitted: 'warning', reviewed: 'muted',
};

function daysLeft(deadline: string) {
  const d = Math.ceil((new Date(deadline).getTime() - Date.now()) / 86400000);
  if (d < 0) return 'انتهى الموعد';
  if (d === 0) return 'اليوم';
  if (d === 1) return 'غداً';
  return `${d} أيام متبقية`;
}

const FILTERS: { label: string; value: ListAssignmentsStatus | undefined }[] = [
  { label: 'الكل', value: undefined },
  { label: 'معلّق', value: ListAssignmentsStatus.pending },
  { label: 'مُسلَّم', value: ListAssignmentsStatus.submitted },
  { label: 'متأخر', value: ListAssignmentsStatus.late },
];

export default function AssignmentsScreen() {
  const colors = useColors();
  const [filter, setFilter] = useState<ListAssignmentsStatus | undefined>(undefined);
  const { data, isLoading, refetch, isRefetching } = useListAssignments({ status: filter });
  const assignments: any[] = (data as any)?.data ?? [];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Filter row */}
      <View style={s.filterRow}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={String(f.value ?? 'all')}
            activeOpacity={0.75}
            style={[
              s.filterChip,
              { backgroundColor: filter === f.value ? colors.navy : colors.card, borderColor: filter === f.value ? colors.navy : colors.border },
            ]}
            onPress={() => setFilter(f.value)}
          >
            <Text style={[s.filterLabel, { color: filter === f.value ? '#fff' : colors.mutedForeground }]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.navy} size="large" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={assignments}
          keyExtractor={(a: any) => a.id}
          contentContainerStyle={s.list}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.navy} />}
          ListEmptyComponent={
            <EmptyState icon="clipboard" title="لا توجد واجبات" body="ستظهر هنا الواجبات المطلوبة منك." />
          }
          renderItem={({ item }: { item: any }) => (
            <Card style={s.card}>
              <View style={s.cardTop}>
                <Badge label={STATUS_LABELS[item.submissionStatus] ?? 'معلّق'} color={STATUS_COLOR[item.submissionStatus] ?? 'muted'} />
                <View style={s.cardInfo}>
                  <Text style={[s.cardTitle, { color: colors.foreground }]} numberOfLines={2}>
                    {item.titleAr || item.title}
                  </Text>
                  <Text style={[s.cardCourse, { color: colors.mutedForeground }]}>{item.courseName}</Text>
                </View>
              </View>
              <View style={s.cardBottom}>
                <Text style={[s.daysLeft, { color: colors.mutedForeground }]}>{daysLeft(item.deadline)}</Text>
                {item.maxScore && <Text style={[s.score, { color: colors.navy }]}>{item.maxScore} نقطة</Text>}
              </View>
            </Card>
          )}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  filterRow: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.base, paddingVertical: spacing.md },
  filterChip: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.full, borderWidth: 1.5 },
  filterLabel: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  list: { paddingHorizontal: spacing.base, paddingBottom: 100, gap: spacing.sm },
  card: { gap: spacing.sm },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, textAlign: 'right' },
  cardCourse: { fontSize: fontSize.sm, marginTop: 2, textAlign: 'right' },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  daysLeft: { fontSize: fontSize.sm },
  score: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
});
