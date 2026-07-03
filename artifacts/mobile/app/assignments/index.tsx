import React, { useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { useListAssignments } from '@workspace/api-client-react';
import { Feather } from '@expo/vector-icons';

const STATUS_COLORS: Record<string, string> = { submitted: '#10B981', late: '#EF4444', not_submitted: '#F59E0B' };
const STATUS_LABELS: Record<string, string> = { submitted: 'Submitted', late: 'Late', not_submitted: 'Pending' };

function daysLeft(deadline: string) {
  const d = Math.ceil((new Date(deadline).getTime() - Date.now()) / 86400000);
  if (d < 0) return 'Overdue';
  if (d === 0) return 'Due today';
  if (d === 1) return 'Due tomorrow';
  return `${d} days left`;
}

export default function AssignmentsScreen() {
  const colors = useColors();
  const router = useRouter();
  const [filter, setFilter] = useState<string | undefined>(undefined);
  const { data, isLoading, refetch, isRefetching } = useListAssignments({ status: filter });

  const assignments: any[] = (data as any)?.data ?? [];
  const s = styles(colors);

  const filters = [
    { label: 'All', value: undefined },
    { label: 'Pending', value: 'not_submitted' },
    { label: 'Submitted', value: 'submitted' },
    { label: 'Late', value: 'late' },
  ];

  return (
    <View style={s.root}>
      <View style={s.filterRow}>
        {filters.map((f) => (
          <TouchableOpacity key={String(f.value)} style={[s.filter, filter === f.value && s.filterActive]} onPress={() => setFilter(f.value)}>
            <Text style={[s.filterText, filter === f.value && s.filterTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {isLoading ? <ActivityIndicator color={colors.navy} size="large" style={{ marginTop: 40 }} /> : (
        <FlatList
          data={assignments}
          keyExtractor={(a: any) => a.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
          ListEmptyComponent={<View style={s.empty}><Feather name="clipboard" size={48} color={colors.border} /><Text style={s.emptyText}>No assignments</Text></View>}
          renderItem={({ item }: { item: any }) => {
            const color = STATUS_COLORS[item.submissionStatus] ?? colors.mutedForeground;
            return (
              <View style={s.card}>
                <View style={s.cardTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.cardTitle} numberOfLines={2}>{item.titleAr || item.title}</Text>
                    <Text style={s.cardCourse}>{item.courseName}</Text>
                  </View>
                  <View style={[s.statusBadge, { backgroundColor: color + '20' }]}>
                    <Text style={[s.statusText, { color }]}>{STATUS_LABELS[item.submissionStatus] ?? 'Pending'}</Text>
                  </View>
                </View>
                <View style={s.cardBottom}>
                  <View style={s.deadlineRow}>
                    <Feather name="clock" size={12} color={colors.mutedForeground} />
                    <Text style={s.deadline}>{daysLeft(item.deadline)} · {new Date(item.deadline).toLocaleDateString()}</Text>
                  </View>
                  {item.maxScore && <Text style={s.score}>{item.maxScore} pts</Text>}
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
    filterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 12 },
    filter: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
    filterActive: { backgroundColor: colors.navy, borderColor: colors.navy },
    filterText: { fontSize: 13, fontWeight: '600', color: colors.mutedForeground },
    filterTextActive: { color: '#fff' },
    card: { backgroundColor: colors.card, borderRadius: 12, padding: 14, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 2 },
    cardTop: { flexDirection: 'row', gap: 8, marginBottom: 8 },
    cardTitle: { fontSize: 15, fontWeight: '600', color: colors.foreground },
    cardCourse: { fontSize: 12, color: colors.mutedForeground, marginTop: 2 },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, alignSelf: 'flex-start' },
    statusText: { fontSize: 11, fontWeight: '700' },
    cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    deadlineRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    deadline: { fontSize: 12, color: colors.mutedForeground },
    score: { fontSize: 12, fontWeight: '600', color: colors.navy },
    empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
    emptyText: { fontSize: 15, color: colors.mutedForeground },
  });
