import React, { useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { useGetCourse, AcademicFile } from '@workspace/api-client-react';
import { usePreferences } from '@/contexts/PreferencesContext';
import { GuestGate } from '@/components/GuestGate';
import { ErrorState } from '@/components/ui/ErrorState';
import { Feather } from '@expo/vector-icons';

const TABS = ['files', 'announcements', 'assignments', 'exams'] as const;
type Tab = typeof TABS[number];

const TAB_LABEL_KEY: Record<Tab, string> = {
  files: 'course.tabFiles',
  announcements: 'course.tabAnnouncements',
  assignments: 'course.tabAssignments',
  exams: 'course.tabExams',
};

export default function CourseDetailScreen() {
  return (
    <GuestGate>
      <CourseDetailInner />
    </GuestGate>
  );
}

function CourseDetailInner() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const router = useRouter();
  const { t, isRTL } = usePreferences();
  const [tab, setTab] = useState<Tab>('files');

  const { data, isLoading, isError, refetch, isRefetching } = useGetCourse(id);
  const course = data?.data;
  const s = styles(colors);
  const align = { textAlign: isRTL ? 'right' : 'left' } as const;
  const rowDir = { flexDirection: isRTL ? 'row-reverse' : 'row' } as const;

  // Unified content system: every file opens through /content/[id] — never externally.
  // (Href cast: the typed-routes d.ts is machine-generated on dev start and may lag new routes.)
  const openFile = (file: AcademicFile) => {
    router.push({ pathname: '/content/[id]', params: { id: file.id } } as unknown as Href);
  };

  if (isLoading) {
    return <View style={[s.root, s.center]}><ActivityIndicator color={colors.primary} size="large" /></View>;
  }

  if (isError) {
    return <View style={[s.root, s.center]}><ErrorState onRetry={() => refetch()} /></View>;
  }

  if (!course) {
    return <View style={[s.root, s.center]}><Text style={{ color: colors.mutedForeground }}>{t('course.notFound')}</Text></View>;
  }

  return (
    <ScrollView style={s.root} refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />} contentContainerStyle={{ paddingBottom: 100 }}>
      {/* Header */}
      <View style={s.header}>
        {course.code && <View style={[s.codeBox, { backgroundColor: colors.primary + '0A', borderColor: colors.primary + '28', borderWidth: 1 }]}><Text style={s.code}>{course.code.toUpperCase()}</Text></View>}
        <Text style={s.courseName}>{course.nameAr || course.name}</Text>
        {course.professorName && <Text style={s.professor}>{t('courses.professorPrefix')}{course.professorName}</Text>}
        <Text style={s.semester}>{course.semester}</Text>
        <View style={s.stats}>
          <View style={s.stat}><Feather name="file" size={14} color={colors.mutedForeground} style={{ marginBottom: 2 }} /><Text style={s.statNum}>{course.fileCount}</Text><Text style={s.statLabel}>{t('course.tabFiles')}</Text></View>
          <View style={s.statDivider} />
          <View style={s.stat}><Feather name="clipboard" size={14} color={colors.mutedForeground} style={{ marginBottom: 2 }} /><Text style={s.statNum}>{course.assignmentCount}</Text><Text style={s.statLabel}>{t('course.tabAssignments')}</Text></View>
        </View>
      </View>

      {/* Description */}
      {course.description && <View style={s.section}><Text style={[s.desc, align]}>{course.description}</Text></View>}

      {/* Tab bar */}
      <View style={[s.tabBarContainer, { borderBottomColor: colors.border }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[s.tabBar, rowDir]}>
          {TABS.map((key) => (
            <TouchableOpacity key={key} style={[s.tabBtn, tab === key && s.tabBtnActive]} onPress={() => setTab(key)}>
              <Text style={[s.tabText, tab === key && s.tabTextActive]}>{t(TAB_LABEL_KEY[key])}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Tab content */}
      {tab === 'files' && (
        <View style={s.tabContent}>
          {(course.recentFiles ?? []).length === 0 ? (
            <Text style={s.emptyText}>{t('course.noFiles')}</Text>
          ) : (
            (course.recentFiles ?? []).map((f) => (
              <TouchableOpacity key={f.id} style={[s.itemCard, rowDir]} activeOpacity={0.7} onPress={() => openFile(f)}>
                <Feather name="file-text" size={18} color={colors.mutedForeground} style={isRTL ? { marginLeft: 10 } : { marginRight: 10 }} />
                <View style={{ flex: 1 }}>
                  <Text style={[s.itemTitle, align]} numberOfLines={1}>{f.title}</Text>
                  <Text style={[s.itemMeta, align]}>{t(`fileTypes.${f.fileType}`)}</Text>
                </View>
                <Feather name={isRTL ? 'chevron-left' : 'chevron-right'} size={14} color={colors.mutedForeground} />
              </TouchableOpacity>
            ))
          )}
          <TouchableOpacity
            style={s.viewAllBtn}
            onPress={() => router.push({ pathname: '/files', params: { courseId: id, courseName: course.nameAr || course.name } })}
          >
            <View style={[s.viewAllInner, rowDir]}>
              <Text style={s.viewAllText}>{t('course.viewAllFiles')}</Text>
              <Feather name={isRTL ? 'arrow-left' : 'arrow-right'} size={14} color={colors.primary} />
            </View>
          </TouchableOpacity>
        </View>
      )}

      {tab === 'announcements' && (
        <View style={s.tabContent}>
          {(course.recentAnnouncements ?? []).length === 0 ? (
            <Text style={s.emptyText}>{t('course.noAnnouncements')}</Text>
          ) : (
            (course.recentAnnouncements ?? []).map((a) => (
              <View key={a.id} style={[s.itemCard, s.itemCardColumn]}>
                <Text style={[s.itemTitle, align]}>{a.title}</Text>
                <Text style={[s.itemMeta, align]} numberOfLines={2}>{a.content}</Text>
              </View>
            ))
          )}
        </View>
      )}

      {tab === 'assignments' && (
        <View style={s.tabContent}>
          {(course.upcomingAssignments ?? []).length === 0 ? (
            <Text style={s.emptyText}>{t('course.noAssignments')}</Text>
          ) : (
            (course.upcomingAssignments ?? []).map((a) => (
              <View key={a.id} style={[s.itemCard, s.itemCardColumn]}>
                <Text style={[s.itemTitle, align]}>{a.title}</Text>
                <Text style={[s.itemMeta, align]}>{t('course.due')} {a.deadline?.split('T')[0]}</Text>
              </View>
            ))
          )}
        </View>
      )}

      {tab === 'exams' && (
        <View style={s.tabContent}>
          {(course.upcomingExams ?? []).length === 0 ? (
            <Text style={s.emptyText}>{t('course.noExams')}</Text>
          ) : (
            (course.upcomingExams ?? []).map((e) => (
              <View key={e.id} style={[s.itemCard, s.itemCardColumn]}>
                <Text style={[s.itemTitle, align]}>{e.title}</Text>
                <Text style={[s.itemMeta, align]}>{t(`examTypes.${e.type}`)} · {e.date}</Text>
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
    center: { alignItems: 'center', justifyContent: 'center' },
    header: { backgroundColor: colors.card, padding: 20, alignItems: 'center', gap: 6, borderBottomWidth: 1, borderBottomColor: colors.border },
    codeBox: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 },
    code: { fontSize: 11, fontWeight: '700', color: colors.primary },
    courseName: { fontSize: 18, fontWeight: '700', color: colors.foreground, textAlign: 'center', marginTop: 4 },
    professor: { fontSize: 13, color: colors.mutedForeground },
    semester: { fontSize: 11, color: colors.mutedForeground },
    stats: { flexDirection: 'row', gap: 24, marginTop: 12 },
    stat: { alignItems: 'center', gap: 2 },
    statNum: { fontSize: 18, fontWeight: '700', color: colors.foreground },
    statLabel: { fontSize: 10, color: colors.mutedForeground },
    statDivider: { width: 1, backgroundColor: colors.border },
    section: { padding: 16, backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border },
    desc: { fontSize: 13, color: colors.mutedForeground, lineHeight: 18 },
    tabBarContainer: { backgroundColor: colors.card, borderBottomWidth: 1 },
    tabBar: { paddingHorizontal: 16, gap: 16, height: 40 },
    tabBtn: { paddingVertical: 8, paddingHorizontal: 4, height: 40, justifyContent: 'center', alignItems: 'center' },
    tabBtnActive: { borderBottomWidth: 2, borderBottomColor: colors.primary },
    tabText: { fontSize: 13, fontWeight: '600', color: colors.mutedForeground },
    tabTextActive: { color: colors.primary },
    tabContent: { padding: 16 },
    itemCard: { alignItems: 'center', gap: 10, backgroundColor: colors.card, borderRadius: 12, borderCurve: 'continuous', padding: 12, marginBottom: 8, borderWidth: 1, borderColor: colors.border },
    itemCardColumn: { flexDirection: 'column', alignItems: 'stretch', gap: 4 },
    itemTitle: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.foreground },
    itemMeta: { fontSize: 11, color: colors.mutedForeground },
    emptyText: { textAlign: 'center', color: colors.mutedForeground, fontSize: 13, paddingVertical: 20 },
    viewAllBtn: { paddingVertical: 12, alignItems: 'center' },
    viewAllInner: { alignItems: 'center', gap: 6 },
    viewAllText: { fontSize: 13, fontWeight: '600', color: colors.primary },
  });
