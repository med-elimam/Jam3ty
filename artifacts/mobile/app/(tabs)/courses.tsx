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
import { usePreferences } from '@/contexts/PreferencesContext';
import { useListCourses } from '@workspace/api-client-react';
import { Feather } from '@expo/vector-icons';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { spacing, fontSize, fontWeight, radius } from '@/constants/theme';

export default function CoursesScreen() {
  const colors = useColors();
  const router = useRouter();
  const { t, isRTL } = usePreferences();
  const [search, setSearch] = useState('');
  const { data, isLoading } = useListCourses({ search: search || undefined });

  const courses: any[] = (data as any)?.data ?? [];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Search bar */}
      <View style={[s.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Feather name="search" size={18} color={colors.mutedForeground} />
        <TextInput
          style={[s.searchInput, { color: colors.foreground }]}
          placeholder={t('courses.searchPlaceholder')}
          placeholderTextColor={colors.mutedForeground}
          value={search}
          onChangeText={setSearch}
          textAlign={isRTL ? 'right' : 'left'}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
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
          contentContainerStyle={s.list}
          ListEmptyComponent={
            <EmptyState
              icon="book-open"
              title={t('courses.empty')}
              body={t('courses.emptyBody')}
            />
          }
          renderItem={({ item }: { item: any }) => (
            <Card
              onPress={() => router.push({ pathname: '/course/[id]', params: { id: item.id } })}
              style={s.courseCard}
            >
              <View style={s.cardInner}>
                <Feather name="chevron-left" size={18} color={colors.mutedForeground} />
                <View style={s.courseInfo}>
                  <Text style={[s.courseName, { color: colors.foreground }]} numberOfLines={2}>
                    {item.nameAr || item.name}
                  </Text>
                  {item.professorName && (
                    <Text style={[s.courseProfessor, { color: colors.mutedForeground }]}>
                      {t('courses.professorPrefix')}{item.professorName}
                    </Text>
                  )}
                  <View style={s.courseStats}>
                    {item.fileCount != null && (
                      <View style={s.stat}>
                        <Feather name="file" size={12} color={colors.mutedForeground} />
                        <Text style={[s.statText, { color: colors.mutedForeground }]}>{t('courses.fileCount', { n: item.fileCount })}</Text>
                      </View>
                    )}
                    {item.assignmentCount != null && (
                      <View style={s.stat}>
                        <Feather name="clipboard" size={12} color={colors.mutedForeground} />
                        <Text style={[s.statText, { color: colors.mutedForeground }]}>{t('courses.assignmentCount', { n: item.assignmentCount })}</Text>
                      </View>
                    )}
                  </View>
                </View>
                <View style={[s.courseIcon, { backgroundColor: colors.navy }]}>
                  <Text style={s.courseCode}>{(item.code ?? item.name ?? '?').slice(0, 4)}</Text>
                </View>
              </View>
            </Card>
          )}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    margin: spacing.base,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  searchInput: { flex: 1, fontSize: fontSize.md },
  list: { paddingHorizontal: spacing.base, paddingBottom: 100, gap: spacing.sm },
  courseCard: {},
  cardInner: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  courseIcon: {
    width: 52, height: 52, borderRadius: radius.md,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  courseCode: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: '#fff', textAlign: 'center' },
  courseInfo: { flex: 1 },
  courseName: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, textAlign: 'right' },
  courseProfessor: { fontSize: fontSize.sm, marginTop: 2, textAlign: 'right' },
  courseStats: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xs, justifyContent: 'flex-end' },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statText: { fontSize: fontSize.xs },
});
