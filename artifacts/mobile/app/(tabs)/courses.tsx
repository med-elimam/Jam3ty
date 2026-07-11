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
import { useListCourses, Course } from '@workspace/api-client-react';
import { Feather } from '@expo/vector-icons';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { GuestGate } from '@/components/GuestGate';
import { spacing, fontSize, fontWeight, radius, shadow } from '@/constants/theme';

export default function CoursesScreen() {
  return (
    <GuestGate>
      <CoursesScreenInner />
    </GuestGate>
  );
}

function CoursesScreenInner() {
  const colors = useColors();
  const router = useRouter();
  const { t, isRTL } = usePreferences();
  const [search, setSearch] = useState('');
  const { data, isLoading, isError, refetch } = useListCourses({ search: search || undefined });

  const courses: Course[] = data?.data ?? [];
  const align = { textAlign: isRTL ? 'right' : 'left' } as const;
  const rowDir = { flexDirection: isRTL ? 'row-reverse' : 'row' } as const;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Search bar */}
      <View style={[s.searchBar, rowDir, { backgroundColor: colors.card, borderColor: colors.border }]}>
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
        <ActivityIndicator color={colors.primary} size="large" style={{ marginTop: 40 }} />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : (
        <FlatList
          data={courses}
          keyExtractor={(item) => item.id}
          contentContainerStyle={s.list}
          ListEmptyComponent={
            <EmptyState
              icon="book-open"
              title={t('courses.empty')}
              body={t('courses.emptyBody')}
            />
          }
          renderItem={({ item }: { item: Course }) => {
            const hasStats = item.fileCount != null || item.assignmentCount != null;

            return (
              <Card
                onPress={() => router.push({ pathname: '/course/[id]', params: { id: item.id } })}
                style={s.courseCard}
                padding={12}
              >
                <View style={[s.cardInner, { flexDirection: isRTL ? 'row' : 'row-reverse' }]}>
                  <Feather name={isRTL ? 'chevron-left' : 'chevron-right'} size={16} color={colors.mutedForeground} />
                  
                  <View style={s.courseInfo}>
                    <Text style={[s.courseName, { color: colors.foreground }, align]} numberOfLines={2}>
                      {item.nameAr || item.name}
                    </Text>
                    {item.professorName && (
                      <Text style={[s.courseProfessor, { color: colors.mutedForeground }, align]}>
                        {t('courses.professorPrefix')}{item.professorName}
                      </Text>
                    )}

                    {hasStats && (
                      <>
                        <View style={[s.divider, { backgroundColor: colors.border }]} />
                        <View style={[s.courseStats, { justifyContent: isRTL ? 'flex-end' : 'flex-start' }]}>
                          {item.fileCount != null && (
                            <View style={s.stat}>
                              <Feather name="file" size={11} color={colors.mutedForeground} />
                              <Text style={[s.statText, { color: colors.mutedForeground }]}>
                                {t('courses.fileCount', { n: item.fileCount })}
                              </Text>
                            </View>
                          )}
                          {item.assignmentCount != null && (
                            <View style={s.stat}>
                              <Feather name="clipboard" size={11} color={colors.mutedForeground} />
                              <Text style={[s.statText, { color: colors.mutedForeground }]}>
                                {t('courses.assignmentCount', { n: item.assignmentCount })}
                              </Text>
                            </View>
                          )}
                        </View>
                      </>
                    )}
                  </View>

                  <View style={[s.courseIcon, { backgroundColor: colors.primary + '0A', borderColor: colors.primary + '28' }]}>
                    <Text style={[s.courseCode, { color: colors.primary }]}>
                      {(item.code ?? item.name ?? '?').slice(0, 4).toUpperCase()}
                    </Text>
                  </View>
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
  searchBar: {
    alignItems: 'center',
    gap: spacing.sm,
    margin: spacing.base,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md - 1,
    borderRadius: 12,
    borderCurve: 'continuous',
    borderWidth: 1,
  },
  searchInput: { flex: 1, fontSize: fontSize.md },
  list: { paddingHorizontal: spacing.base, paddingBottom: 100, gap: spacing.sm },
  courseCard: {
    minHeight: 72,
    justifyContent: 'center',
  },
  cardInner: { alignItems: 'center', gap: spacing.md },
  courseIcon: {
    width: 48,
    height: 48,
    borderRadius: 10,
    borderCurve: 'continuous',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  courseCode: { fontSize: 10, fontWeight: fontWeight.bold, textAlign: 'center' },
  courseInfo: { flex: 1 },
  courseName: { fontSize: 14, fontWeight: fontWeight.semibold },
  courseProfessor: { fontSize: 12, marginTop: 1 },
  divider: { height: 1, marginVertical: 6 },
  courseStats: { flexDirection: 'row', gap: spacing.md },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statText: { fontSize: 11 },
});
