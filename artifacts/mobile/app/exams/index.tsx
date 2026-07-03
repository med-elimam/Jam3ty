import React from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useListExams } from '@workspace/api-client-react';
import { Feather } from '@expo/vector-icons';

const EXAM_TYPE_COLOR: Record<string, string> = { midterm: '#3B82F6', final: '#EF4444', quiz: '#10B981', practical: '#8B5CF6', oral: '#F59E0B' };

export default function ExamsScreen() {
  const colors = useColors();
  const { data, isLoading, refetch, isRefetching } = useListExams({ upcoming: 'true' } as any);
  const exams: any[] = (data as any)?.data ?? [];
  const s = styles(colors);

  return (
    <View style={s.root}>
      {isLoading ? <ActivityIndicator color={colors.navy} size="large" style={{ marginTop: 40 }} /> : (
        <FlatList
          data={exams}
          keyExtractor={(e: any) => e.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
          ListEmptyComponent={<View style={s.empty}><Feather name="bar-chart-2" size={48} color={colors.border} /><Text style={s.emptyText}>No upcoming exams</Text></View>}
          renderItem={({ item }: { item: any }) => {
            const typeColor = EXAM_TYPE_COLOR[item.examType] ?? colors.navy;
            const daysLeft = Math.ceil((new Date(item.date).getTime() - Date.now()) / 86400000);
            return (
              <View style={[s.card, { borderLeftColor: typeColor }]}>
                <View style={s.cardHeader}>
                  <View style={[s.typeBadge, { backgroundColor: typeColor + '20' }]}>
                    <Text style={[s.typeText, { color: typeColor }]}>{(item.examType ?? 'exam').toUpperCase()}</Text>
                  </View>
                  <Text style={[s.daysLeft, { color: daysLeft <= 3 ? colors.destructive : colors.mutedForeground }]}>
                    {daysLeft <= 0 ? 'Today!' : daysLeft === 1 ? 'Tomorrow' : `${daysLeft}d`}
                  </Text>
                </View>
                <Text style={s.title} numberOfLines={2}>{item.titleAr || item.title}</Text>
                <Text style={s.course}>{item.courseName}</Text>
                <View style={s.infoRow}>
                  <Text style={s.info}>📅 {item.date}</Text>
                  {item.startTime && <Text style={s.info}>🕐 {item.startTime?.slice(0, 5)}</Text>}
                  {item.location && <Text style={s.info}>📍 {item.location}</Text>}
                  {item.maxScore && <Text style={s.info}>📊 {item.maxScore} pts</Text>}
                </View>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    card: { backgroundColor: colors.card, borderRadius: 12, padding: 14, marginBottom: 10, borderLeftWidth: 4, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 2 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    typeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
    typeText: { fontSize: 10, fontWeight: '700' },
    daysLeft: { fontSize: 12, fontWeight: '700' },
    title: { fontSize: 16, fontWeight: '700', color: colors.foreground, marginBottom: 4 },
    course: { fontSize: 13, color: colors.navy, marginBottom: 8 },
    infoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    info: { fontSize: 12, color: colors.mutedForeground },
    empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
    emptyText: { fontSize: 15, color: colors.mutedForeground },
  });
