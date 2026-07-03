import React, { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { useListCourses } from '@workspace/api-client-react';
import { Feather } from '@expo/vector-icons';

export default function CoursesScreen() {
  const colors = useColors();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const { data, isLoading } = useListCourses({ search: search || undefined });

  const courses: any[] = (data as any)?.data ?? [];
  const s = styles(colors);

  return (
    <View style={s.root}>
      <View style={s.searchBar}>
        <Feather name="search" size={18} color={colors.mutedForeground} />
        <TextInput
          style={s.searchInput}
          placeholder="ابحث عن مادة…"
          placeholderTextColor={colors.mutedForeground}
          value={search}
          onChangeText={setSearch}
          textAlign="right"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Feather name="x" size={18} color={colors.mutedForeground} />
          </TouchableOpacity>
        )}
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.navy} size="large" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={courses}
          keyExtractor={(item: any) => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          ListEmptyComponent={
            <View style={s.empty}>
              <Feather name="book" size={48} color={colors.border} />
              <Text style={s.emptyText}>لا توجد مواد بعد</Text>
            </View>
          }
          renderItem={({ item }: { item: any }) => (
            <TouchableOpacity
              style={s.courseCard}
              onPress={() => router.push({ pathname: '/course/[id]', params: { id: item.id } })}
            >
              <View style={[s.courseIcon, { backgroundColor: colors.navy }]}>
                <Text style={s.courseCode}>{item.code?.slice(0, 4) ?? '??'}</Text>
              </View>
              <View style={s.courseInfo}>
                <Text style={s.courseName} numberOfLines={2}>{item.nameAr || item.name}</Text>
                {item.professorName && <Text style={s.courseProfessor}>د. {item.professorName}</Text>}
                <View style={s.courseStats}>
                  <View style={s.statItem}>
                    <Feather name="file" size={12} color={colors.mutedForeground} />
                    <Text style={s.statText}>{item.fileCount ?? 0} ملف</Text>
                  </View>
                  <View style={s.statItem}>
                    <Feather name="clipboard" size={12} color={colors.mutedForeground} />
                    <Text style={s.statText}>{item.assignmentCount ?? 0} واجب</Text>
                  </View>
                </View>
              </View>
              <Feather name="chevron-left" size={20} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    searchBar: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      margin: 16, padding: 12, backgroundColor: colors.card,
      borderRadius: 12, borderWidth: 1, borderColor: colors.border,
    },
    searchInput: { flex: 1, fontSize: 15, color: colors.foreground },
    courseCard: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      backgroundColor: colors.card, borderRadius: 12, padding: 14, marginBottom: 10,
      shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
    },
    courseIcon: { width: 52, height: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    courseCode: { fontSize: 11, fontWeight: '700', color: '#fff', textAlign: 'center' },
    courseInfo: { flex: 1 },
    courseName: { fontSize: 15, fontWeight: '600', color: colors.foreground, textAlign: 'right' },
    courseProfessor: { fontSize: 12, color: colors.mutedForeground, marginTop: 2, textAlign: 'right' },
    courseStats: { flexDirection: 'row', gap: 12, marginTop: 6, justifyContent: 'flex-end' },
    statItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    statText: { fontSize: 12, color: colors.mutedForeground },
    empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
    emptyText: { fontSize: 16, color: colors.mutedForeground },
  });
