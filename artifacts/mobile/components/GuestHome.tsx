import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { usePreferences } from '@/contexts/PreferencesContext';
import { useColors } from '@/hooks/useColors';
import { useListAnnouncements, useListEvents } from '@workspace/api-client-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { spacing, fontSize, fontWeight, radius } from '@/constants/theme';

/**
 * Home tab content for guest sessions. Guests browse PUBLIC content —
 * global announcements and platform-wide events (served anonymously by the
 * API) plus plans & pricing — with a persistent login call-to-action.
 * Account-bound tabs (courses, timetable, community, profile) stay behind
 * GuestGate.
 */
export function GuestHome() {
  const colors = useColors();
  const router = useRouter();
  const { t, isRTL, language } = usePreferences();
  const { logout } = useAuth();

  const announcementsQuery = useListAnnouncements();
  const eventsQuery = useListEvents();
  const announcements = (announcementsQuery.data?.data ?? []).slice(0, 3);
  const events = (eventsQuery.data?.data ?? []).slice(0, 3);

  const align = { textAlign: isRTL ? 'right' : 'left' } as const;
  const rowDir = { flexDirection: isRTL ? 'row-reverse' : 'row' } as const;
  const dateLocale = language === 'ar' ? 'ar' : 'fr';

  const section = (
    titleKey: string,
    icon: React.ComponentProps<typeof Feather>['name'],
    viewAllRoute: '/announcements' | '/events',
  ) => (
    <View style={[s.sectionRow, rowDir]}>
      <View style={[s.sectionAccent, { backgroundColor: colors.navy }]} />
      <Feather name={icon} size={16} color={colors.navy} />
      <Text style={[s.sectionTitle, { color: colors.foreground }]}>{t(titleKey)}</Text>
      <TouchableOpacity
        style={isRTL ? { marginRight: 'auto' } : { marginLeft: 'auto' }}
        onPress={() => router.push(viewAllRoute)}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text style={[s.viewAll, { color: colors.navy }]}>{t('guest.viewAll')}</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={s.content}
    >
      {/* ── Hero ── */}
      <View style={[s.hero, { backgroundColor: colors.navy }]}>
        <View style={[s.badge, { backgroundColor: 'rgba(255,255,255,0.12)' }]}>
          <Feather name="eye" size={12} color={colors.gold} />
          <Text style={[s.badgeText, { color: colors.gold }]}>{t('guest.badge')}</Text>
        </View>
        <Text style={s.heroTitle}>{t('brand.appName')}</Text>
        <Text style={s.heroBody}>{t('guest.heroBody')}</Text>
        <Button
          label={t('guest.loginCta')}
          variant="gold"
          size="md"
          fullWidth={false}
          onPress={() => { logout(); }}
        />
      </View>

      {/* ── Public announcements ── */}
      <View style={s.section}>
        {section('guest.publicAnnouncements', 'bell', '/announcements')}
        {announcementsQuery.isError || announcements.length === 0 ? (
          <Text style={[s.sectionEmpty, { color: colors.mutedForeground }, align]}>{t('home.noAnnouncements')}</Text>
        ) : (
          announcements.map((a) => (
            <Card key={a.id} onPress={() => router.push('/announcements')} style={s.itemCard}>
              <Text style={[s.itemTitle, { color: colors.foreground }, align]} numberOfLines={2}>{a.title}</Text>
              <Text style={[s.itemMeta, { color: colors.mutedForeground }, align]} numberOfLines={2}>{a.content}</Text>
            </Card>
          ))
        )}
      </View>

      {/* ── Public events ── */}
      <View style={s.section}>
        {section('guest.publicEvents', 'calendar', '/events')}
        {eventsQuery.isError || events.length === 0 ? (
          <Text style={[s.sectionEmpty, { color: colors.mutedForeground }, align]}>{t('events.empty')}</Text>
        ) : (
          events.map((e) => (
            <Card key={e.id} onPress={() => router.push('/events')} style={s.itemCard}>
              <Text style={[s.itemTitle, { color: colors.foreground }, align]} numberOfLines={2}>{e.title}</Text>
              <Text style={[s.itemMeta, { color: colors.mutedForeground }, align]}>
                📅 {new Date(e.startDate).toLocaleDateString(dateLocale)}{e.location ? ` · 📍 ${e.location}` : ''}
              </Text>
            </Card>
          ))
        )}
      </View>

      {/* ── Plans & pricing ── */}
      <TouchableOpacity
        style={[s.plansCta, rowDir, { borderColor: colors.gold, backgroundColor: colors.gold + '10' }]}
        activeOpacity={0.75}
        onPress={() => router.push('/subscription')}
      >
        <Feather name="star" size={18} color={colors.gold} />
        <Text style={[s.plansCtaText, { color: colors.foreground }]}>{t('guest.viewPlans')}</Text>
        <Feather name={isRTL ? 'chevron-left' : 'chevron-right'} size={18} color={colors.gold} />
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  content: { paddingBottom: 110 },

  hero: {
    padding: spacing.xl,
    paddingBottom: spacing['2xl'],
    alignItems: 'center',
    gap: spacing.md,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  badgeText: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
  heroTitle: { fontSize: fontSize['3xl'], color: '#fff', fontWeight: fontWeight.bold },
  heroBody: {
    fontSize: fontSize.base,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    lineHeight: fontSize.base * 1.6,
    maxWidth: 320,
  },

  section: { paddingHorizontal: spacing.base, marginTop: spacing.lg, gap: spacing.sm },
  sectionRow: { alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
  sectionAccent: { width: 3, height: 18, borderRadius: 2 },
  sectionTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold },
  viewAll: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  sectionEmpty: { fontSize: fontSize.sm, paddingVertical: spacing.md },

  itemCard: { gap: spacing.xs },
  itemTitle: { fontSize: fontSize.md, fontWeight: fontWeight.semibold },
  itemMeta: { fontSize: fontSize.sm },

  plansCta: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    margin: spacing.base,
    marginTop: spacing.xl,
    borderWidth: 1.5,
    borderRadius: radius.lg,
    paddingVertical: spacing.base,
  },
  plansCtaText: { fontSize: fontSize.md, fontWeight: fontWeight.bold },
});
