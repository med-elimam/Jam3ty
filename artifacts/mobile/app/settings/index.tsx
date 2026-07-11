import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { showAlert, showConfirm } from '@/lib/alert';
import { useRouter } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/contexts/AuthContext';
import { usePreferences } from '@/contexts/PreferencesContext';
import { Feather } from '@expo/vector-icons';
import { Avatar } from '@/components/ui/Avatar';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/Screen';
import { spacing, fontSize, fontWeight, radius } from '@/constants/theme';

type FeatherName = React.ComponentProps<typeof Feather>['name'];

function SettingsRow({
  icon,
  label,
  value,
  onPress,
  destructive = false,
  last = false,
  isRTL,
}: {
  icon: FeatherName;
  label: string;
  value?: string;
  onPress?: () => void;
  destructive?: boolean;
  last?: boolean;
  isRTL: boolean;
}) {
  const colors = useColors();
  const chevron = isRTL ? 'chevron-left' : 'chevron-right';
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[
        s.row,
        { flexDirection: isRTL ? 'row' : 'row-reverse' },
        !last && { borderBottomWidth: 1, borderBottomColor: colors.border },
      ]}
    >
      <Feather name={chevron} size={18} color={colors.mutedForeground} />
      {value && (
        <Text style={[s.rowValue, { color: colors.mutedForeground }]}>{value}</Text>
      )}
      <Text
        style={[
          s.rowLabel,
          { color: destructive ? colors.destructive : colors.foreground, textAlign: isRTL ? 'right' : 'left' },
        ]}
      >
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
  const router = useRouter();
  const { user, logout } = useAuth();
  const { t, isRTL, language, theme, notif } = usePreferences();

  const align = { textAlign: isRTL ? 'right' : 'left' } as const;

  const handleLogout = () => {
    showConfirm(t('settings.logout'), t('settings.logoutConfirm'), t('settings.logout'), t('common.cancel'), () => logout(), true);
  };

  const handleChangePassword = () => {
    showAlert(t('settings.changePassword'), t('settings.changePwDevDisabled'));
  };

  const handleDeleteAccount = () => {
    showConfirm(
      t('settings.deleteConfirmTitle'),
      t('settings.deleteConfirmBody'),
      t('common.delete'),
      t('common.cancel'),
      () => showAlert(t('settings.deleteConfirmTitle'), t('settings.deleteDevDisabled')),
      true,
    );
  };

  const langValue = language === 'ar' ? t('settings.languageArabic') : t('settings.languageFrench');
  const themeValue =
    theme === 'system' ? t('settings.themeSystem') : theme === 'dark' ? t('settings.themeDark') : t('settings.themeLight');
  const notifOn = Object.values(notif).filter(Boolean).length;
  const notifValue = notifOn === 0 ? t('common.off') : `${notifOn}/${Object.keys(notif).length}`;

  return (
    <Screen edges={['bottom']}>
      <ScrollView contentContainerStyle={s.content}>
        {/* Profile strip */}
        <View style={[s.profileStrip, { backgroundColor: colors.navy, flexDirection: isRTL ? 'row' : 'row-reverse' }]}>
          <View style={s.profileInfo}>
            <Text style={[s.profileName, align]}>{user?.fullName}</Text>
            <Text style={[s.profileEmail, align]}>{user?.email}</Text>
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
          <Text style={[s.sectionLabel, { color: colors.mutedForeground }, align]}>{t('settings.sectionApp')}</Text>
          <Card style={s.card}>
            <SettingsRow icon="globe" label={t('settings.language')} value={langValue} isRTL={isRTL} onPress={() => router.push('/settings/language')} />
            <SettingsRow icon="moon" label={t('settings.appearance')} value={themeValue} isRTL={isRTL} onPress={() => router.push('/settings/appearance')} />
            <SettingsRow icon="bell" label={t('settings.notifications')} value={notifValue} isRTL={isRTL} last onPress={() => router.push('/settings/notifications')} />
          </Card>
        </View>

        {/* Account section */}
        <View style={s.section}>
          <Text style={[s.sectionLabel, { color: colors.mutedForeground }, align]}>{t('settings.sectionAccount')}</Text>
          <Card style={s.card}>
            <SettingsRow icon="lock" label={t('settings.changePassword')} isRTL={isRTL} onPress={handleChangePassword} />
            <SettingsRow icon="shield" label={t('settings.privacy')} isRTL={isRTL} onPress={() => router.push('/settings/privacy')} />
            <SettingsRow icon="trash-2" label={t('settings.deleteAccount')} destructive isRTL={isRTL} last onPress={handleDeleteAccount} />
          </Card>
        </View>

        {/* About section */}
        <View style={s.section}>
          <Text style={[s.sectionLabel, { color: colors.mutedForeground }, align]}>{t('settings.sectionAbout')}</Text>
          <Card style={s.card}>
            <SettingsRow icon="info" label={t('settings.appVersion')} value="1.0.0" isRTL={isRTL} />
            <SettingsRow
              icon="help-circle"
              label={t('settings.help')}
              isRTL={isRTL}
              last
              onPress={() => showAlert(t('settings.help'), 'support@jamiati.mr')}
            />
          </Card>
        </View>

        <Button
          label={t('settings.logout')}
          variant="danger"
          onPress={handleLogout}
          icon={<Feather name="log-out" size={16} color="#fff" />}
        />

        <Text style={[s.footer, { color: colors.mutedForeground }]}>{t('settings.footer')}</Text>
      </ScrollView>
    </Screen>
  );
}

const s = StyleSheet.create({
  content: { paddingBottom: 100, gap: spacing.base },
  profileStrip: {
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.base,
    paddingVertical: spacing.lg,
  },
  profileInfo: { gap: 3, flex: 1 },
  profileName: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: '#fff' },
  profileEmail: { fontSize: fontSize.sm, color: 'rgba(255,255,255,0.65)' },
  section: { paddingHorizontal: spacing.base, gap: spacing.sm },
  sectionLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  card: { padding: 0, overflow: 'hidden' },
  row: {
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.base,
  },
  rowIcon: { width: 36, height: 36, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { flex: 1, fontSize: fontSize.md, fontWeight: fontWeight.medium },
  rowValue: { fontSize: fontSize.sm },
  footer: { fontSize: fontSize.xs, textAlign: 'center', paddingHorizontal: spacing.xl, paddingBottom: spacing.sm },
});
