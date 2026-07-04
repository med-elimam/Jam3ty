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
import { useGetDashboardHome } from '@workspace/api-client-react';
import { Feather } from '@expo/vector-icons';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { spacing, fontSize, fontWeight, radius } from '@/constants/theme';

function formatTime(t: string) {
  return t?.slice(0, 5) ?? '';
}

function daysUntil(dateStr: string, t: (key: string, vars?: Record<string, any>) => string) {
  const d = Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
  if (d === 0) return t('common.today');
  if (d === 1) return t('common.tomorrow');
  return `${d}${t('time.day')}`;
}

function SectionTitle({ title, icon }: { title: string; icon: string }) {
  const colors = useColors();
  const { isRTL } = usePreferences();
  return (
    <View style={[s.sectionRow, { flexDirection: isRTL ? 'row-reverse' : 'row', justifyContent: isRTL ? 'flex-start' : 'flex-start' }]}>
      <View style={[s.sectionAccent, { backgroundColor: colors.navy }]} />
      <Text style={[s.sectionTitle, { color: colors.foreground }]}>
        {isRTL ? `${title} ${icon}` : `${icon} ${title}`}
      </Text>
    </View>
  );
}

export default function HomeScreen() {
  const colors = useColors();
  const router = useRouter();
  const { t } = usePreferences();
  const { user } = useAuth();
  const { data, isLoading, refetch, isRefetching } = useGetDashboardHome();

  const d = (data as any)?.data;
  const firstName = (user?.fullName ?? d?.student?.fullName ?? t('home.studentFallback')).split(' ')[0];

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.navy} size="large" />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={s.content}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.navy} />}
    >
      {/* ── Hero ── */}
      <View style={[s.hero, { backgroundColor: colors.navy }]}>
        <View style={s.heroInner}>
          <TouchableOpacity
            onPress={() => router.push('/notifications' as any)}
            style={s.notifBtn}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Feather name="bell" size={22} color="rgba(255,255,255,0.9)" />
            {(d?.unreadNotificationsCount ?? 0) > 0 && (
              <View style={[s.notifBadge, { backgroundColor: colors.gold }]}>
                <Text style={s.notifBadgeText}>{d.unreadNotificationsCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          <View style={s.heroText}>
            <Text style={s.heroGreet}>{t('home.greeting')} 👋</Text>
            <Text style={s.heroName}>{firstName}</Text>
          </View>
        </View>

        {/* Subscription banner inside hero */}
        {d?.subscription ? (
          <View style={[s.subPill, { backgroundColor: colors.success + '25' }]}>
            <Feather name="check-circle" size={13} color={colors.success} />
            <Text style={[s.subPillText, { color: colors.success }]}>
              {d.subscription.planName} · {t('home.daysRemaining', { n: d.subscription.daysRemaining })}
            </Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[s.subPill, { backgroundColor: colors.gold + '22' }]}
            onPress={() => router.push('/subscription' as any)}
          >
            <Feather name="star" size={13} color={colors.gold} />
            <Text style={[s.subPillText, { color: colors.gold }]}>
              {t('home.upgradeFull')}
            </Text>
            <Feather name="chevron-left" size={13} color={colors.gold} />
          </TouchableOpacity>
        )}
      </View>

      {/* ── Today's Sessions ── */}
      <View style={s.section}>
        <SectionTitle title={t('home.todayLectures')} icon="📅" />
        {(d?.todaysSessions ?? []).length === 0 ? (
          <EmptyState
            icon="calendar"
            title={t('home.noLecturesToday')}
            body={t('home.noLecturesTodayBody')}
          />
        ) : (
          (d?.todaysSessions ?? []).slice(0, 4).map((session: any) => (
            <Card key={session.id} accent={colors.navy} style={s.sessionCard}>
              <View style={s.sessionInner}>
                <View style={[s.timePill, { backgroundColor: colors.navy + '10' }]}>
                  <Text style={[s.timeText, { color: colors.navy }]}>{formatTime(session.startTime)}</Text>
                  <Text style={[s.timeEnd, { color: colors.mutedForeground }]}>{formatTime(session.endTime)}</Text>
                </View>
                <View style={s.sessionBody}>
                  <Text style={[s.sessionName, { color: colors.foreground }]} numberOfLines={2}>
                    {session.courseName}
                  </Text>
                  {session.room && (
                    <Text style={[s.sessionMeta, { color: colors.mutedForeground }]}>
                      🏫 {t('home.room')} {session.room}
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
        <SectionTitle title={t('home.announcements')} icon="📢" />
        {(d?.latestAnnouncements ?? []).length === 0 ? (
          <EmptyState
            icon="bell"
            title={t('home.noAnnouncements')}
            body={t('home.noAnnouncementsBody')}
          />
        ) : (
          (d?.latestAnnouncements ?? []).slice(0, 3).map((a: any) => (
            <Card
              key={a.id}
              onPress={() => router.push('/announcements' as any)}
              style={s.annoCard}
              accent={!a.isRead ? colors.navy : undefined}
            >
              <View style={s.annoTop}>
                {!a.isRead && <View style={[s.unreadDot, { backgroundColor: colors.navy }]} />}
                {a.priority && a.priority !== 'normal' && (
                  <Badge
                    label={a.priority === 'urgent' ? t('priority.urgent') : t('priority.high')}
                    color={a.priority === 'urgent' ? 'danger' : 'warning'}
                  />
                )}
                <Text style={[s.annoTime, { color: colors.mutedForeground }]}>
                  {a.createdByName}
                </Text>
              </View>
              <Text style={[s.annoTitle, { color: colors.foreground }]} numberOfLines={2}>
                {a.title}
              </Text>
            </Card>
          ))
        )}
      </View>

      {/* ── Upcoming Assignments ── */}
      {(d?.upcomingAssignments ?? []).length > 0 && (
        <View style={s.section}>
          <SectionTitle title={t('home.upcomingAssignments')} icon="📝" />
          {(d?.upcomingAssignments ?? []).slice(0, 3).map((a: any) => (
            <Card
              key={a.id}
              onPress={() => router.push('/assignments' as any)}
              style={s.rowCard}
            >
              <View style={s.rowInner}>
                <Badge label={daysUntil(a.deadline, t)} color="warning" />
                <View style={s.rowBody}>
                  <Text style={[s.rowTitle, { color: colors.foreground }]} numberOfLines={1}>
                    {a.titleAr || a.title}
                  </Text>
                  <Text style={[s.rowMeta, { color: colors.mutedForeground }]}>
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
          <SectionTitle title={t('home.upcomingExams')} icon="📊" />
          {(d?.upcomingExams ?? []).slice(0, 2).map((e: any) => (
            <Card
              key={e.id}
              onPress={() => router.push('/exams' as any)}
              accent={colors.gold}
              style={s.rowCard}
            >
              <Text style={[s.rowTitle, { color: colors.foreground }]}>{e.titleAr || e.title}</Text>
              <Text style={[s.rowMeta, { color: colors.mutedForeground }]}>
                {e.courseName} · {e.date}
              </Text>
            </Card>
          ))}
        </View>
      )}

      {/* ── More CTA ── */}
      <TouchableOpacity
        style={[s.moreCta, { borderColor: colors.navy }]}
        activeOpacity={0.75}
        onPress={() => router.push('/more' as any)}
      >
        <Feather name="grid" size={18} color={colors.navy} />
        <Text style={[s.moreCtaText, { color: colors.navy }]}>{t('home.allModules')}</Text>
        <Feather name="chevron-left" size={18} color={colors.navy} />
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  content: { paddingBottom: 110 },

  // Hero
  hero: { paddingBottom: spacing.base },
  heroInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingTop: spacing.base,
    paddingBottom: spacing.md,
  },
  heroText: { alignItems: 'flex-end' },
  heroGreet: { fontSize: fontSize.base, color: 'rgba(255,255,255,0.7)', fontWeight: fontWeight.medium },
  heroName: { fontSize: fontSize['2xl'], color: '#fff', fontWeight: fontWeight.bold },
  notifBtn: { position: 'relative', padding: 4 },
  notifBadge: {
    position: 'absolute', top: 0, right: 0,
    width: 16, height: 16, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  notifBadgeText: { fontSize: 9, fontWeight: fontWeight.bold, color: '#000' },
  subPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginHorizontal: spacing.base,
    marginBottom: spacing.base,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
  },
  subPillText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },

  // Sections
  section: { paddingHorizontal: spacing.base, marginTop: spacing.lg, gap: spacing.sm },
  sectionRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
  sectionAccent: { width: 3, height: 18, borderRadius: 2 },
  sectionTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold },

  // Session card
  sessionCard: { marginBottom: 0 },
  sessionInner: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  timePill: { paddingHorizontal: spacing.sm, paddingVertical: spacing.sm, borderRadius: radius.md, alignItems: 'center', minWidth: 52 },
  timeText: { fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  timeEnd: { fontSize: 10 },
  sessionBody: { flex: 1 },
  sessionName: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, textAlign: 'right' },
  sessionMeta: { fontSize: fontSize.sm, marginTop: 2, textAlign: 'right' },

  // Announcement card
  annoCard: { gap: spacing.xs },
  annoTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  unreadDot: { width: 7, height: 7, borderRadius: 4 },
  annoTime: { fontSize: fontSize.xs, marginLeft: 'auto' },
  annoTitle: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, textAlign: 'right' },

  // Row card (assignments / exams)
  rowCard: {},
  rowInner: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  rowBody: { flex: 1 },
  rowTitle: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, textAlign: 'right' },
  rowMeta: { fontSize: fontSize.sm, marginTop: 2, textAlign: 'right' },

  // More CTA
  moreCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    margin: spacing.base,
    marginTop: spacing.xl,
    borderWidth: 1.5,
    borderRadius: radius.lg,
    paddingVertical: spacing.base,
  },
  moreCtaText: { fontSize: fontSize.md, fontWeight: fontWeight.bold },
});
