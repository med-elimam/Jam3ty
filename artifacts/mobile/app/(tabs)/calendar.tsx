import React, { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useGetTimetable } from '@workspace/api-client-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { spacing, fontSize, fontWeight, radius, shadow } from '@/constants/theme';

const DAYS = [
  { short: 'أح', label: 'الأحد' },
  { short: 'اث', label: 'الاثنين' },
  { short: 'ث', label: 'الثلاثاء' },
  { short: 'أر', label: 'الأربعاء' },
  { short: 'خ', label: 'الخميس' },
  { short: 'ج', label: 'الجمعة' },
  { short: 'س', label: 'السبت' },
];

const SESSION_COLORS = ['#1E3A5F', '#2B5480', '#D4A853', '#10B981', '#3B82F6', '#8B5CF6', '#EF4444'];
const SESSION_TYPE_AR: Record<string, string> = { lecture: 'محاضرة', td: 'TD', tp: 'TP', other: 'أخرى' };

const TODAY_DOW = new Date().getDay();

export default function CalendarScreen() {
  const colors = useColors();
  const [selectedDay, setSelectedDay] = useState(TODAY_DOW);
  const { data, isLoading } = useGetTimetable();

  const sessions: any[] = (data as any)?.data ?? [];
  const dayMap = DAYS.reduce((acc, _, i) => {
    acc[i] = sessions.filter((s) => s.dayOfWeek === i).sort((a, b) => a.startTime.localeCompare(b.startTime));
    return acc;
  }, {} as Record<number, any[]>);

  const todaySessions = dayMap[selectedDay] ?? [];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Day pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.dayRow}
      >
        {DAYS.map((day, i) => {
          const isActive = selectedDay === i;
          const isToday = i === TODAY_DOW;
          return (
            <TouchableOpacity
              key={i}
              activeOpacity={0.75}
              style={[
                s.dayPill,
                {
                  backgroundColor: isActive ? colors.navy : colors.card,
                  borderColor: isToday && !isActive ? colors.gold : isActive ? colors.navy : colors.border,
                },
              ]}
              onPress={() => setSelectedDay(i)}
            >
              <Text style={[s.dayShort, { color: isActive ? '#fff' : colors.foreground }]}>{day.short}</Text>
              {dayMap[i]?.length > 0 && (
                <View style={[s.daydot, { backgroundColor: isActive ? 'rgba(255,255,255,0.6)' : colors.navy + '50' }]} />
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <Text style={[s.dayTitle, { color: colors.foreground }]}>{DAYS[selectedDay]?.label}</Text>

      {isLoading ? (
        <ActivityIndicator color={colors.navy} size="large" style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={s.list}>
          {todaySessions.length === 0 ? (
            <EmptyState
              icon="calendar"
              title="لا توجد محاضرات"
              body="لا توجد محاضرات مجدولة لهذا اليوم."
            />
          ) : (
            todaySessions.map((session: any, idx: number) => {
              const accentColor = SESSION_COLORS[idx % SESSION_COLORS.length];
              return (
                <View key={session.id} style={[s.sessionCard, shadow.sm, { backgroundColor: colors.card, borderColor: colors.border, borderLeftColor: accentColor }]}>
                  <View style={[s.timeCol, { backgroundColor: accentColor + '12' }]}>
                    <Text style={[s.timeStart, { color: accentColor }]}>{session.startTime?.slice(0, 5)}</Text>
                    <View style={[s.timeLine, { backgroundColor: accentColor + '40' }]} />
                    <Text style={[s.timeEnd, { color: colors.mutedForeground }]}>{session.endTime?.slice(0, 5)}</Text>
                  </View>
                  <View style={s.sessionBody}>
                    <Text style={[s.sessionName, { color: colors.foreground }]}>{session.courseName}</Text>
                    {session.professorName && (
                      <Text style={[s.sessionMeta, { color: colors.mutedForeground }]}>د. {session.professorName}</Text>
                    )}
                    <View style={s.sessionTags}>
                      {session.room && (
                        <View style={[s.tag, { backgroundColor: colors.navy + '10' }]}>
                          <Text style={[s.tagText, { color: colors.navy }]}>🏫 {session.room}</Text>
                        </View>
                      )}
                      {session.sessionType && (
                        <View style={[s.tag, { backgroundColor: colors.navy + '10' }]}>
                          <Text style={[s.tagText, { color: colors.navy }]}>
                            {SESSION_TYPE_AR[session.sessionType] ?? session.sessionType}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  dayRow: { paddingHorizontal: spacing.base, paddingVertical: spacing.md, gap: spacing.sm },
  dayPill: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: radius.full, borderWidth: 1.5,
    alignItems: 'center', minWidth: 44,
  },
  dayShort: { fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  daydot: { width: 4, height: 4, borderRadius: 2, marginTop: 3 },
  dayTitle: { fontSize: fontSize.md, fontWeight: fontWeight.bold, paddingHorizontal: spacing.base, marginBottom: spacing.sm, textAlign: 'right' },
  list: { paddingHorizontal: spacing.base, paddingBottom: 100, gap: spacing.sm },
  sessionCard: {
    flexDirection: 'row', borderRadius: radius.lg,
    borderWidth: 1, borderLeftWidth: 4, overflow: 'hidden',
  },
  timeCol: { width: 60, padding: spacing.sm, alignItems: 'center', justifyContent: 'center', gap: 4 },
  timeStart: { fontSize: fontSize.xs, fontWeight: fontWeight.bold },
  timeLine: { width: 2, flex: 1, borderRadius: 1, minHeight: 12 },
  timeEnd: { fontSize: 10 },
  sessionBody: { flex: 1, padding: spacing.md },
  sessionName: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, textAlign: 'right' },
  sessionMeta: { fontSize: fontSize.sm, marginTop: 2, textAlign: 'right' },
  sessionTags: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.sm, justifyContent: 'flex-end' },
  tag: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.sm },
  tagText: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
});
