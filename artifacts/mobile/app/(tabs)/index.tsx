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
import { useAuth } from '@/contexts/AuthContext';
import { useGetDashboardHome } from '@workspace/api-client-react';
import { Feather } from '@expo/vector-icons';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function formatTime(t: string) {
  return t?.slice(0, 5) ?? '';
}

function daysUntil(dateStr: string) {
  const d = Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
  if (d === 0) return 'Today';
  if (d === 1) return 'Tomorrow';
  return `${d}d`;
}

export default function HomeScreen() {
  const colors = useColors();
  const router = useRouter();
  const { user } = useAuth();
  const { data, isLoading, refetch, isRefetching } = useGetDashboardHome();

  const d = (data as any)?.data;
  const s = styles(colors);

  const firstName = (user?.fullName ?? d?.student?.fullName ?? 'Student').split(' ')[0];

  if (isLoading) {
    return (
      <View style={[s.root, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color={colors.navy} size="large" />
        <Text style={{ color: colors.mutedForeground, marginTop: 12 }}>Loading…</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={s.root}
      contentContainerStyle={s.content}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
    >
      {/* Greeting */}
      <View style={s.greeting}>
        <View>
          <Text style={s.greetSub}>مرحباً بك 👋</Text>
          <Text style={s.greetName}>{firstName}</Text>
        </View>
        <TouchableOpacity onPress={() => router.push('/notifications' as any)} style={s.notifBtn}>
          <Feather name="bell" size={22} color={colors.primaryForeground} />
          {(d?.unreadNotificationsCount ?? 0) > 0 && (
            <View style={s.badge}>
              <Text style={s.badgeText}>{d.unreadNotificationsCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Subscription banner */}
      {!d?.subscription && (
        <TouchableOpacity style={s.subBanner} onPress={() => router.push('/subscription' as any)}>
          <Feather name="star" size={16} color={colors.gold} />
          <Text style={s.subBannerText}>Upgrade to Plus for full access</Text>
          <Feather name="chevron-right" size={16} color={colors.gold} />
        </TouchableOpacity>
      )}
      {d?.subscription && (
        <View style={[s.subBanner, { backgroundColor: colors.success + '20' }]}>
          <Feather name="check-circle" size={16} color={colors.success} />
          <Text style={[s.subBannerText, { color: colors.success }]}>
            {d.subscription.planName} — {d.subscription.daysRemaining}d remaining
          </Text>
        </View>
      )}

      {/* Today's sessions */}
      <Text style={s.sectionTitle}>📅 Today's Classes</Text>
      {(d?.todaysSessions ?? []).length === 0 ? (
        <View style={s.emptyCard}><Text style={s.emptyText}>No classes today</Text></View>
      ) : (
        (d?.todaysSessions ?? []).slice(0, 4).map((s2: any) => (
          <View key={s2.id} style={[s.sessionCard, { borderLeftColor: colors.navy }]}>
            <View style={s.sessionTime}>
              <Text style={s.sessionTimeText}>{formatTime(s2.startTime)}</Text>
              <Text style={s.sessionTimeSub}>{formatTime(s2.endTime)}</Text>
            </View>
            <View style={s.sessionInfo}>
              <Text style={s.sessionCourse}>{s2.courseName}</Text>
              <Text style={s.sessionMeta}>{s2.room ? `Room ${s2.room}` : (s2.type ?? s2.sessionType ?? '')}</Text>
            </View>
          </View>
        ))
      )}

      {/* Announcements */}
      <Text style={s.sectionTitle}>📢 Announcements</Text>
      {(d?.latestAnnouncements ?? []).length === 0 ? (
        <View style={s.emptyCard}><Text style={s.emptyText}>No announcements</Text></View>
      ) : (
        (d?.latestAnnouncements ?? []).slice(0, 3).map((a: any) => (
          <TouchableOpacity key={a.id} style={[s.card, !a.isRead && s.cardUnread]} onPress={() => router.push('/announcements' as any)}>
            <View style={s.cardHeader}>
              {!a.isRead && <View style={s.unreadDot} />}
              {(a.priority === 'urgent' || a.priority === 'important') && <View style={[s.priorityBadge, { backgroundColor: colors.destructive + '20' }]}><Text style={[s.priorityText, { color: colors.destructive }]}>{a.priority === 'urgent' ? 'Urgent' : 'Important'}</Text></View>}
            </View>
            <Text style={s.cardTitle} numberOfLines={2}>{a.title}</Text>
            <Text style={s.cardMeta}>{a.createdByName}</Text>
          </TouchableOpacity>
        ))
      )}

      {/* Due soon assignments */}
      {(d?.upcomingAssignments ?? []).length > 0 && (
        <>
          <Text style={s.sectionTitle}>📝 Assignments Due</Text>
          {(d?.upcomingAssignments ?? []).slice(0, 3).map((a: any) => (
            <TouchableOpacity key={a.id} style={s.card} onPress={() => router.push('/assignments' as any)}>
              <View style={s.cardRow}>
                <Text style={s.cardTitle} numberOfLines={1}>{a.titleAr || a.title}</Text>
                <View style={[s.chip, { backgroundColor: statusColor(a.submissionStatus, colors) + '20' }]}>
                  <Text style={[s.chipText, { color: statusColor(a.submissionStatus, colors) }]}>{daysUntil(a.deadline)}</Text>
                </View>
              </View>
              <Text style={s.cardMeta}>{a.courseName}</Text>
            </TouchableOpacity>
          ))}
        </>
      )}

      {/* Upcoming exams */}
      {(d?.upcomingExams ?? []).length > 0 && (
        <>
          <Text style={s.sectionTitle}>📊 Upcoming Exams</Text>
          {(d?.upcomingExams ?? []).slice(0, 2).map((e: any) => (
            <TouchableOpacity key={e.id} style={[s.card, { borderLeftColor: colors.gold, borderLeftWidth: 4 }]} onPress={() => router.push('/exams' as any)}>
              <Text style={s.cardTitle}>{e.titleAr || e.title}</Text>
              <Text style={s.cardMeta}>{e.courseName} · {e.date}</Text>
            </TouchableOpacity>
          ))}
        </>
      )}

      {/* More modules */}
      <TouchableOpacity style={s.moreBtn} onPress={() => router.push('/more' as any)}>
        <Text style={s.moreBtnText}>More Modules</Text>
        <Feather name="grid" size={18} color={colors.navy} />
      </TouchableOpacity>
    </ScrollView>
  );
}

function statusColor(status: string, colors: ReturnType<typeof useColors>) {
  if (status === 'submitted') return colors.success;
  if (status === 'late') return colors.destructive;
  return colors.warning;
}

const styles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    content: { paddingBottom: 100 },
    greeting: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      backgroundColor: colors.navy, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20,
    },
    greetSub: { fontSize: 13, color: 'rgba(255,255,255,0.75)' },
    greetName: { fontSize: 22, fontWeight: '700', color: '#fff', marginTop: 2 },
    notifBtn: { position: 'relative', padding: 8 },
    badge: {
      position: 'absolute', top: 4, right: 4, backgroundColor: colors.gold,
      borderRadius: 8, minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center',
    },
    badgeText: { fontSize: 10, fontWeight: '700', color: '#000' },
    subBanner: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      backgroundColor: colors.gold + '20', margin: 16, padding: 12, borderRadius: 12,
    },
    subBannerText: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.gold },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.foreground, marginHorizontal: 16, marginTop: 16, marginBottom: 8 },
    sessionCard: {
      flexDirection: 'row', backgroundColor: colors.card, marginHorizontal: 16,
      marginBottom: 8, borderRadius: 12, overflow: 'hidden', borderLeftWidth: 4,
      shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
    },
    sessionTime: { backgroundColor: colors.navy + '10', padding: 12, alignItems: 'center', justifyContent: 'center', minWidth: 60 },
    sessionTimeText: { fontSize: 13, fontWeight: '700', color: colors.navy },
    sessionTimeSub: { fontSize: 11, color: colors.mutedForeground },
    sessionInfo: { flex: 1, padding: 12 },
    sessionCourse: { fontSize: 14, fontWeight: '600', color: colors.foreground },
    sessionMeta: { fontSize: 12, color: colors.mutedForeground, marginTop: 2 },
    card: {
      backgroundColor: colors.card, borderRadius: 12, padding: 14,
      marginHorizontal: 16, marginBottom: 8,
      shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
    },
    cardUnread: { borderLeftWidth: 3, borderLeftColor: colors.navy },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
    unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.navy },
    priorityBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    priorityText: { fontSize: 10, fontWeight: '700' },
    cardTitle: { fontSize: 15, fontWeight: '600', color: colors.foreground },
    cardMeta: { fontSize: 12, color: colors.mutedForeground, marginTop: 4 },
    cardRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    chip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
    chipText: { fontSize: 11, fontWeight: '600' },
    emptyCard: { backgroundColor: colors.card, borderRadius: 12, padding: 16, marginHorizontal: 16, alignItems: 'center' },
    emptyText: { color: colors.mutedForeground, fontSize: 14 },
    moreBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
      margin: 16, borderWidth: 1.5, borderColor: colors.navy, borderRadius: 12, padding: 14,
    },
    moreBtnText: { fontSize: 15, fontWeight: '600', color: colors.navy },
  });
