import React, { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useGetTimetable } from '@workspace/api-client-react';

const DAYS = [
  { short: 'Sun', label: 'Sunday', ar: 'الأحد' },
  { short: 'Mon', label: 'Monday', ar: 'الاثنين' },
  { short: 'Tue', label: 'Tuesday', ar: 'الثلاثاء' },
  { short: 'Wed', label: 'Wednesday', ar: 'الأربعاء' },
  { short: 'Thu', label: 'Thursday', ar: 'الخميس' },
  { short: 'Fri', label: 'Friday', ar: 'الجمعة' },
  { short: 'Sat', label: 'Saturday', ar: 'السبت' },
];

const SESSION_COLORS = ['#1E3A5F', '#2B5480', '#D4A853', '#10B981', '#3B82F6', '#8B5CF6', '#EF4444'];

const TODAY_DOW = new Date().getDay();

export default function CalendarScreen() {
  const colors = useColors();
  const [selectedDay, setSelectedDay] = useState(TODAY_DOW);
  const { data, isLoading } = useGetTimetable();

  const sessions: any[] = ((data as any)?.data ?? []);
  const daySessionsMap = DAYS.reduce((acc, _, i) => {
    acc[i] = sessions.filter((s) => s.dayOfWeek === i).sort((a, b) => a.startTime.localeCompare(b.startTime));
    return acc;
  }, {} as Record<number, any[]>);

  const currentSessions = daySessionsMap[selectedDay] ?? [];
  const s = styles(colors);

  return (
    <View style={s.root}>
      {/* Day selector */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.dayRow}>
        {DAYS.map((day, i) => (
          <TouchableOpacity
            key={i}
            style={[s.dayPill, selectedDay === i && s.dayPillActive, i === TODAY_DOW && s.dayPillToday]}
            onPress={() => setSelectedDay(i)}
          >
            <Text style={[s.dayPillShort, selectedDay === i && s.dayPillTextActive]}>{day.short}</Text>
            {daySessionsMap[i]?.length > 0 && <View style={[s.dot, selectedDay === i && s.dotActive]} />}
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Text style={s.dayTitle}>{DAYS[selectedDay]?.ar} · {DAYS[selectedDay]?.label}</Text>

      {isLoading ? (
        <ActivityIndicator color={colors.navy} size="large" style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
          {currentSessions.length === 0 ? (
            <View style={s.empty}>
              <Text style={s.emptyIcon}>📅</Text>
              <Text style={s.emptyText}>No classes</Text>
            </View>
          ) : (
            currentSessions.map((session: any, idx: number) => (
              <View key={session.id} style={[s.sessionCard, { borderLeftColor: SESSION_COLORS[idx % SESSION_COLORS.length] }]}>
                <View style={s.sessionLeft}>
                  <Text style={s.timeText}>{session.startTime?.slice(0, 5)}</Text>
                  <View style={[s.timeLine, { backgroundColor: SESSION_COLORS[idx % SESSION_COLORS.length] + '40' }]} />
                  <Text style={s.timeTextEnd}>{session.endTime?.slice(0, 5)}</Text>
                </View>
                <View style={s.sessionBody}>
                  <Text style={s.sessionName}>{session.courseName}</Text>
                  {session.professorName && <Text style={s.sessionMeta}>Dr. {session.professorName}</Text>}
                  <View style={s.sessionRow}>
                    {session.room && <Text style={s.sessionTag}>🏫 {session.room}</Text>}
                    {session.sessionType && <Text style={s.sessionTag}>{session.sessionType.toUpperCase()}</Text>}
                    {session.groupName && <Text style={s.sessionTag}>👥 {session.groupName}</Text>}
                  </View>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    dayRow: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
    dayPill: {
      paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
      backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.border,
      alignItems: 'center', minWidth: 54,
    },
    dayPillActive: { backgroundColor: colors.navy, borderColor: colors.navy },
    dayPillToday: { borderColor: colors.gold },
    dayPillShort: { fontSize: 13, fontWeight: '600', color: colors.foreground },
    dayPillTextActive: { color: '#fff' },
    dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.mutedForeground, marginTop: 3 },
    dotActive: { backgroundColor: colors.gold },
    dayTitle: { fontSize: 16, fontWeight: '700', color: colors.foreground, paddingHorizontal: 16, marginBottom: 8 },
    sessionCard: {
      flexDirection: 'row', backgroundColor: colors.card, borderRadius: 12,
      marginBottom: 10, borderLeftWidth: 4, overflow: 'hidden',
      shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
    },
    sessionLeft: { width: 56, padding: 12, alignItems: 'center', gap: 4 },
    timeText: { fontSize: 11, fontWeight: '700', color: colors.navy },
    timeTextEnd: { fontSize: 11, color: colors.mutedForeground },
    timeLine: { width: 2, flex: 1, borderRadius: 1 },
    sessionBody: { flex: 1, padding: 12 },
    sessionName: { fontSize: 15, fontWeight: '600', color: colors.foreground },
    sessionMeta: { fontSize: 12, color: colors.mutedForeground, marginTop: 2 },
    sessionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
    sessionTag: { fontSize: 11, color: colors.navy, backgroundColor: colors.secondary, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
    empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
    emptyIcon: { fontSize: 48 },
    emptyText: { fontSize: 16, color: colors.mutedForeground },
  });
