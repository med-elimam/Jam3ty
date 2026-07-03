import React from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/contexts/AuthContext';
import { useGetProfile, useGetMySubscription } from '@workspace/api-client-react';
import { Feather } from '@expo/vector-icons';

export default function ProfileScreen() {
  const colors = useColors();
  const router = useRouter();
  const { user, logout } = useAuth();

  const profileQuery = useGetProfile();
  const subQuery = useGetMySubscription();

  const profile = (profileQuery.data as any)?.data;
  const sub = (subQuery.data as any)?.data;

  const initials = (user?.fullName ?? 'U').split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase();
  const s = styles(colors);

  const menuItems = [
    { icon: 'bell', label: 'Notifications', onPress: () => router.push('/notifications' as any) },
    { icon: 'star', label: 'Subscription', onPress: () => router.push('/subscription' as any), badge: sub ? undefined : 'Upgrade' },
    { icon: 'grid', label: 'More Modules', onPress: () => router.push('/more' as any) },
    { icon: 'settings', label: 'Settings', onPress: () => router.push('/settings' as any) },
  ];

  if (profileQuery.isLoading) {
    return <View style={[s.root, { alignItems: 'center', justifyContent: 'center' }]}><ActivityIndicator color={colors.navy} /></View>;
  }

  return (
    <ScrollView style={s.root} contentContainerStyle={s.content}>
      {/* Hero */}
      <View style={s.hero}>
        <View style={s.avatar}>
          <Text style={s.avatarText}>{initials}</Text>
        </View>
        <Text style={s.name}>{profile?.fullName ?? user?.fullName}</Text>
        <Text style={s.email}>{profile?.email ?? user?.email}</Text>

        {/* Academic info */}
        {profile?.profile?.department && (
          <View style={s.acadRow}>
            <Text style={s.acadText}>{profile.profile.department?.nameAr || profile.profile.department?.name}</Text>
            {profile.profile.level && <Text style={s.acadDot}>·</Text>}
            {profile.profile.level && <Text style={s.acadText}>{profile.profile.level?.nameAr || profile.profile.level?.name}</Text>}
          </View>
        )}
        {profile?.profile?.university && (
          <Text style={s.university}>{profile.profile.university?.nameAr || profile.profile.university?.name}</Text>
        )}
      </View>

      {/* Subscription card */}
      {sub ? (
        <View style={[s.subCard, { backgroundColor: colors.success + '15', borderColor: colors.success + '30' }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Feather name="check-circle" size={18} color={colors.success} />
            <Text style={[s.subPlan, { color: colors.success }]}>{sub.planName}</Text>
          </View>
          <Text style={s.subMeta}>{sub.daysRemaining} days remaining</Text>
        </View>
      ) : (
        <TouchableOpacity style={[s.subCard, { backgroundColor: colors.gold + '15', borderColor: colors.gold + '40' }]} onPress={() => router.push('/subscription' as any)}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Feather name="star" size={18} color={colors.gold} />
            <Text style={[s.subPlan, { color: colors.gold }]}>Free Plan</Text>
          </View>
          <Text style={[s.subMeta, { color: colors.gold }]}>Tap to upgrade →</Text>
        </TouchableOpacity>
      )}

      {/* Menu */}
      <View style={s.menuCard}>
        {menuItems.map((item, idx) => (
          <TouchableOpacity key={item.label} style={[s.menuItem, idx < menuItems.length - 1 && s.menuItemBorder]} onPress={item.onPress}>
            <View style={s.menuLeft}>
              <Feather name={item.icon as any} size={20} color={colors.navy} />
              <Text style={s.menuLabel}>{item.label}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {item.badge && <View style={s.badgeChip}><Text style={s.badgeChipText}>{item.badge}</Text></View>}
              <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* Logout */}
      <TouchableOpacity style={s.logoutBtn} onPress={() => logout()}>
        <Feather name="log-out" size={18} color={colors.destructive} />
        <Text style={s.logoutText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    content: { paddingBottom: 120 },
    hero: { backgroundColor: colors.navy, paddingTop: 32, paddingBottom: 28, alignItems: 'center', gap: 6 },
    avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.gold + '30', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: colors.gold, marginBottom: 6 },
    avatarText: { fontSize: 28, fontWeight: '700', color: colors.gold },
    name: { fontSize: 22, fontWeight: '700', color: '#fff' },
    email: { fontSize: 13, color: 'rgba(255,255,255,0.7)' },
    acadRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
    acadDot: { color: 'rgba(255,255,255,0.5)' },
    acadText: { fontSize: 13, color: 'rgba(255,255,255,0.85)' },
    university: { fontSize: 12, color: 'rgba(255,255,255,0.6)' },
    subCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', margin: 16, borderRadius: 12, padding: 14, borderWidth: 1 },
    subPlan: { fontSize: 15, fontWeight: '700' },
    subMeta: { fontSize: 13, color: colors.mutedForeground },
    menuCard: { backgroundColor: colors.card, borderRadius: 12, marginHorizontal: 16, marginBottom: 12, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
    menuItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
    menuItemBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
    menuLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    menuLabel: { fontSize: 15, color: colors.foreground, fontWeight: '500' },
    badgeChip: { backgroundColor: colors.gold, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
    badgeChipText: { fontSize: 11, fontWeight: '700', color: '#fff' },
    logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginHorizontal: 16, padding: 16, borderRadius: 12, borderWidth: 1.5, borderColor: colors.destructive + '50' },
    logoutText: { fontSize: 15, fontWeight: '600', color: colors.destructive },
  });
