import React, { useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { showAlert } from '@/lib/alert';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { useGetCourse, AcademicFile } from '@workspace/api-client-react';
import { usePreferences } from '@/contexts/PreferencesContext';
import { GuestGate } from '@/components/GuestGate';
import { ErrorState } from '@/components/ui/ErrorState';
import { resolveFileUrl, openExternalUrl } from '@/lib/urls';
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

  const openFile = async (file: AcademicFile) => {
    const url = resolveFileUrl(file.fileUrl);
    if (!url) {
      showAlert(t('common.error'), t('files.noUrl'));
      return;
    }
    const opened = await openExternalUrl(url);
    if (!opened) showAlert(t('common.error'), t('files.openError'));
  };

  if (isLoading) {
    return <View style={[s.root, s.center]}><ActivityIndicator color={colors.navy} size="large" /></View>;
  }

  if (isError) {
    return <View style={[s.root, s.center]}><ErrorState onRetry={() => refetch()} /></View>;
  }

  if (!course) {
    return <View style={[s.root, s.center]}><Text style={{ color: colors.mutedForeground }}>{t('course.notFound')}</Text></View>;
  }

  return (
    <ScrollView style={s.root} refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />} contentContainerStyle={{ paddingBottom: 100 }}>
      {/* Header */}
      <View style={s.header}>
        {course.code && <View style={s.codeBox}><Text style={s.code}>{course.code}</Text></View>}
        <Text style={s.courseName}>{course.nameAr || course.name}</Text>
        {course.professorName && <Text style={s.professor}>{t('courses.professorPrefix')}{course.professorName}</Text>}
        <Text style={s.semester}>{course.semester}</Text>
        <View style={s.stats}>
          <View style={s.stat}><Feather name="file" size={16} color={colors.gold} /><Text style={s.statNum}>{course.fileCount}</Text><Text style={s.statLabel}>{t('course.tabFiles')}</Text></View>
          <View style={s.statDivider} />
          <View style={s.stat}><Feather name="clipboard" size={16} color={colors.gold} /><Text style={s.statNum}>{course.assignmentCount}</Text><Text style={s.statLabel}>{t('course.tabAssignments')}</Text></View>
        </View>
      </View>

      {/* Description */}
      {course.description && <View style={s.section}><Text style={[s.desc, align]}>{course.description}</Text></View>}

      {/* Tab bar */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[s.tabBar, rowDir]}>
        {TABS.map((key) => (
          <TouchableOpacity key={key} style={[s.tabBtn, tab === key && s.tabBtnActive]} onPress={() => setTab(key)}>
            <Text style={[s.tabText, tab === key && s.tabTextActive]}>{t(TAB_LABEL_KEY[key])}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Tab content */}
      {tab === 'files' && (
        <View style={s.tabContent}>
          {(course.recentFiles ?? []).length === 0 ? (
            <Text style={s.emptyText}>{t('course.noFiles')}</Text>
          ) : (
            (course.recentFiles ?? []).map((f) => (
              <TouchableOpacity key={f.id} style={[s.itemCard, rowDir]} activeOpacity={0.7} onPress={() => openFile(f)}>
                <Feather name="file-text" size={20} color={colors.navy} />
                <Text style={[s.itemTitle, align]} numberOfLines={2}>{f.title}</Text>
                <Text style={s.itemMeta}>{t(`fileTypes.${f.fileType}`)}</Text>
              </TouchableOpacity>
            ))
          )}
          <TouchableOpacity
            style={s.viewAllBtn}
            onPress={() => router.push({ pathname: '/files', params: { courseId: id, courseName: course.nameAr || course.name } })}
          >
            <View style={[s.viewAllInner, rowDir]}>
              <Text style={s.viewAllText}>{t('course.viewAllFiles')}</Text>
              <Feather name={isRTL ? 'arrow-left' : 'arrow-right'} size={15} color={colors.navy} />
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
                <Text style={[s.itemMeta, align]}>{t('course.due')}{a.deadline?.split('T')[0]}</Text>
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
    itemCard: { alignItems: 'center', gap: 10, backgroundColor: colors.card, borderRadius: 10, padding: 12, marginBottom: 8 },
    itemCardColumn: { flexDirection: 'column', alignItems: 'stretch', gap: 4 },
    itemTitle: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.foreground },
    itemMeta: { fontSize: 12, color: colors.mutedForeground },
    emptyText: { textAlign: 'center', color: colors.mutedForeground, fontSize: 14, paddingVertical: 20 },
    viewAllBtn: { paddingVertical: 12, alignItems: 'center' },
    viewAllInner: { alignItems: 'center', gap: 6 },
    viewAllText: { fontSize: 14, fontWeight: '600', color: colors.navy },
  });
