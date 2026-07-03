import React from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { usePreferences } from '@/contexts/PreferencesContext';
import { useAuth } from '@/contexts/AuthContext';
import { useGetProfile, useGetMySubscription } from '@workspace/api-client-react';
import { Feather } from '@expo/vector-icons';
import { Avatar } from '@/components/ui/Avatar';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { spacing, fontSize, fontWeight, radius, shadow } from '@/constants/theme';

type FeatherName = React.ComponentProps<typeof Feather>['name'];

interface MenuItem {
  icon: FeatherName;
  label: string;
  onPress: () => void;
  badge?: string;
}

export default function ProfileScreen() {
  const colors = useColors();
  const router = useRouter();
  const { t } = usePreferences();
  const { user, logout } = useAuth();

  const profileQuery = useGetProfile();
  const subQuery = useGetMySubscription();

  const profile = (profileQuery.data as any)?.data;
  const sub = (subQuery.data as any)?.data;

  const menuItems: MenuItem[] = [
    { icon: 'bell',     label: t('screens.notifications'), onPress: () => router.push('/notifications' as any) },
    { icon: 'star',     label: t('screens.subscription'),  onPress: () => router.push('/subscription' as any),
      badge: sub ? undefined : t('profile.plusBadge') },
    { icon: 'grid',     label: t('nav.more'),              onPress: () => router.push('/more' as any) },
    { icon: 'settings', label: t('screens.settings'),      onPress: () => router.push('/settings' as any) },
  ];

  if (profileQuery.isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.navy} />
      </View>
    );
  }

  const fullName = profile?.fullName ?? user?.fullName ?? t('profile.studentFallback');
  const email = profile?.email ?? user?.email ?? '';
  const department = profile?.profile?.department?.nameAr || profile?.profile?.department?.name;
  const level = profile?.profile?.level?.nameAr || profile?.profile?.level?.name;
  const university = profile?.profile?.university?.nameAr || profile?.profile?.university?.name;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={s.content}
    >
      {/* ── Hero ── */}
      <View style={[s.hero, { backgroundColor: colors.navy }]}>
        <Avatar
          name={fullName}
          size={88}
          bg={colors.gold + '22'}
          fg={colors.gold}
          style={[s.avatar, { borderColor: colors.gold }]}
        />
        <Text style={s.heroName}>{fullName}</Text>
        <Text style={s.heroEmail}>{email}</Text>

        {(department || level) && (
          <View style={s.acadRow}>
            {department && <Text style={s.acadChip}>{department}</Text>}
            {level && <Text style={s.acadChip}>{level}</Text>}
          </View>
        )}
        {university && <Text style={s.heroUniv}>{university}</Text>}
      </View>

      <View style={s.body}>
        {/* ── Subscription card ── */}
        {sub ? (
          <Card style={[s.subCard, { borderColor: colors.success + '40' }]}>
            <View style={s.subRow}>
              <View>
                <Text style={[s.subPlan, { color: colors.success }]}>{sub.planName}</Text>
                <Text style={[s.subMeta, { color: colors.mutedForeground }]}>
                  {t('profile.daysRemaining', { n: sub.daysRemaining })}
                </Text>
              </View>
              <View style={[s.subIcon, { backgroundColor: colors.success + '15' }]}>
                <Feather name="check-circle" size={22} color={colors.success} />
              </View>
            </View>
          </Card>
        ) : (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push('/subscription' as any)}
          >
            <Card style={[s.subCard, { borderColor: colors.gold + '50' }]}>
              <View style={s.subRow}>
                <View>
                  <Text style={[s.subPlan, { color: colors.gold }]}>{t('profile.freePlan')}</Text>
                  <Text style={[s.subMeta, { color: colors.mutedForeground }]}>
                    {t('profile.upgradeTap')}
                  </Text>
                </View>
                <View style={[s.subIcon, { backgroundColor: colors.gold + '15' }]}>
                  <Feather name="star" size={22} color={colors.gold} />
                </View>
              </View>
            </Card>
          </TouchableOpacity>
        )}

        {/* ── Menu ── */}
        <Card style={s.menuCard}>
          {menuItems.map((item, idx) => (
            <TouchableOpacity
              key={item.label}
              activeOpacity={0.7}
              style={[
                s.menuRow,
                idx < menuItems.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
              ]}
              onPress={item.onPress}
            >
              <Feather name="chevron-left" size={18} color={colors.mutedForeground} />
              {item.badge && (
                <View style={[s.menuBadge, { backgroundColor: colors.gold }]}>
                  <Text style={s.menuBadgeText}>{item.badge}</Text>
                </View>
              )}
              <Text style={[s.menuLabel, { color: colors.foreground }]}>{item.label}</Text>
              <View style={[s.menuIconBox, { backgroundColor: colors.navy + '10' }]}>
                <Feather name={item.icon} size={18} color={colors.navy} />
              </View>
            </TouchableOpacity>
          ))}
        </Card>

        {/* ── Sign out ── */}
        <Button
          label={t('settings.logout')}
          variant="danger"
          onPress={() => logout()}
          icon={<Feather name="log-out" size={16} color="#fff" />}
        />
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  content: { paddingBottom: 120 },

  // Hero
  hero: {
    paddingTop: spacing.xl,
    paddingBottom: spacing['2xl'],
    alignItems: 'center',
    gap: spacing.sm,
  },
  avatar: { borderWidth: 3, marginBottom: spacing.sm },
  heroName: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: '#fff' },
  heroEmail: { fontSize: fontSize.sm, color: 'rgba(255,255,255,0.65)' },
  acadRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs, flexWrap: 'wrap', justifyContent: 'center' },
  acadChip: {
    fontSize: fontSize.xs,
    color: 'rgba(255,255,255,0.85)',
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  heroUniv: { fontSize: fontSize.xs, color: 'rgba(255,255,255,0.5)', marginTop: 2 },

  // Body
  body: { padding: spacing.base, gap: spacing.md },

  // Subscription card
  subCard: { borderWidth: 1.5 },
  subRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  subPlan: { fontSize: fontSize.lg, fontWeight: fontWeight.bold },
  subMeta: { fontSize: fontSize.sm, marginTop: 2 },
  subIcon: { width: 44, height: 44, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },

  // Menu
  menuCard: { padding: 0, overflow: 'hidden' },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.base,
  },
  menuIconBox: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: { flex: 1, fontSize: fontSize.md, fontWeight: fontWeight.medium, textAlign: 'right' },
  menuBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  menuBadgeText: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: '#fff' },
});
