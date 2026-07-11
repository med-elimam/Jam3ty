import React, { useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { usePreferences } from '@/contexts/PreferencesContext';
import { useGetTimetable } from '@workspace/api-client-react';
import { ErrorState } from '@/components/ui/ErrorState';
import { GuestGate } from '@/components/GuestGate';
import { Card } from '@/components/ui/Card';
import { Feather } from '@expo/vector-icons';

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
  const { t, tArray, isRTL, language } = usePreferences();
  const [selectedDay, setSelectedDay] = useState(TODAY_DOW);
  const { data, isLoading, isError, refetch, isRefetching } = useGetTimetable();

  const daysFull = tArray('days.full');
  const daysShort = tArray('days.short');
  const align = { textAlign: isRTL ? 'right' : 'left' } as const;
  const rowDir = { flexDirection: isRTL ? 'row-reverse' : 'row' } as const;

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

  const selectedDate = new Date(startOfWeek);
  selectedDate.setDate(startOfWeek.getDate() + selectedDay);

  const dateLocale = language === 'ar' ? 'ar' : 'fr';
  const formattedDate = selectedDate.toLocaleDateString(dateLocale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  const relativeText =
    selectedDay === TODAY_DOW
      ? t('common.today')
      : selectedDay === (TODAY_DOW + 1) % 7
      ? t('common.tomorrow')
      : t('timetable.thisWeek');

  const s = styles(colors);

  if (isLoading) {
    return (
      <View style={[s.root, s.center]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={[s.root, s.center]}>
        <ErrorState onRetry={() => refetch()} />
      </View>
    );
  }

  const totalSessions = sessions.length;
  if (totalSessions === 0) {
    return (
      <View style={[s.root, s.center, { padding: 24 }]}>
        <Card style={{ alignItems: 'center', padding: 24, gap: 12, width: '100%' }}>
          <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: colors.success + '15', alignItems: 'center', justifyContent: 'center' }}>
            <Feather name="check" size={24} color={colors.success} />
          </View>
          <Text style={{ fontSize: 16, fontWeight: '700', color: colors.foreground, textAlign: 'center' }}>
            {language === 'ar' ? 'أسبوعك خالٍ تماماً' : 'Votre semaine est libre'}
          </Text>
          <Text style={{ fontSize: 13, color: colors.mutedForeground, textAlign: 'center', lineHeight: 18 }}>
            {language === 'ar'
              ? 'أسبوعك خالٍ تماماً. استمتع بوقتك أو راجع موادك الدراسية.'
              : 'Votre semaine est complètement libre. Profitez de votre temps ou révisez vos cours.'}
          </Text>
        </Card>
      </View>
    );
  }

  // Calculate upcoming 3 days list
  const upcomingOffsets = [1, 2, 3];
  const upcomingDays = upcomingOffsets.map((offset) => {
    const dayIdx = (selectedDay + offset) % 7;
    const dayDate = new Date(startOfWeek);
    dayDate.setDate(startOfWeek.getDate() + dayIdx);
    const daySessions = dayMap[dayIdx] ?? [];
    return { dayIdx, date: dayDate, sessions: daySessions };
  });

  return (
    <View style={s.root}>
      {/* Week day selector */}
      <View style={[s.weekRow, rowDir]}>
        {daysShort.map((label, i) => {
          const isActive = selectedDay === i;
          const isToday = i === TODAY_DOW;
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
                  backgroundColor: isActive ? colors.primary + '0D' : 'transparent',
                  borderColor: isActive ? colors.primary : 'transparent',
                },
              ]}
              onPress={() => setSelectedDay(i)}
            >
              <Text style={[s.dayAbbr, { color: isActive ? colors.primary : colors.mutedForeground }]}>
                {label}
              </Text>
              <Text style={[s.dayNum, { color: isActive ? colors.primary : isToday ? colors.primary : colors.foreground }]}>
                {dateNum}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
      >
        {/* Large Date Header */}
        <View style={s.headerArea}>
          <Text style={[s.dateHeader, align]}>{formattedDate}</Text>
          <Text style={[s.relativeHeader, { color: colors.primary }, align]}>{relativeText}</Text>
        </View>

        {/* Daily Schedule Timeline Area */}
        <View style={s.section}>
          {daySessions.length === 0 ? (
            <View style={s.freeCard}>
              <Feather name="check" size={16} color={colors.success} style={isRTL ? { marginLeft: 10 } : { marginRight: 10 }} />
              <View style={{ flex: 1 }}>
                <Text style={[s.freeTitle, align]}>
                  {language === 'ar' ? '✓ يوم شاغر' : '✓ Journée libre'}
                </Text>
                <Text style={[s.freeText, align]}>
                  {language === 'ar' ? 'لا توجد محاضرات مجدولة اليوم.' : 'Aucun cours programmé aujourd\'hui.'}
                </Text>
              </View>
            </View>
          ) : (
            daySessions.map((session, idx) => {
              const accent = SESSION_COLORS[idx % SESSION_COLORS.length];
              return (
                <View
                  key={session.id}
                  style={[
                    s.lectureCard,
                    {
                      borderLeftColor: accent,
                      borderLeftWidth: isRTL ? 0 : 3,
                      borderRightColor: accent,
                      borderRightWidth: isRTL ? 3 : 0,
                    },
                  ]}
                >
                  <View style={[s.lectureInner, rowDir]}>
                    <View style={s.timeBox}>
                      <Text style={s.timeText}>{String(session.startTime).slice(0, 5)}</Text>
                      <Text style={s.timeLabel}>{String(session.endTime).slice(0, 5)}</Text>
                    </View>
                    <View style={s.infoBox}>
                      <Text style={[s.lectureSubject, align]}>{session.courseName}</Text>
                      <Text style={[s.lectureMeta, align]}>
                        {session.professorName ? `${t('courses.professorPrefix')}${session.professorName}` : ''}
                        {session.room ? ` · ${t('timetable.room')} ${session.room}` : ''}
                        {` · ${typeLabel(session.type)}`}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* Upcoming Days Section */}
        <View style={s.section}>
          <Text style={[s.sectionTitle, align]}>
            {language === 'ar' ? 'نظرة على الأيام القادمة' : 'Upcoming Days'}
          </Text>

          {upcomingDays.map(({ dayIdx, date, sessions: nextSessions }) => {
            const dayName = date.toLocaleDateString(dateLocale, { weekday: 'long' });
            const dateStr = date.toLocaleDateString(dateLocale, { day: 'numeric', month: 'long' });
            const headerText = `${dayName} • ${dateStr}`;
            return (
              <View key={dayIdx} style={s.upcomingDayItem}>
                <View style={[s.upcomingDayHeader, rowDir]}>
                  <Text style={s.upcomingDayTitle}>{headerText}</Text>
                  <Text style={s.upcomingCountBadge}>
                    {nextSessions.length > 0
                      ? t('timetable.sessionsCount', { n: nextSessions.length })
                      : language === 'ar'
                      ? 'يوم شاغر'
                      : 'Libre'}
                  </Text>
                </View>
                {nextSessions.length === 0 ? (
                  <Text style={[s.upcomingFreeText, align]}>
                    {language === 'ar' ? 'لا توجد محاضرات' : 'Aucun cours'}
                  </Text>
                ) : (
                  nextSessions.map((session) => (
                    <View key={session.id} style={[s.upcomingLectureRow, rowDir]}>
                      <Text style={[s.upcomingLectureTime, align]}>
                        {String(session.startTime).slice(0, 5)}–{String(session.endTime).slice(0, 5)}
                      </Text>
                      <Text style={[s.upcomingLectureName, align]} numberOfLines={1}>
                        {session.courseName}
                      </Text>
                      {session.room && (
                        <Text style={s.upcomingLectureRoom}>
                          [{t('timetable.room')} {session.room}]
                        </Text>
                      )}
                    </View>
                  ))
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    center: { alignItems: 'center', justifyContent: 'center' },
    content: { paddingBottom: 120 },
    // Week day selector
    weekRow: {
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 16,
      justifyContent: 'space-between',
      backgroundColor: colors.card,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    dayCell: {
      width: 44,
      height: 54,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 10,
      borderWidth: 1,
      gap: 2,
    },
    dayAbbr: { fontSize: 10, fontWeight: '600' },
    dayNum: { fontSize: 14, fontWeight: '700' },
    // Header section
    headerArea: {
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 8,
    },
    dateHeader: {
      fontSize: 24,
      fontWeight: '700',
      color: colors.foreground,
    },
    relativeHeader: {
      fontSize: 14,
      color: colors.mutedForeground,
      marginTop: 2,
      fontWeight: '600',
    },
    // Sections
    section: {
      paddingHorizontal: 16,
      marginTop: 12,
    },
    sectionTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.foreground,
      marginTop: 12,
      marginBottom: 10,
    },
    // Lecture Card
    lectureCard: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 16,
      padding: 12,
      marginBottom: 8,
    },
    lectureInner: {
      alignItems: 'center',
      gap: 12,
    },
    timeBox: {
      width: 52,
      alignItems: 'center',
      justifyContent: 'center',
    },
    timeText: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.foreground,
    },
    timeLabel: {
      fontSize: 11,
      color: colors.mutedForeground,
      marginTop: 1,
    },
    infoBox: {
      flex: 1,
      justifyContent: 'center',
    },
    lectureSubject: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.foreground,
    },
    lectureMeta: {
      fontSize: 12,
      color: colors.mutedForeground,
      marginTop: 2,
    },
    // Free card
    freeCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 16,
      padding: 14,
    },
    freeTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.foreground,
    },
    freeText: {
      fontSize: 12,
      color: colors.mutedForeground,
      marginTop: 2,
    },
    // Upcoming Days
    upcomingDayItem: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 16,
      padding: 14,
      marginBottom: 10,
    },
    upcomingDayHeader: {
      justifyContent: 'space-between',
      alignItems: 'center',
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      paddingBottom: 8,
      marginBottom: 8,
    },
    upcomingDayTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.foreground,
    },
    upcomingCountBadge: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.primary,
    },
    upcomingLectureRow: {
      alignItems: 'center',
      gap: 8,
      paddingVertical: 4,
    },
    upcomingLectureTime: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.mutedForeground,
      width: 76,
    },
    upcomingLectureName: {
      fontSize: 12,
      color: colors.foreground,
      flex: 1,
    },
    upcomingLectureRoom: {
      fontSize: 11,
      color: colors.mutedForeground,
    },
    upcomingFreeText: {
      fontSize: 12,
      color: colors.mutedForeground,
      fontStyle: 'italic',
      paddingVertical: 4,
    },
  });
