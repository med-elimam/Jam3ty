import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { usePreferences } from '@/contexts/PreferencesContext';
import { Screen } from '@/components/Screen';
import { Feather } from '@expo/vector-icons';
import { spacing, radius, fontSize, fontWeight } from '@/constants/theme';
import { Card } from '@/components/ui/Card';

type FeatherName = React.ComponentProps<typeof Feather>['name'];

interface ModuleItem {
  icon: FeatherName;
  labelKey: string;
  route: string;
}

const QUICK_ACCESS_MODULES: ModuleItem[] = [
  { icon: 'file-text',   labelKey: 'screens.files',         route: '/files' },
  { icon: 'cpu',         labelKey: 'screens.ai',            route: '/ai' },
  { icon: 'bell',        labelKey: 'screens.announcements', route: '/announcements' },
  { icon: 'clipboard',   labelKey: 'screens.assignments',   route: '/assignments' },
  { icon: 'bar-chart-2', labelKey: 'screens.exams',         route: '/exams' },
];

const CAMPUS_MODULES: ModuleItem[] = [
  { icon: 'calendar',    labelKey: 'screens.events',        route: '/events' },
  { icon: 'users',       labelKey: 'screens.clubs',         route: '/clubs' },
  { icon: 'briefcase',   labelKey: 'screens.opportunities', route: '/opportunities' },
  { icon: 'star',        labelKey: 'screens.subscription',  route: '/subscription' },
];

export default function MoreScreen() {
  const colors = useColors();
  const router = useRouter();
  const { t, isRTL, language } = usePreferences();

  const align = { textAlign: isRTL ? 'right' : 'left' } as const;
  const rowDir = { flexDirection: isRTL ? 'row-reverse' : 'row' } as const;
  const forwardChevron = isRTL ? 'chevron-left' : 'chevron-right';

  const quickAccessTitle = language === 'ar' ? 'الوصول السريع' : 'QUICK ACCESS';
  const campusTitle = language === 'ar' ? 'الحرم الجامعي' : 'CAMPUS';

  const renderModuleGroup = (modules: ModuleItem[]) => (
    <Card padding={0} style={s.groupCard}>
      {modules.map((mod, index) => (
        <TouchableOpacity
          key={mod.labelKey}
          activeOpacity={0.7}
          style={[
            s.row,
            rowDir,
            index > 0 && { borderTopWidth: 1, borderTopColor: colors.border }
          ]}
          onPress={() => router.push(mod.route as any)}
        >
          <Feather
            name={mod.icon}
            size={18}
            color={colors.mutedForeground}
            style={isRTL ? { marginLeft: 12 } : { marginRight: 12 }}
          />
          <Text style={[s.rowLabel, { color: colors.foreground }, align]}>
            {t(mod.labelKey)}
          </Text>
          <Feather
            name={forwardChevron}
            size={16}
            color={colors.mutedForeground}
          />
        </TouchableOpacity>
      ))}
    </Card>
  );

  return (
    <Screen edges={['bottom']}>
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={s.content}
      >
        <View style={s.section}>
          <Text style={[s.sectionTitle, { color: colors.mutedForeground, textAlign: isRTL ? 'right' : 'left' }]}>
            {quickAccessTitle}
          </Text>
          {renderModuleGroup(QUICK_ACCESS_MODULES)}
        </View>

        <View style={s.section}>
          <Text style={[s.sectionTitle, { color: colors.mutedForeground, textAlign: isRTL ? 'right' : 'left' }]}>
            {campusTitle}
          </Text>
          {renderModuleGroup(CAMPUS_MODULES)}
        </View>
      </ScrollView>
    </Screen>
  );
}

const s = StyleSheet.create({
  content: {
    padding: spacing.base,
    paddingBottom: 100,
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: fontWeight.bold,
    marginBottom: spacing.lg,
    marginTop: spacing.sm,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: fontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.xs,
    paddingHorizontal: 4,
  },
  groupCard: {
    overflow: 'hidden',
  },
  row: {
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    minHeight: 48,
  },
  rowLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: fontWeight.medium,
  },
});
