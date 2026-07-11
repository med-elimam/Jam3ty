import React from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { usePreferences } from '@/contexts/PreferencesContext';
import { useAuth } from '@/contexts/AuthContext';
import { useGetDashboardHome, DashboardHome } from '@workspace/api-client-react';
import { Feather } from '@expo/vector-icons';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { GuestHome } from '@/components/GuestHome';
import { spacing, fontSize, fontWeight, radius, shadow } from '@/constants/theme';
import { Avatar } from '@/components/ui/Avatar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function formatTime(t: string) {
  return t?.slice(0, 5) ?? '';
}

function daysUntil(dateStr: string, t: (key: string, vars?: Record<string, string | number>) => string) {
  const d = Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
  if (d === 0) return t('common.today');
  if (d === 1) return t('common.tomorrow');
  return `${d}${t('time.day')}`;
}

function SectionTitle({ title }: { title: string; icon?: React.ComponentProps<typeof Feather>['name'] }) {
  const colors = useColors();
  const { isRTL } = usePreferences();
  return (
    <View style={[s.sectionRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
      <Text
        style={[
          s.sectionTitle,
          { color: colors.mutedForeground },
          isRTL ? { textTransform: 'none', letterSpacing: 0 } : undefined
        ]}
      >
        {title}
      </Text>
    </View>
  );
}

export default function HomeScreen() {
  const { isGuest } = useAuth();
  if (isGuest) return <GuestHome />;
  return <HomeScreenInner />;
}

function HomeScreenInner() {
  const colors = useColors();
  const router = useRouter();
  const { t, isRTL, language } = usePreferences();
  const { user } = useAuth();
  const { data, isLoading, isError, refetch, isRefetching } = useGetDashboardHome();
  const insets = useSafeAreaInsets();

  const d: DashboardHome | undefined = data?.data;
  const firstName = (user?.fullName ?? d?.student?.fullName ?? t('home.studentFallback')).split(' ')[0];
  const align = { textAlign: isRTL ? 'right' : 'left' } as const;
  const rowDir = { flexDirection: isRTL ? 'row-reverse' : 'row' } as const;
  const forwardChevron = isRTL ? 'chevron-left' : 'chevron-right';

  // Format dynamic localized date
  const dateLocale = language === 'ar' ? 'ar' : 'fr';
  const currentDate = new Date().toLocaleDateString(dateLocale, { weekday: 'long', day: 'numeric', month: 'long' });
  const greetingText = t('home.greeting');
  const greetingSubtext = `${greetingText}, ${firstName}`;

  const nextSession = (d?.todaysSessions ?? []).find(s => {
    // Return first lecture that finishes in future, or fallback to first session
    const endHour = parseInt(s.endTime.slice(0, 2));
    const nowHour = new Date().getHours();
    return endHour > nowHour;
  }) ?? (d?.todaysSessions ?? [])[0];

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center' }}>
        <ErrorState onRetry={() => refetch()} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* ── Compact Apple Header ── */}
      <View style={[s.header, rowDir, { backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border, paddingTop: insets.top, height: 56 + insets.top }]}>
        <Text style={[s.headerTitle, { color: colors.foreground }]}>{t('brand.appName')}</Text>
        <View style={[s.headerActions, rowDir]}>
          <TouchableOpacity
            onPress={() => router.push('/notifications')}
            style={[s.notifBtn, { backgroundColor: colors.muted }]}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Feather name="bell" size={18} color={colors.foreground} />
            {(d?.unreadNotificationsCount ?? 0) > 0 && (
              <View style={[s.notifBadge, { backgroundColor: colors.destructive }]}>
                <Text style={s.notifBadgeText}>{d?.unreadNotificationsCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/settings')} style={{ marginLeft: spacing.sm, marginRight: spacing.sm }}>
            <Avatar name={user?.fullName ?? d?.student?.fullName ?? ''} size={30} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.content}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
      >
        {/* ── Hero Date & Greeting Section ── */}
        <View style={[s.heroSection, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
          <Text style={[s.heroDate, { color: colors.mutedForeground }, align]}>{currentDate}</Text>
          <Text style={[s.heroGreeting, { color: colors.foreground }, align]}>{greetingSubtext}</Text>
        </View>

        {/* ── Next Lecture Widget ── */}
        {nextSession && (
          <View style={s.section}>
            <SectionTitle title={isRTL ? 'المحاضرة القادمة' : 'Next Lecture'} icon="play" />
            <Card padding={12} style={s.nextLectureCard}>
              <View style={[s.nextLectureInner, rowDir]}>
                <View style={[s.nextTimeBox, { backgroundColor: colors.primary + '0D' }]}>
                  <Text style={[s.nextTimeText, { color: colors.primary }]}>{formatTime(nextSession.startTime)}</Text>
                </View>
                <View style={s.nextLectureBody}>
                  <Text style={[s.nextLectureName, { color: colors.foreground }, align]} numberOfLines={1}>{nextSession.courseName}</Text>
                  <Text style={[s.nextLectureMeta, { color: colors.mutedForeground }, align]}>
                    {nextSession.room ? `${t('timetable.room')} ${nextSession.room}` : ''}
                    {nextSession.room && nextSession.type ? ' · ' : ''}
                    {nextSession.type ? t(`sessionTypes.${nextSession.type}`) || nextSession.type : ''}
                  </Text>
                </View>
              </View>
            </Card>
          </View>
        )}

        {/* ── Today's Schedule ── */}
        <View style={s.section}>
          <SectionTitle title={t('home.todayLectures')} icon="calendar" />
          {(d?.todaysSessions ?? []).length === 0 ? (
            <Card style={s.fallbackCard}>
              <Text style={[s.fallbackText, { color: colors.mutedForeground }, align]}>
                {isRTL ? 'جدولك خالٍ اليوم' : 'Your schedule is empty today'}
              </Text>
            </Card>
          ) : (
            <Card padding={0} style={s.scheduleListCard}>
              {(d?.todaysSessions ?? []).map((session, index) => (
                <View
                  key={session.id}
                  style={[
                    s.scheduleRow,
                    rowDir,
                    index > 0 && { borderTopWidth: 1, borderTopColor: colors.border }
                  ]}
                >
                  <View style={[s.scheduleTime, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
                    <Text style={[s.scheduleTimeText, { color: colors.foreground }]}>{formatTime(session.startTime)}</Text>
                    <Text style={[s.scheduleTimeEnd, { color: colors.mutedForeground }]}>{formatTime(session.endTime)}</Text>
                  </View>
                  <View style={s.scheduleBody}>
                    <Text style={[s.scheduleName, { color: colors.foreground }, align]} numberOfLines={1}>{session.courseName}</Text>
                    <Text style={[s.scheduleMeta, { color: colors.mutedForeground }, align]}>
                      {session.room ? `${t('timetable.room')} ${session.room}` : ''}
                    </Text>
                  </View>
                </View>
              ))}
            </Card>
          )}
        </View>

        {/* ── Recent Files Widget ── */}
        {d?.recentFiles && d.recentFiles.length > 0 && (
          <View style={s.section}>
            <SectionTitle title={isRTL ? 'الملفات الأخيرة' : 'Recent Files'} icon="file-text" />
            <Card padding={0} style={s.filesListCard}>
              {d.recentFiles.slice(0, 3).map((file, index) => (
                <TouchableOpacity
                  key={file.id}
                  style={[
                    s.fileRow,
                    rowDir,
                    index > 0 && { borderTopWidth: 1, borderTopColor: colors.border }
                  ]}
                  activeOpacity={0.7}
                  onPress={() => router.push('/files')}
                >
                  <Feather name="file-text" size={18} color={colors.mutedForeground} style={isRTL ? { marginLeft: 10 } : { marginRight: 10 }} />
                  <View style={s.fileBody}>
                    <Text style={[s.fileName, { color: colors.foreground }, align]} numberOfLines={1}>{file.title}</Text>
                    <Text style={[s.fileMeta, { color: colors.mutedForeground }, align]}>{t(`fileTypes.${file.fileType}`) || file.fileType}</Text>
                  </View>
                  <Feather name={forwardChevron} size={14} color={colors.mutedForeground} />
                </TouchableOpacity>
              ))}
            </Card>
          </View>
        )}

        {/* ── Latest Announcements ── */}
        {d?.latestAnnouncements && d.latestAnnouncements.length > 0 && (
          <View style={s.section}>
            <SectionTitle title={t('home.announcements')} icon="bell" />
            <Card padding={0} style={s.announcementsListCard}>
              {d.latestAnnouncements.slice(0, 3).map((a, index) => (
                <TouchableOpacity
                  key={a.id}
                  style={[
                    s.annoRow,
                    index > 0 && { borderTopWidth: 1, borderTopColor: colors.border }
                  ]}
                  activeOpacity={0.7}
                  onPress={() => router.push('/announcements')}
                >
                  <View style={[s.annoHeader, rowDir]}>
                    {!a.isRead && <View style={[s.unreadDot, { backgroundColor: colors.primary }]} />}
                    {a.priority !== 'normal' && (
                      <Badge label={t(`priority.${a.priority}`)} color={a.priority === 'urgent' ? 'danger' : 'warning'} />
                    )}
                    <Text style={[s.annoAuthor, { color: colors.mutedForeground }, isRTL ? { marginRight: 'auto' } : { marginLeft: 'auto' }]}>
                      {a.createdByName}
                    </Text>
                  </View>
                  <Text style={[s.annoTitleText, { color: colors.foreground }, align]} numberOfLines={1}>{a.title}</Text>
                </TouchableOpacity>
              ))}
            </Card>
          </View>
        )}

        {/* ── More CTA ── */}
        <TouchableOpacity
          style={[s.moreCta, { borderColor: colors.border, backgroundColor: colors.card }]}
          activeOpacity={0.75}
          onPress={() => router.push('/more')}
        >
          <Feather name="grid" size={16} color={colors.primary} />
          <Text style={[s.moreCtaText, { color: colors.foreground }]}>{t('home.allModules')}</Text>
          <Feather name={forwardChevron} size={16} color={colors.mutedForeground} />
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  header: {
    height: 56,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: fontWeight.bold,
  },
  headerActions: {
    alignItems: 'center',
  },
  notifBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  notifBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FFF',
  },
  notifBadgeText: {
    fontSize: 7,
    fontWeight: fontWeight.bold,
    color: '#FFF',
  },
  content: {
    paddingBottom: 100,
  },
  heroSection: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.lg,
    gap: 2,
  },
  heroDate: {
    fontSize: 22,
    fontWeight: fontWeight.bold,
  },
  heroGreeting: {
    fontSize: 13,
    fontWeight: fontWeight.medium,
  },
  section: {
    paddingHorizontal: spacing.base,
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  sectionRow: {
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: fontWeight.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  nextLectureCard: {},
  nextLectureInner: {
    alignItems: 'center',
    gap: spacing.md,
  },
  nextTimeBox: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextTimeText: {
    fontSize: 14,
    fontWeight: fontWeight.bold,
  },
  nextLectureBody: {
    flex: 1,
    gap: 2,
  },
  nextLectureName: {
    fontSize: 15,
    fontWeight: fontWeight.semibold,
  },
  nextLectureMeta: {
    fontSize: 12,
  },
  fallbackCard: {
    alignItems: 'center',
    paddingVertical: 18,
  },
  fallbackText: {
    fontSize: 13,
  },
  scheduleListCard: {
    overflow: 'hidden',
  },
  scheduleRow: {
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    minHeight: 56,
  },
  scheduleTime: {
    gap: 2,
    minWidth: 48,
  },
  scheduleTimeText: {
    fontSize: 13,
    fontWeight: fontWeight.bold,
  },
  scheduleTimeEnd: {
    fontSize: 10,
  },
  scheduleBody: {
    flex: 1,
    gap: 2,
  },
  scheduleName: {
    fontSize: 14,
    fontWeight: fontWeight.semibold,
  },
  scheduleMeta: {
    fontSize: 11,
  },
  filesListCard: {
    overflow: 'hidden',
  },
  fileRow: {
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    minHeight: 48,
  },
  fileBody: {
    flex: 1,
    gap: 2,
  },
  fileName: {
    fontSize: 14,
    fontWeight: fontWeight.semibold,
  },
  fileMeta: {
    fontSize: 11,
  },
  announcementsListCard: {
    overflow: 'hidden',
  },
  annoRow: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    gap: 4,
  },
  annoHeader: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  unreadDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  annoAuthor: {
    fontSize: 11,
  },
  annoTitleText: {
    fontSize: 14,
    fontWeight: fontWeight.semibold,
  },
  moreCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    margin: spacing.base,
    marginTop: spacing.xl,
    borderWidth: 1,
    borderRadius: 12,
    borderCurve: 'continuous',
    paddingVertical: spacing.md,
  },
  moreCtaText: {
    fontSize: 14,
    fontWeight: fontWeight.bold,
  },
});
