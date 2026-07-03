import React from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useListExams } from '@workspace/api-client-react';
import { Card } from '@/components/ui/Card';
import { Badge, BadgeColor } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { spacing, fontSize, fontWeight, radius } from '@/constants/theme';

const EXAM_TYPE_AR: Record<string, string> = { midterm: 'فصلي', final: 'نهائي', quiz: 'مصغّر', practical: 'تطبيقي', oral: 'شفهي' };
const EXAM_TYPE_COLOR: Record<string, BadgeColor> = { midterm: 'primary', final: 'danger', quiz: 'success', practical: 'warning', oral: 'gold' };

export default function ExamsScreen() {
  const colors = useColors();
  const { data, isLoading, refetch, isRefetching } = useListExams({ upcoming: 'true' } as any);
  const exams: any[] = (data as any)?.data ?? [];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {isLoading ? (
        <ActivityIndicator color={colors.navy} size="large" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={exams}
          keyExtractor={(e: any) => e.id}
          contentContainerStyle={s.list}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.navy} />}
          ListEmptyComponent={
            <EmptyState icon="bar-chart-2" title="لا توجد امتحانات قادمة" body="ستظهر هنا امتحاناتك القادمة." />
          }
          renderItem={({ item }: { item: any }) => {
            const dLeft = Math.ceil((new Date(item.date).getTime() - Date.now()) / 86400000);
            const urgent = dLeft <= 3;
            return (
              <Card accent={urgent ? colors.destructive : colors.gold} style={s.card}>
                <View style={s.cardTop}>
                  <Badge label={EXAM_TYPE_AR[item.examType] ?? item.examType} color={EXAM_TYPE_COLOR[item.examType] ?? 'primary'} />
                  <Text style={[s.daysLeft, { color: urgent ? colors.destructive : colors.mutedForeground }]}>
                    {dLeft <= 0 ? 'اليوم!' : dLeft === 1 ? 'غداً' : `${dLeft} أيام`}
                  </Text>
                </View>
                <Text style={[s.examTitle, { color: colors.foreground }]} numberOfLines={2}>
                  {item.titleAr || item.title}
                </Text>
                <Text style={[s.examCourse, { color: colors.navy }]}>{item.courseName}</Text>
                <View style={s.metaRow}>
                  <Text style={[s.meta, { color: colors.mutedForeground }]}>📅 {item.date}</Text>
                  {item.startTime && <Text style={[s.meta, { color: colors.mutedForeground }]}>🕐 {item.startTime?.slice(0, 5)}</Text>}
                  {item.location && <Text style={[s.meta, { color: colors.mutedForeground }]}>📍 {item.location}</Text>}
                  {item.maxScore && <Text style={[s.meta, { color: colors.mutedForeground }]}>📊 {item.maxScore} نقطة</Text>}
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
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  daysLeft: { fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  examTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, textAlign: 'right' },
  examCourse: { fontSize: fontSize.base, fontWeight: fontWeight.medium, textAlign: 'right' },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, justifyContent: 'flex-end' },
  meta: { fontSize: fontSize.sm },
});
