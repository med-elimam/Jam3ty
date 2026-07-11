import React, { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { usePreferences } from '@/contexts/PreferencesContext';
import { useGetTimetable } from '@workspace/api-client-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { GuestGate } from '@/components/GuestGate';
import { spacing, fontSize, fontWeight, radius, shadow } from '@/constants/theme';

const SESSION_COLORS = ['#4F46E5', '#6366F1', '#10B981', '#F59E0B', '#64748B'];
const TODAY_DOW = new Date().getDay();

export default function CalendarScreen() {
  return (
    <GuestGate>
      <CalendarScreenInner />
    </GuestGate>
  );
}

function CalendarScreenInner() {
  const colors = useColors();
  const { t, tArray, isRTL } = usePreferences();
  const [selectedDay, setSelectedDay] = useState(TODAY_DOW);
  const { data, isLoading, isError, refetch } = useGetTimetable();

  const daysFull = tArray('days.full');
  const daysShort = tArray('days.short');
  const align = { textAlign: isRTL ? 'right' : 'left' } as const;

  const sessions = data?.data ?? [];
  const dayMap = daysShort.reduce((acc, _, i) => {
    acc[i] = sessions
      .filter((s) => s.dayOfWeek === i)
      .sort((a, b) => String(a.startTime).localeCompare(String(b.startTime)));
    return acc;
  }, {} as Record<number, typeof sessions>);

  const daySessions = dayMap[selectedDay] ?? [];

  const typeLabel = (type: string) => {
    const key = ['lecture', 'td', 'tp', 'other'].includes(type) ? type : 'other';
    return t(`timetable.${key}`);
  };

  // Build a date number for each day-of-week slot relative to this week
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Week day selector */}
      <View style={[s.weekRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        {daysShort.map((label, i) => {
          const isActive = selectedDay === i;
          const isToday = i === TODAY_DOW;
          const count = dayMap[i]?.length ?? 0;
          const dayDate = new Date(startOfWeek);
          dayDate.setDate(startOfWeek.getDate() + i);
          const dateNum = dayDate.getDate();
          return (
            <TouchableOpacity
              key={i}
              activeOpacity={0.75}
              style={[
                s.dayCell,
                {
                  backgroundColor: isActive ? colors.primary : 'transparent',
                  borderColor: isToday && !isActive ? colors.primary : 'transparent',
                },
              ]}
              onPress={() => setSelectedDay(i)}
            >
              <Text style={[s.dayAbbr, { color: isActive ? 'rgba(255,255,255,0.75)' : colors.mutedForeground }]}>
                {label}
              </Text>
              <Text style={[s.dayNum, { color: isActive ? '#fff' : isToday ? colors.primary : colors.foreground }]}>
                {dateNum}
              </Text>
              {count > 0 && (
                <View style={[s.dayDot, { backgroundColor: isActive ? 'rgba(255,255,255,0.6)' : colors.primary }]} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={[s.headerRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <Text style={[s.dayTitle, { color: colors.foreground }]}>{daysFull[selectedDay]}</Text>
        <Text style={[s.dayCount, { color: colors.mutedForeground }]}>
          {t('timetable.sessionsCount', { n: daySessions.length })}
        </Text>
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.primary} size="large" style={{ marginTop: 40 }} />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : (
        <ScrollView contentContainerStyle={s.list}>
          {daySessions.length === 0 ? (
            <EmptyState icon="calendar" title={t('timetable.emptyTitle')} body={t('timetable.emptyBody')} />
          ) : (
            daySessions.map((session, idx) => {
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
                        <View style={[s.tag, { backgroundColor: 'rgba(99, 102, 241, 0.08)' }]}>
                          <Text style={[s.tagText, { color: colors.primary }]}>
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
  // ── Week day selector ───────────────────────────────────────────────
  weekRow: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    alignItems: 'center',
    gap: spacing.xs,
  },
  dayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
    borderRadius: 12,
    borderCurve: 'continuous',
    borderWidth: 1,
    gap: 2,
  },
  dayAbbr: { fontSize: fontSize.xs - 1, fontWeight: fontWeight.medium, textTransform: 'uppercase' },
  dayNum: { fontSize: fontSize.md, fontWeight: fontWeight.bold },
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
  sessionCard: { borderRadius: 16, borderCurve: 'continuous', borderWidth: 1, overflow: 'hidden' },
  timeCol: { width: 62, padding: spacing.sm, alignItems: 'center', justifyContent: 'center', gap: 4 },
  timeStart: { fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  timeLine: { width: 2, flex: 1, borderRadius: 1, minHeight: 12 },
  timeEnd: { fontSize: 11 },
  sessionBody: { flex: 1, padding: spacing.md },
  sessionName: { fontSize: fontSize.md, fontWeight: fontWeight.semibold },
  sessionMeta: { fontSize: fontSize.sm, marginTop: 2 },
  sessionTags: { flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.sm },
  tag: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: 8, borderCurve: 'continuous' },
  tagText: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
});
