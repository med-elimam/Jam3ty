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

function formatTime(t: string) {
  return t?.slice(0, 5) ?? '';
}

function daysUntil(dateStr: string, t: (key: string, vars?: Record<string, string | number>) => string) {
  const d = Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
  if (d === 0) return t('common.today');
  if (d === 1) return t('common.tomorrow');
  return `${d}${t('time.day')}`;
}

function SectionTitle({ title, icon }: { title: string; icon: React.ComponentProps<typeof Feather>['name'] }) {
  const colors = useColors();
  const { isRTL } = usePreferences();
  return (
    <View style={[s.sectionRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
      <Feather name={icon} size={18} color={colors.primary} style={isRTL ? { marginLeft: 8 } : { marginRight: 8 }} />
      <Text style={[s.sectionTitle, { color: colors.foreground }]}>{title}</Text>
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
  const { t, isRTL } = usePreferences();
  const { user } = useAuth();
  const { data, isLoading, isError, refetch, isRefetching } = useGetDashboardHome();

  const d: DashboardHome | undefined = data?.data;
  const firstName = (user?.fullName ?? d?.student?.fullName ?? t('home.studentFallback')).split(' ')[0];
  const align = { textAlign: isRTL ? 'right' : 'left' } as const;
  const rowDir = { flexDirection: isRTL ? 'row-reverse' : 'row' } as const;
  const forwardChevron = isRTL ? 'chevron-left' : 'chevron-right';

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
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={s.content}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
    >
      {/* ── White Premium Header ── */}
      <View style={[s.header, { backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border }]}>
        <View style={[s.headerTop, rowDir]}>
          <View style={[s.userInfo, rowDir]}>
            <Avatar name={user?.fullName ?? d?.student?.fullName ?? ''} size={42} />
            <View style={[s.userText, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
              <Text style={s.heroGreet}>{t('home.greeting')} 👋</Text>
              <Text style={[s.heroName, { color: colors.foreground }]}>{firstName}</Text>
            </View>
          </View>
          
          <View style={[s.headerActions, rowDir]}>
            {/* Subscription status pill */}
            {d?.subscription ? (
              <View style={[s.subPillHeader, { backgroundColor: 'rgba(16, 185, 129, 0.08)' }]}>
                <Feather name="check-circle" size={12} color={colors.success} />
                <Text style={[s.subPillTextHeader, { color: colors.success }]}>
                  {d.subscription.planName}
                </Text>
              </View>
            ) : (
              <TouchableOpacity
                style={[s.subPillHeader, { backgroundColor: 'rgba(79, 70, 229, 0.08)' }]}
                onPress={() => router.push('/subscription')}
              >
                <Feather name="star" size={12} color={colors.primary} />
                <Text style={[s.subPillTextHeader, { color: colors.primary }]}>
                  {t('home.upgradeFull')}
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={() => router.push('/notifications')}
              style={[s.notifBtn, { backgroundColor: colors.muted }]}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Feather name="bell" size={20} color={colors.foreground} />
              {(d?.unreadNotificationsCount ?? 0) > 0 && (
                <View style={[s.notifBadge, { backgroundColor: colors.destructive }]}>
                  <Text style={s.notifBadgeText}>{d?.unreadNotificationsCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* ── Today's Sessions ── */}
      <View style={s.section}>
        <SectionTitle title={t('home.todayLectures')} icon="calendar" />
        {(d?.todaysSessions ?? []).length === 0 ? (
          <EmptyState
            icon="calendar"
            title={t('home.noLecturesToday')}
            body={t('home.noLecturesTodayBody')}
          />
        ) : (
          (d?.todaysSessions ?? []).slice(0, 4).map((session) => (
            <Card key={session.id} accent={colors.primary} style={s.sessionCard}>
              <View style={[s.sessionInner, rowDir]}>
                <View style={[s.timePill, { backgroundColor: colors.muted }]}>
                  <Text style={[s.timeText, { color: colors.primary }]}>{formatTime(session.startTime)}</Text>
                  <Text style={[s.timeEnd, { color: colors.mutedForeground }]}>{formatTime(session.endTime)}</Text>
                </View>
                <View style={s.sessionBody}>
                  <Text style={[s.sessionName, { color: colors.foreground }, align]} numberOfLines={2}>
                    {session.courseName}
                  </Text>
                  {session.room && (
                    <Text style={[s.sessionMeta, { color: colors.mutedForeground }, align]}>
                      {t('home.room')} {session.room}
                    </Text>
                  )}
                </View>
              </View>
            </Card>
          ))
        )}
      </View>

      {/* ── Announcements ── */}
      <View style={s.section}>
        <SectionTitle title={t('home.announcements')} icon="bell" />
        {(d?.latestAnnouncements ?? []).length === 0 ? (
          <EmptyState
            icon="bell"
            title={t('home.noAnnouncements')}
            body={t('home.noAnnouncementsBody')}
          />
        ) : (
          (d?.latestAnnouncements ?? []).slice(0, 3).map((a) => (
            <Card
              key={a.id}
              onPress={() => router.push('/announcements')}
              style={s.annoCard}
              accent={!a.isRead ? colors.primary : undefined}
            >
              <View style={[s.annoTop, rowDir]}>
                {!a.isRead && <View style={[s.unreadDot, { backgroundColor: colors.primary }]} />}
                {a.priority !== 'normal' && (
                  <Badge
                    label={t(`priority.${a.priority}`)}
                    color={a.priority === 'urgent' ? 'danger' : 'warning'}
                  />
                )}
                <Text style={[s.annoTime, { color: colors.mutedForeground }, isRTL ? { marginRight: 'auto' } : { marginLeft: 'auto' }]}>
                  {a.createdByName}
                </Text>
              </View>
              <Text style={[s.annoTitle, { color: colors.foreground }, align]} numberOfLines={2}>
                {a.title}
              </Text>
            </Card>
          ))
        )}
      </View>

      {/* ── Upcoming Assignments ── */}
      {(d?.upcomingAssignments ?? []).length > 0 && (
        <View style={s.section}>
          <SectionTitle title={t('home.upcomingAssignments')} icon="clipboard" />
          {(d?.upcomingAssignments ?? []).slice(0, 3).map((a) => (
            <Card
              key={a.id}
              onPress={() => router.push('/assignments')}
              style={s.rowCard}
            >
              <View style={[s.rowInner, rowDir]}>
                <Badge label={daysUntil(a.deadline, t)} color="warning" />
                <View style={s.rowBody}>
                  <Text style={[s.rowTitle, { color: colors.foreground }, align]} numberOfLines={1}>
                    {a.title}
                  </Text>
                  <Text style={[s.rowMeta, { color: colors.mutedForeground }, align]}>
                    {a.courseName}
                  </Text>
                </View>
              </View>
            </Card>
          ))}
        </View>
      )}

      {/* ── Upcoming Exams ── */}
      {(d?.upcomingExams ?? []).length > 0 && (
        <View style={s.section}>
          <SectionTitle title={t('home.upcomingExams')} icon="bar-chart-2" />
          {(d?.upcomingExams ?? []).slice(0, 2).map((e) => (
            <Card
              key={e.id}
              onPress={() => router.push('/exams')}
              accent={colors.primary}
              style={s.rowCard}
            >
              <Text style={[s.rowTitle, { color: colors.foreground }, align]}>{e.title}</Text>
              <Text style={[s.rowMeta, { color: colors.mutedForeground }, align]}>
                {e.courseName} · {e.date}
              </Text>
            </Card>
          ))}
        </View>
      )}

      {/* ── More CTA ── */}
      <TouchableOpacity
        style={[s.moreCta, { borderColor: colors.primary }]}
        activeOpacity={0.75}
        onPress={() => router.push('/more')}
      >
        <Feather name="grid" size={18} color={colors.primary} />
        <Text style={[s.moreCtaText, { color: colors.primary }]}>{t('home.allModules')}</Text>
        <Feather name={forwardChevron} size={18} color={colors.primary} />
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  content: { paddingBottom: 110 },

  // Header
  header: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
    boxShadow: '0 4px 20px rgba(15,23,42,0.02)',
  },
  headerTop: {
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  userInfo: {
    alignItems: 'center',
    gap: 12,
  },
  userText: {
    justifyContent: 'center',
  },
  heroGreet: {
    fontSize: fontSize.xs + 1,
    fontWeight: fontWeight.medium,
  },
  heroName: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    marginTop: 2,
  },
  headerActions: {
    alignItems: 'center',
    gap: 10,
  },
  subPillHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  subPillTextHeader: {
    fontSize: 11,
    fontWeight: fontWeight.bold,
  },
  notifBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  notifBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFF',
  },
  notifBadgeText: {
    fontSize: 8,
    fontWeight: fontWeight.bold,
    color: '#FFF',
  },

  // Sections
  section: { paddingHorizontal: spacing.base, marginTop: spacing.xl, gap: spacing.sm },
  sectionRow: { alignItems: 'center', gap: spacing.xs, marginBottom: spacing.xs },
  sectionTitle: { fontSize: fontSize.lg - 1, fontWeight: fontWeight.bold },

  // Session card
  sessionCard: { marginBottom: 0 },
  sessionInner: { alignItems: 'center', gap: spacing.md },
  timePill: { paddingHorizontal: spacing.sm, paddingVertical: spacing.sm, borderRadius: radius.sm, alignItems: 'center', minWidth: 54 },
  timeText: { fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  timeEnd: { fontSize: 10, marginTop: 1 },
  sessionBody: { flex: 1 },
  sessionName: { fontSize: fontSize.md, fontWeight: fontWeight.semibold },
  sessionMeta: { fontSize: fontSize.sm, marginTop: 2 },

  // Announcement card
  annoCard: { gap: spacing.xs },
  annoTop: { alignItems: 'center', gap: spacing.sm },
  unreadDot: { width: 7, height: 7, borderRadius: 4 },
  annoTime: { fontSize: fontSize.xs },
  annoTitle: { fontSize: fontSize.md, fontWeight: fontWeight.semibold },

  // Row card (assignments / exams)
  rowCard: {},
  rowInner: { alignItems: 'center', gap: spacing.sm },
  rowBody: { flex: 1 },
  rowTitle: { fontSize: fontSize.md, fontWeight: fontWeight.semibold },
  rowMeta: { fontSize: fontSize.sm, marginTop: 2 },

  // More CTA
  moreCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    margin: spacing.base,
    marginTop: spacing['2xl'],
    borderWidth: 1,
    borderRadius: 14,
    borderCurve: 'continuous',
    paddingVertical: spacing.base - 2,
  },
  moreCtaText: { fontSize: fontSize.md, fontWeight: fontWeight.bold },
});
