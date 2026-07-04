import React, { useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { useGetCourse } from '@workspace/api-client-react';
import { Feather } from '@expo/vector-icons';

const TABS = ['Files', 'Announcements', 'Assignments', 'Exams'] as const;

export default function CourseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const router = useRouter();
  const [tab, setTab] = useState<typeof TABS[number]>('Files');

  const { data, isLoading, refetch, isRefetching } = useGetCourse(id);
  const course = (data as any)?.data;
  const s = styles(colors);

  if (isLoading) {
    return <View style={[s.root, { alignItems: 'center', justifyContent: 'center' }]}><ActivityIndicator color={colors.navy} size="large" /></View>;
  }

  if (!course) {
    return <View style={[s.root, { alignItems: 'center', justifyContent: 'center' }]}><Text style={{ color: colors.mutedForeground }}>Course not found</Text></View>;
  }

  return (
    <ScrollView style={s.root} refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />} contentContainerStyle={{ paddingBottom: 100 }}>
      {/* Header */}
      <View style={s.header}>
        <View style={s.codeBox}><Text style={s.code}>{course.code}</Text></View>
        <Text style={s.courseName}>{course.nameAr || course.name}</Text>
        {course.professorName && <Text style={s.professor}>Dr. {course.professorName}</Text>}
        <Text style={s.semester}>{course.semester} · {course.creditHours ?? 3} credits</Text>
        <View style={s.stats}>
          <View style={s.stat}><Feather name="file" size={16} color={colors.gold} /><Text style={s.statNum}>{course.fileCount}</Text><Text style={s.statLabel}>Files</Text></View>
          <View style={s.statDivider} />
          <View style={s.stat}><Feather name="clipboard" size={16} color={colors.gold} /><Text style={s.statNum}>{course.assignmentCount}</Text><Text style={s.statLabel}>Assignments</Text></View>
        </View>
      </View>

      {/* Description */}
      {course.description && <View style={s.section}><Text style={s.desc}>{course.description}</Text></View>}

      {/* Tab bar */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tabBar}>
        {TABS.map((t) => (
          <TouchableOpacity key={t} style={[s.tabBtn, tab === t && s.tabBtnActive]} onPress={() => setTab(t)}>
            <Text style={[s.tabText, tab === t && s.tabTextActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Tab content */}
      {tab === 'Files' && (
        <View style={s.tabContent}>
          {(course.recentFiles ?? []).length === 0 ? (
            <Text style={s.emptyText}>No files yet</Text>
          ) : (
            (course.recentFiles ?? []).map((f: any) => (
              <View key={f.id} style={s.itemCard}>
                <Feather name="file-text" size={20} color={colors.navy} />
                <Text style={s.itemTitle} numberOfLines={2}>{f.title}</Text>
                <Text style={s.itemMeta}>{f.fileType}</Text>
              </View>
            ))
          )}
          <TouchableOpacity style={s.viewAllBtn} onPress={() => router.push({ pathname: '/files' as any, params: { courseId: id } })}>
            <Text style={s.viewAllText}>View all files →</Text>
          </TouchableOpacity>
        </View>
      )}

      {tab === 'Announcements' && (
        <View style={s.tabContent}>
          {(course.recentAnnouncements ?? []).length === 0 ? (
            <Text style={s.emptyText}>No announcements</Text>
          ) : (
            (course.recentAnnouncements ?? []).map((a: any) => (
              <View key={a.id} style={[s.itemCard, { flexDirection: 'column', alignItems: 'flex-start', gap: 4 }]}>
                <Text style={s.itemTitle}>{a.titleAr || a.title}</Text>
                <Text style={s.itemMeta} numberOfLines={2}>{a.contentAr || a.content}</Text>
              </View>
            ))
          )}
        </View>
      )}

      {tab === 'Assignments' && (
        <View style={s.tabContent}>
          {(course.upcomingAssignments ?? []).length === 0 ? (
            <Text style={s.emptyText}>No assignments</Text>
          ) : (
            (course.upcomingAssignments ?? []).map((a: any) => (
              <View key={a.id} style={[s.itemCard, { flexDirection: 'column', alignItems: 'flex-start', gap: 4 }]}>
                <Text style={s.itemTitle}>{a.titleAr || a.title}</Text>
                <Text style={s.itemMeta}>Due: {a.deadline?.split('T')[0]}</Text>
              </View>
            ))
          )}
        </View>
      )}

      {tab === 'Exams' && (
        <View style={s.tabContent}>
          {(course.upcomingExams ?? []).length === 0 ? (
            <Text style={s.emptyText}>No exams scheduled</Text>
          ) : (
            (course.upcomingExams ?? []).map((e: any) => (
              <View key={e.id} style={[s.itemCard, { flexDirection: 'column', alignItems: 'flex-start', gap: 4 }]}>
                <Text style={s.itemTitle}>{e.titleAr || e.title}</Text>
                <Text style={s.itemMeta}>{e.examType} · {e.date}</Text>
              </View>
            ))
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    header: { backgroundColor: colors.navy, padding: 20, alignItems: 'center', gap: 6 },
    codeBox: { backgroundColor: colors.gold, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8 },
    code: { fontSize: 12, fontWeight: '700', color: '#000' },
    courseName: { fontSize: 20, fontWeight: '700', color: '#fff', textAlign: 'center' },
    professor: { fontSize: 14, color: 'rgba(255,255,255,0.8)' },
    semester: { fontSize: 12, color: 'rgba(255,255,255,0.6)' },
    stats: { flexDirection: 'row', gap: 24, marginTop: 8 },
    stat: { alignItems: 'center', gap: 2 },
    statNum: { fontSize: 20, fontWeight: '700', color: '#fff' },
    statLabel: { fontSize: 11, color: 'rgba(255,255,255,0.7)' },
    statDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)' },
    section: { padding: 16, backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border },
    desc: { fontSize: 14, color: colors.mutedForeground, lineHeight: 21 },
    tabBar: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
    tabBtn: { paddingHorizontal: 16, height: 32, borderRadius: 20, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, justifyContent: 'center', alignItems: 'center' },
    tabBtnActive: { backgroundColor: colors.navy, borderColor: colors.navy },
    tabText: { fontSize: 14, fontWeight: '600', color: colors.mutedForeground },
    tabTextActive: { color: '#fff' },
    tabContent: { padding: 16 },
    itemCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.card, borderRadius: 10, padding: 12, marginBottom: 8 },
    itemTitle: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.foreground },
    itemMeta: { fontSize: 12, color: colors.mutedForeground },
    emptyText: { textAlign: 'center', color: colors.mutedForeground, fontSize: 14, paddingVertical: 20 },
    viewAllBtn: { paddingVertical: 12, alignItems: 'center' },
    viewAllText: { fontSize: 14, fontWeight: '600', color: colors.navy },
  });
