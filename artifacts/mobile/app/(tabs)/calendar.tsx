import React, { useState, useEffect } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { usePreferences } from '@/contexts/PreferencesContext';
import { useGetTimetable } from '@workspace/api-client-react';
import { ErrorState } from '@/components/ui/ErrorState';
import { GuestGate } from '@/components/GuestGate';
import { Card } from '@/components/ui/Card';
import { Feather } from '@expo/vector-icons';

const SESSION_COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#6366F1', '#64748B'];
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
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showMonthView, setShowMonthView] = useState(false);
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

  const selectedDay = selectedDate.getDay();
  const daySessions = dayMap[selectedDay] ?? [];

  const typeLabel = (type: string) => {
    const key = ['lecture', 'td', 'tp', 'other'].includes(type) ? type : 'other';
    return t(`timetable.${key}`);
  };

  // Sync focus month/year when selectedDate changes
  const [focusMonth, setFocusMonth] = useState(selectedDate.getMonth());
  const [focusYear, setFocusYear] = useState(selectedDate.getFullYear());

  useEffect(() => {
    setFocusMonth(selectedDate.getMonth());
    setFocusYear(selectedDate.getFullYear());
  }, [selectedDate]);

  // Build start of week relative to selectedDate
  const startOfSelectedWeek = new Date(selectedDate);
  startOfSelectedWeek.setDate(selectedDate.getDate() - selectedDate.getDay());

  const dateLocale = language === 'ar' ? 'ar' : 'fr';
  const formattedDate = selectedDate.toLocaleDateString(dateLocale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  const isTodayDate = selectedDate.toDateString() === new Date().toDateString();
  const isTomorrowDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return selectedDate.toDateString() === tomorrow.toDateString();
  };

  const relativeText = isTodayDate
    ? t('common.today')
    : isTomorrowDate()
    ? t('common.tomorrow')
    : t('timetable.thisWeek');

  const monthYearTitle = selectedDate.toLocaleDateString(dateLocale, {
    month: 'long',
    year: 'numeric',
  });

  const focusMonthDate = new Date(focusYear, focusMonth, 1);
  const focusMonthTitle = focusMonthDate.toLocaleDateString(dateLocale, {
    month: 'long',
    year: 'numeric',
  });

  const s = styles(colors, isRTL);

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

  // Calculate upcoming 5 days relative to selectedDate
  const upcomingOffsets = [1, 2, 3, 4, 5];
  const upcomingDays = upcomingOffsets.map((offset) => {
    const nextDate = new Date(selectedDate);
    nextDate.setDate(selectedDate.getDate() + offset);
    const daySessions = dayMap[nextDate.getDay()] ?? [];
    return { date: nextDate, sessions: daySessions };
  });

  // Monthly calendar calculation helpers
  const prevMonth = () => {
    if (focusMonth === 0) {
      setFocusMonth(11);
      setFocusYear((y) => y - 1);
    } else {
      setFocusMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (focusMonth === 11) {
      setFocusMonth(0);
      setFocusYear((y) => y + 1);
    } else {
      setFocusMonth((m) => m + 1);
    }
  };

  const firstDay = new Date(focusYear, focusMonth, 1).getDay();
  const daysInM = new Date(focusYear, focusMonth + 1, 0).getDate();
  const slots: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) {
    slots.push(null);
  }
  for (let d = 1; d <= daysInM; d++) {
    slots.push(d);
  }

  const weekHeaders = language === 'ar'
    ? ['ح', 'ن', 'ث', 'ر', 'خ', 'ج', 'س']
    : ['Di', 'Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa'];

  return (
    <View style={s.root}>
      {/* Week day selector */}
      <View style={[s.weekRow, rowDir]}>
        {daysShort.map((label, i) => {
          const dayDate = new Date(startOfSelectedWeek);
          dayDate.setDate(startOfSelectedWeek.getDate() + i);
          const dateNum = dayDate.getDate();
          const isActive = selectedDate.getDate() === dateNum && selectedDate.getMonth() === dayDate.getMonth();
          const isToday = dayDate.toDateString() === new Date().toDateString();

          return (
            <TouchableOpacity
              key={i}
              activeOpacity={0.75}
              style={[
                s.dayCell,
                isActive && { backgroundColor: colors.primary },
              ]}
              onPress={() => setSelectedDate(dayDate)}
            >
              <Text style={[s.dayAbbr, { color: isActive ? '#fff' : colors.mutedForeground }]}>
                {label}
              </Text>
              <Text style={[s.dayNum, { color: isActive ? '#fff' : isToday ? colors.primary : colors.foreground }]}>
                {dateNum}
              </Text>
              {isActive && <View style={s.activeDot} />}
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
      >
        {/* Large Date Header & Month Picker Trigger */}
        <View style={[s.headerArea, rowDir]}>
          {/* Right side (RTL): Date info */}
          <View style={{ flex: 1 }}>
            <Text style={[s.dateHeader, align]}>{formattedDate}</Text>
            <Text style={[s.relativeHeader, align]}>{relativeText}</Text>
          </View>

          {/* Left side (RTL): Month toggle button */}
          <TouchableOpacity
            onPress={() => setShowMonthView(true)}
            style={[rowDir, s.monthToggleBtn]}
          >
            <Feather name="chevron-down" size={14} color={colors.foreground} />
            <Text style={[s.monthToggleText, { color: colors.foreground }]}>{monthYearTitle}</Text>
          </TouchableOpacity>
        </View>

        {/* Daily Schedule Timeline Area */}
        <View style={s.section}>
          {daySessions.length === 0 ? (
            <View style={[s.freeCard, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              {/* Text side */}
              <View style={{ flex: 1 }}>
                <Text style={[s.freeTitle, align]}>
                  {language === 'ar' ? 'يوم شاغر' : 'Journée libre'}
                </Text>
                <Text style={[s.freeText, align]}>
                  {language === 'ar' ? 'لا توجد محاضرات مجدولة اليوم.' : 'Aucun cours programmé aujourd\'hui.'}
                </Text>
              </View>

              {/* Green circle icon side */}
              <View style={[s.freeIconBg, { backgroundColor: '#E8F8F5' }]}>
                <Feather name="refresh-cw" size={18} color="#10B981" />
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
            {language === 'ar' ? 'الأيام القادمة' : 'Upcoming Days'}
          </Text>

          <Card style={s.upcomingCard}>
            {upcomingDays.map(({ date, sessions: nextSessions }, idx) => {
              const dayName = date.toLocaleDateString(dateLocale, { weekday: 'long' });
              const dateStr = date.toLocaleDateString(dateLocale, { day: 'numeric', month: 'long' });
              const hasSessions = nextSessions.length > 0;
              const accent = SESSION_COLORS[idx % SESSION_COLORS.length];

              return (
                <TouchableOpacity
                  key={idx}
                  activeOpacity={0.7}
                  onPress={() => setSelectedDate(date)}
                  style={[
                    rowDir,
                    s.upcomingRow,
                    idx < upcomingDays.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
                  ]}
                >
                  {/* Right Column (RTL): Day & Date */}
                  <View style={s.upcomingRightCol}>
                    <Text style={[s.upcomingDayName, align]}>{dayName}</Text>
                    <Text style={[s.upcomingDateText, align]}>{dateStr}</Text>
                  </View>

                  {/* Center Column: Colored Indicator + Course Lists */}
                  <View style={s.upcomingCenterCol}>
                    {nextSessions.length === 0 ? (
                      <Text style={[s.upcomingFreeText, align]}>
                        {language === 'ar' ? 'لا توجد محاضرات.' : 'Aucun cours.'}
                      </Text>
                    ) : (
                      nextSessions.map((session, sidx) => (
                        <View key={session.id} style={[rowDir, s.upcomingLectureRow, sidx > 0 && { marginTop: 4 }]}>
                          <Text style={s.upcomingLectureTime}>
                            {String(session.startTime).slice(0, 5)} - {String(session.endTime).slice(0, 5)}
                          </Text>
                          <View style={[s.verticalIndicator, { backgroundColor: accent }]} />
                          <Text style={[s.upcomingLectureName, align]} numberOfLines={1}>
                            {session.courseName}
                          </Text>
                        </View>
                      ))
                    )}
                  </View>

                  {/* Left Column (RTL): Count tag & chevron */}
                  <View style={[rowDir, s.upcomingLeftCol]}>
                    <Text style={[s.upcomingCountBadge, { color: hasSessions ? '#5C52E5' : colors.mutedForeground }]}>
                      {nextSessions.length > 0
                        ? t('timetable.sessionsCount', { n: nextSessions.length })
                        : language === 'ar'
                        ? 'يوم شاغر'
                        : 'Libre'}
                    </Text>
                    <Feather name={isRTL ? 'chevron-left' : 'chevron-right'} size={16} color={colors.mutedForeground} />
                  </View>
                </TouchableOpacity>
              );
            })}
          </Card>
        </View>
      </ScrollView>

      {/* Month Calendar Bottom Sheet overlay */}
      {showMonthView && (
        <>
          <TouchableOpacity
            style={s.backdrop}
            activeOpacity={1}
            onPress={() => setShowMonthView(false)}
          />
          <View style={s.bottomSheet}>
            <View style={s.grabHandle} />
            <View style={[rowDir, s.sheetHeader]}>
              <TouchableOpacity onPress={prevMonth}>
                <Feather name={isRTL ? 'chevron-right' : 'chevron-left'} size={20} color={colors.primary} />
              </TouchableOpacity>
              <Text style={s.sheetTitle}>{focusMonthTitle}</Text>
              <TouchableOpacity onPress={nextMonth}>
                <Feather name={isRTL ? 'chevron-left' : 'chevron-right'} size={20} color={colors.primary} />
              </TouchableOpacity>
            </View>

            <View style={s.monthGrid}>
              {weekHeaders.map((h, idx) => (
                <Text key={idx} style={s.monthHeaderCell}>{h}</Text>
              ))}
              {slots.map((dayNum, idx) => {
                if (dayNum === null) {
                  return <View key={idx} style={s.monthDayCell} />;
                }
                const targetDate = new Date(focusYear, focusMonth, dayNum);
                const isSelected =
                  selectedDate.getDate() === dayNum &&
                  selectedDate.getMonth() === focusMonth &&
                  selectedDate.getFullYear() === focusYear;
                const isToday =
                  new Date().getDate() === dayNum &&
                  new Date().getMonth() === focusMonth &&
                  new Date().getFullYear() === focusYear;

                // Mark days with lectures
                const dayOfWeek = targetDate.getDay();
                const hasSessions = (dayMap[dayOfWeek]?.length ?? 0) > 0;

                return (
                  <TouchableOpacity
                    key={idx}
                    style={[
                      s.monthDayCell,
                      isSelected && { backgroundColor: '#4F46E5' },
                    ]}
                    onPress={() => {
                      setSelectedDate(targetDate);
                      setShowMonthView(false);
                    }}
                  >
                    <Text
                      style={[
                        s.monthDayText,
                        { color: isSelected ? '#fff' : isToday ? colors.primary : colors.foreground },
                        isToday && !isSelected && { fontWeight: '700' },
                      ]}
                    >
                      {dayNum}
                    </Text>
                    {hasSessions && !isSelected && (
                      <View style={s.dotUnderDay} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </>
      )}
    </View>
  );
}

const styles = (colors: ReturnType<typeof useColors>, isRTL: boolean) =>
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
      height: 58,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 14,
      borderWidth: 0,
      paddingVertical: 8,
    },
    dayAbbr: { fontSize: 10, fontWeight: '600', marginBottom: 2 },
    dayNum: { fontSize: 15, fontWeight: '700' },
    activeDot: {
      width: 3,
      height: 3,
      borderRadius: 1.5,
      backgroundColor: '#fff',
      marginTop: 2,
    },
    // Header section
    headerArea: {
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 8,
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    dateHeader: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.foreground,
    },
    relativeHeader: {
      fontSize: 12,
      color: '#5C52E5',
      marginTop: 2,
      fontWeight: '700',
    },
    monthToggleBtn: {
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 10,
      backgroundColor: colors.card,
      gap: 6,
    },
    monthToggleText: {
      fontSize: 12,
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
      alignItems: 'center',
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 16,
      padding: 16,
      gap: 16,
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
    freeIconBg: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
    },
    // Upcoming card layout
    upcomingCard: {
      padding: 0,
      overflow: 'hidden',
    },
    upcomingRow: {
      alignItems: 'center',
      paddingVertical: 14,
      paddingHorizontal: 14,
    },
    upcomingRightCol: {
      width: 70,
    },
    upcomingDayName: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.foreground,
    },
    upcomingDateText: {
      fontSize: 11,
      color: colors.mutedForeground,
      marginTop: 2,
    },
    upcomingCenterCol: {
      flex: 1,
      paddingHorizontal: 8,
    },
    upcomingFreeText: {
      fontSize: 12,
      color: colors.mutedForeground,
    },
    upcomingLectureRow: {
      alignItems: 'center',
    },
    upcomingLectureTime: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.mutedForeground,
      width: 72,
    },
    verticalIndicator: {
      width: 2,
      height: 12,
      marginHorizontal: 8,
    },
    upcomingLectureName: {
      fontSize: 12,
      color: colors.foreground,
      fontWeight: '500',
      flex: 1,
    },
    upcomingLeftCol: {
      alignItems: 'center',
      gap: 6,
    },
    upcomingCountBadge: {
      fontSize: 11,
      fontWeight: '600',
    },
    // Month picker Sheet Overlay
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0, 0, 0, 0.4)',
      zIndex: 999,
    },
    bottomSheet: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: colors.card,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingBottom: 40,
      paddingHorizontal: 16,
      paddingTop: 8,
      zIndex: 1000,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.1,
      shadowRadius: 10,
      elevation: 20,
    },
    grabHandle: {
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
      alignSelf: 'center',
      marginBottom: 16,
    },
    sheetHeader: {
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
      paddingHorizontal: 8,
    },
    sheetTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.foreground,
    },
    monthGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    monthHeaderCell: {
      width: '14.28%',
      textAlign: 'center',
      fontSize: 12,
      fontWeight: '600',
      color: colors.mutedForeground,
      paddingVertical: 6,
    },
    monthDayCell: {
      width: '14.28%',
      height: 38,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 19,
      marginVertical: 2,
    },
    monthDayText: {
      fontSize: 13,
      fontWeight: '500',
    },
    dotUnderDay: {
      width: 3,
      height: 3,
      borderRadius: 1.5,
      backgroundColor: colors.primary,
      marginTop: 2,
    },
  });
