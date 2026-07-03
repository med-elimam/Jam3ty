import React, { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { usePreferences } from '@/contexts/PreferencesContext';
import { useGetTimetable } from '@workspace/api-client-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { spacing, fontSize, fontWeight, radius, shadow } from '@/constants/theme';

const SESSION_COLORS = ['#1E3A5F', '#2B5480', '#D4A853', '#10B981', '#3B82F6', '#8B5CF6', '#EF4444'];
const TODAY_DOW = new Date().getDay();

export default function CalendarScreen() {
  const colors = useColors();
  const { t, tArray, isRTL } = usePreferences();
  const [selectedDay, setSelectedDay] = useState(TODAY_DOW);
  const { data, isLoading } = useGetTimetable();

  const daysFull = tArray('days.full');
  const daysShort = tArray('days.short');
  const align = { textAlign: isRTL ? 'right' : 'left' } as const;

  const sessions: any[] = (data as any)?.data ?? [];
  const dayMap = daysShort.reduce((acc, _, i) => {
    acc[i] = sessions
      .filter((s) => s.dayOfWeek === i)
      .sort((a, b) => String(a.startTime).localeCompare(String(b.startTime)));
    return acc;
  }, {} as Record<number, any[]>);

  const daySessions = dayMap[selectedDay] ?? [];

  const typeLabel = (type: string) => {
    const key = ['lecture', 'td', 'tp', 'other'].includes(type) ? type : 'other';
    return t(`timetable.${key}`);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Day chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[s.dayRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
      >
        {daysShort.map((label, i) => {
          const isActive = selectedDay === i;
          const isToday = i === TODAY_DOW;
          const count = dayMap[i]?.length ?? 0;
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
              <Text style={[s.dayShort, { color: isActive ? '#fff' : colors.foreground }]}>{label}</Text>
              {count > 0 && (
                <View style={[s.dayDot, { backgroundColor: isActive ? 'rgba(255,255,255,0.7)' : colors.gold }]} />
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={[s.headerRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <Text style={[s.dayTitle, { color: colors.foreground }]}>{daysFull[selectedDay]}</Text>
        <Text style={[s.dayCount, { color: colors.mutedForeground }]}>
          {t('timetable.sessionsCount', { n: daySessions.length })}
        </Text>
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.navy} size="large" style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={s.list}>
          {daySessions.length === 0 ? (
            <EmptyState icon="calendar" title={t('timetable.emptyTitle')} body={t('timetable.emptyBody')} />
          ) : (
            daySessions.map((session: any, idx: number) => {
              const accent = SESSION_COLORS[idx % SESSION_COLORS.length];
              return (
                <View
                  key={session.id}
                  style={[
                    s.sessionCard,
                    shadow.sm,
                    {
                      flexDirection: isRTL ? 'row-reverse' : 'row',
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                      [isRTL ? 'borderRightColor' : 'borderLeftColor']: accent,
                      [isRTL ? 'borderRightWidth' : 'borderLeftWidth']: 4,
                    },
                  ]}
                >
                  <View style={[s.timeCol, { backgroundColor: accent + '14' }]}>
                    <Text style={[s.timeStart, { color: accent }]}>{String(session.startTime).slice(0, 5)}</Text>
                    <View style={[s.timeLine, { backgroundColor: accent + '40' }]} />
                    <Text style={[s.timeEnd, { color: colors.mutedForeground }]}>{String(session.endTime).slice(0, 5)}</Text>
                  </View>
                  <View style={s.sessionBody}>
                    <Text style={[s.sessionName, { color: colors.foreground }, align]}>{session.courseName}</Text>
                    {session.professorName && (
                      <Text style={[s.sessionMeta, { color: colors.mutedForeground }, align]}>
                        {t('courses.professorPrefix')}{session.professorName}
                      </Text>
                    )}
                    <View style={[s.sessionTags, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                      <View style={[s.tag, { backgroundColor: accent + '18' }]}>
                        <Text style={[s.tagText, { color: accent }]}>{typeLabel(session.type)}</Text>
                      </View>
                      {session.room && (
                        <View style={[s.tag, { backgroundColor: colors.navy + '10' }]}>
                          <Text style={[s.tagText, { color: colors.navy }]}>
                            {t('timetable.room')} {session.room}
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
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1.5,
    alignItems: 'center',
    minWidth: 52,
  },
  dayShort: { fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  dayDot: { width: 4, height: 4, borderRadius: 2, marginTop: 3 },
  headerRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    marginBottom: spacing.sm,
  },
  dayTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold },
  dayCount: { fontSize: fontSize.sm },
  list: { paddingHorizontal: spacing.base, paddingBottom: 120, gap: spacing.sm },
  sessionCard: { borderRadius: radius.lg, borderWidth: 1, overflow: 'hidden' },
  timeCol: { width: 62, padding: spacing.sm, alignItems: 'center', justifyContent: 'center', gap: 4 },
  timeStart: { fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  timeLine: { width: 2, flex: 1, borderRadius: 1, minHeight: 12 },
  timeEnd: { fontSize: 11 },
  sessionBody: { flex: 1, padding: spacing.md },
  sessionName: { fontSize: fontSize.md, fontWeight: fontWeight.semibold },
  sessionMeta: { fontSize: fontSize.sm, marginTop: 2 },
  sessionTags: { flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.sm },
  tag: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.sm },
  tagText: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
});
