import React from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/contexts/AuthContext';
import { Feather } from '@expo/vector-icons';
import { Avatar } from '@/components/ui/Avatar';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { spacing, fontSize, fontWeight, radius } from '@/constants/theme';

type FeatherName = React.ComponentProps<typeof Feather>['name'];

function SettingsRow({
  icon,
  label,
  value,
  onPress,
  destructive = false,
  last = false,
}: {
  icon: FeatherName;
  label: string;
  value?: string;
  onPress?: () => void;
  destructive?: boolean;
  last?: boolean;
}) {
  const colors = useColors();
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[
        s.row,
        !last && { borderBottomWidth: 1, borderBottomColor: colors.border },
      ]}
    >
      <Feather name="chevron-left" size={18} color={colors.mutedForeground} />
      {value && (
        <Text style={[s.rowValue, { color: colors.mutedForeground }]}>{value}</Text>
      )}
      <Text style={[s.rowLabel, { color: destructive ? colors.destructive : colors.foreground }]}>
        {label}
      </Text>
      <View style={[s.rowIcon, { backgroundColor: (destructive ? colors.destructive : colors.navy) + '12' }]}>
        <Feather name={icon} size={17} color={destructive ? colors.destructive : colors.navy} />
      </View>
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const colors = useColors();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert('تسجيل الخروج', 'هل أنت متأكد من تسجيل الخروج؟', [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'تسجيل الخروج', style: 'destructive', onPress: () => logout() },
    ]);
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={s.content}
    >
      {/* Profile strip */}
      <View style={[s.profileStrip, { backgroundColor: colors.navy }]}>
        <View style={s.profileInfo}>
          <Text style={s.profileName}>{user?.fullName}</Text>
          <Text style={s.profileEmail}>{user?.email}</Text>
        </View>
        <Avatar
          name={user?.fullName ?? 'U'}
          size={52}
          bg={colors.gold + '28'}
          fg={colors.gold}
          style={{ borderWidth: 2, borderColor: colors.gold }}
        />
      </View>

      {/* App section */}
      <View style={s.section}>
        <Text style={[s.sectionLabel, { color: colors.mutedForeground }]}>التطبيق</Text>
        <Card style={s.card}>
          <SettingsRow icon="globe" label="اللغة" value="العربية" />
          <SettingsRow icon="moon" label="المظهر" value="النظام" />
          <SettingsRow icon="bell" label="الإشعارات" value="مفعّل" last />
        </Card>
      </View>

      {/* Account section */}
      <View style={s.section}>
        <Text style={[s.sectionLabel, { color: colors.mutedForeground }]}>الحساب</Text>
        <Card style={s.card}>
          <SettingsRow
            icon="lock"
            label="تغيير كلمة المرور"
            onPress={() => Alert.alert('قريباً', 'ستتوفر هذه الميزة قريباً.')}
          />
          <SettingsRow
            icon="shield"
            label="الخصوصية"
            onPress={() => Alert.alert('الخصوصية', 'بياناتك محفوظة بأمان على خوادم موريتانية.')}
          />
          <SettingsRow
            icon="trash-2"
            label="حذف الحساب"
            destructive
            onPress={() => Alert.alert('حذف الحساب', 'لحذف حسابك، يرجى التواصل مع الدعم على support@jamiati.mr')}
            last
          />
        </Card>
      </View>

      {/* About section */}
      <View style={s.section}>
        <Text style={[s.sectionLabel, { color: colors.mutedForeground }]}>حول التطبيق</Text>
        <Card style={s.card}>
          <SettingsRow icon="info" label="إصدار التطبيق" value="1.0.0" />
          <SettingsRow
            icon="help-circle"
            label="المساعدة والدعم"
            onPress={() => Alert.alert('الدعم', 'البريد: support@jamiati.mr')}
          />
          <SettingsRow icon="file-text" label="الشروط والأحكام" onPress={() => {}} />
          <SettingsRow icon="shield" label="سياسة الخصوصية" onPress={() => {}} last />
        </Card>
      </View>

      <Button
        label="تسجيل الخروج"
        variant="danger"
        onPress={handleLogout}
        icon={<Feather name="log-out" size={16} color="#fff" />}
      />

      <Text style={[s.footer, { color: colors.mutedForeground }]}>
        جامعتي · جامعتك في جيبك · صُنع بكل ❤️ للطلاب الموريتانيين
      </Text>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  content: { paddingBottom: 100, gap: spacing.base },

  profileStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.base,
    paddingVertical: spacing.lg,
  },
  profileInfo: { gap: 3 },
  profileName: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: '#fff', textAlign: 'right' },
  profileEmail: { fontSize: fontSize.sm, color: 'rgba(255,255,255,0.65)', textAlign: 'right' },

  section: { paddingHorizontal: spacing.base, gap: spacing.sm },
  sectionLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    textAlign: 'right',
  },
  card: { padding: 0, overflow: 'hidden' },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.base,
  },
  rowIcon: { width: 36, height: 36, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { flex: 1, fontSize: fontSize.md, fontWeight: fontWeight.medium, textAlign: 'right' },
  rowValue: { fontSize: fontSize.sm },

  footer: { fontSize: fontSize.xs, textAlign: 'center', paddingHorizontal: spacing.xl, paddingBottom: spacing.sm },
});
