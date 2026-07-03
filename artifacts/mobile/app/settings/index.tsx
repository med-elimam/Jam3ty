import React from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/contexts/AuthContext';
import { Feather } from '@expo/vector-icons';

function SettingRow({ icon, label, value, onPress, destructive = false }: { icon: string; label: string; value?: string; onPress?: () => void; destructive?: boolean }) {
  const colors = useColors();
  return (
    <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12, borderBottomWidth: 1, borderBottomColor: colors.border }} onPress={onPress}>
      <Feather name={icon as any} size={20} color={destructive ? colors.destructive : colors.navy} />
      <Text style={{ flex: 1, fontSize: 15, color: destructive ? colors.destructive : colors.foreground, fontWeight: '500' }}>{label}</Text>
      {value && <Text style={{ fontSize: 13, color: colors.mutedForeground }}>{value}</Text>}
      {onPress && <Feather name="chevron-right" size={18} color={colors.mutedForeground} />}
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const colors = useColors();
  const { user, logout } = useAuth();
  const s = styles(colors);

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => logout() },
    ]);
  };

  return (
    <ScrollView style={s.root} contentContainerStyle={{ paddingBottom: 100 }}>
      {/* Profile section */}
      <View style={s.profileCard}>
        <View style={s.avatar}>
          <Text style={s.avatarText}>{(user?.fullName ?? 'U').split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()}</Text>
        </View>
        <View>
          <Text style={s.name}>{user?.fullName}</Text>
          <Text style={s.email}>{user?.email}</Text>
          <Text style={s.role}>{user?.role?.replace('_', ' ')}</Text>
        </View>
      </View>

      {/* App settings */}
      <View style={s.section}>
        <Text style={s.sectionHeader}>App</Text>
        <View style={s.card}>
          <SettingRow icon="globe" label="Language" value="Arabic (العربية)" />
          <SettingRow icon="moon" label="Appearance" value="System" />
          <SettingRow icon="bell" label="Notifications" value="Enabled" />
        </View>
      </View>

      {/* Account */}
      <View style={s.section}>
        <Text style={s.sectionHeader}>Account</Text>
        <View style={s.card}>
          <SettingRow icon="lock" label="Change Password" onPress={() => Alert.alert('Coming Soon', 'Password change will be available soon.')} />
          <SettingRow icon="shield" label="Privacy" onPress={() => Alert.alert('Privacy', 'Your data is stored securely on Mauritanian servers.')} />
          <SettingRow icon="trash-2" label="Delete Account" destructive onPress={() => Alert.alert('Delete Account', 'To delete your account, please contact support.')} />
        </View>
      </View>

      {/* About */}
      <View style={s.section}>
        <Text style={s.sectionHeader}>About</Text>
        <View style={s.card}>
          <SettingRow icon="info" label="App Version" value="1.0.0" />
          <SettingRow icon="help-circle" label="Help & Support" onPress={() => Alert.alert('Support', 'Email: support@talibmr.com')} />
          <SettingRow icon="file-text" label="Terms of Service" onPress={() => {}} />
          <SettingRow icon="shield" label="Privacy Policy" onPress={() => {}} />
        </View>
      </View>

      <TouchableOpacity style={s.logoutBtn} onPress={handleLogout}>
        <Feather name="log-out" size={18} color={colors.destructive} />
        <Text style={s.logoutText}>Sign Out</Text>
      </TouchableOpacity>

      <Text style={s.footer}>Talib MR · طالب موريتانيا · Made with ❤️ for Mauritanian students</Text>
    </ScrollView>
  );
}

const styles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    profileCard: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.navy, padding: 20 },
    avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.gold + '30', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.gold },
    avatarText: { fontSize: 20, fontWeight: '700', color: colors.gold },
    name: { fontSize: 17, fontWeight: '700', color: '#fff' },
    email: { fontSize: 13, color: 'rgba(255,255,255,0.7)' },
    role: { fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 2, textTransform: 'capitalize' },
    section: { marginHorizontal: 16, marginTop: 20 },
    sectionHeader: { fontSize: 13, fontWeight: '700', color: colors.mutedForeground, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },
    card: { backgroundColor: colors.card, borderRadius: 12, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 2 },
    logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginHorizontal: 16, marginTop: 24, padding: 16, borderRadius: 12, borderWidth: 1.5, borderColor: colors.destructive + '40' },
    logoutText: { fontSize: 15, fontWeight: '600', color: colors.destructive },
    footer: { textAlign: 'center', fontSize: 12, color: colors.mutedForeground, marginTop: 24, marginBottom: 16 },
  });
