import React from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useListExams, Exam, ExamType } from '@workspace/api-client-react';
import { Card } from '@/components/ui/Card';
import { Badge, BadgeColor } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { GuestGate } from '@/components/GuestGate';
import { spacing, fontSize, fontWeight } from '@/constants/theme';
import { usePreferences } from '@/contexts/PreferencesContext';

// Badge colors keyed by the real examTypeEnum values (midterm/final/makeup/test/other)
const EXAM_TYPE_COLOR: Record<ExamType, BadgeColor> = {
  midterm: 'primary', final: 'danger', makeup: 'warning', test: 'success', other: 'muted',
};

export default function ExamsScreen() {
  return (
    <GuestGate>
      <ExamsScreenInner />
    </GuestGate>
  );
}

function ExamsScreenInner() {
  const colors = useColors();
  const { t, isRTL } = usePreferences();
  const { data, isLoading, isError, refetch, isRefetching } = useListExams({ upcoming: true });
  const exams: Exam[] = data?.data ?? [];
  const align = { textAlign: isRTL ? 'right' : 'left' } as const;
  const rowDir = { flexDirection: isRTL ? 'row-reverse' : 'row' } as const;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {isLoading ? (
        <ActivityIndicator color={colors.navy} size="large" style={{ marginTop: 40 }} />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : (
        <FlatList
          data={exams}
          keyExtractor={(e) => e.id}
          contentContainerStyle={s.list}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.navy} />}
          ListEmptyComponent={
            <EmptyState icon="bar-chart-2" title={t('exams.empty')} body={t('exams.emptyBody')} />
          }
          renderItem={({ item }: { item: Exam }) => {
            const dLeft = Math.ceil((new Date(item.date).getTime() - Date.now()) / 86400000);
            const urgent = dLeft <= 3;
            return (
              <Card accent={urgent ? colors.destructive : colors.gold} style={s.card}>
                <View style={[s.cardTop, rowDir]}>
                  <Badge label={t(`examTypes.${item.type}`)} color={EXAM_TYPE_COLOR[item.type] ?? 'primary'} />
                  <Text style={[s.daysLeft, { color: urgent ? colors.destructive : colors.mutedForeground }]}>
                    {dLeft <= 0 ? t('exams.todayBang') : dLeft === 1 ? t('common.tomorrow') : t('exams.daysLeft', { n: dLeft })}
                  </Text>
                </View>
                <Text style={[s.examTitle, { color: colors.foreground }, align]} numberOfLines={2}>
                  {item.title}
                </Text>
                <Text style={[s.examCourse, { color: colors.navy }, align]}>{item.courseName}</Text>
                <View style={[s.metaRow, rowDir]}>
                  <Text style={[s.meta, { color: colors.mutedForeground }]}>📅 {item.date}</Text>
                  {item.startTime && <Text style={[s.meta, { color: colors.mutedForeground }]}>🕐 {item.startTime.slice(0, 5)}</Text>}
                  {item.room && <Text style={[s.meta, { color: colors.mutedForeground }]}>📍 {t('timetable.room')} {item.room}</Text>}
                </View>
              </Card>
            );
          }}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  list: { padding: spacing.base, paddingBottom: 100, gap: spacing.sm },
  card: { gap: spacing.sm },
  cardTop: { alignItems: 'center', justifyContent: 'space-between' },
  daysLeft: { fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  examTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold },
  examCourse: { fontSize: fontSize.base, fontWeight: fontWeight.medium },
  metaRow: { flexWrap: 'wrap', gap: spacing.md },
  meta: { fontSize: fontSize.sm },
});
