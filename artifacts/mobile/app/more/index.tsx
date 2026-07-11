import React from 'react';
import { Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { usePreferences } from '@/contexts/PreferencesContext';
import { Screen } from '@/components/Screen';
import { Feather } from '@expo/vector-icons';
import { spacing, radius, fontSize, fontWeight, shadow } from '@/constants/theme';

import { useWindowDimensions } from 'react-native';

const MODULES = [
  { icon: 'file-text',   labelKey: 'screens.files',         route: '/files',         color: '#4F46E5' },
  { icon: 'bell',        labelKey: 'screens.announcements', route: '/announcements', color: '#F59E0B' },
  { icon: 'clipboard',   labelKey: 'screens.assignments',   route: '/assignments',   color: '#EF4444' },
  { icon: 'bar-chart-2', labelKey: 'screens.exams',         route: '/exams',         color: '#6366F1' },
  { icon: 'calendar',    labelKey: 'screens.events',        route: '/events',        color: '#10B981' },
  { icon: 'users',       labelKey: 'screens.clubs',         route: '/clubs',         color: '#6366F1' },
  { icon: 'briefcase',   labelKey: 'screens.opportunities', route: '/opportunities', color: '#10B981' },
  { icon: 'cpu',         labelKey: 'screens.ai',            route: '/ai',            color: '#4F46E5' },
  { icon: 'star',        labelKey: 'screens.subscription',  route: '/subscription',  color: '#6366F1' },
] as const;

export default function MoreScreen() {
  const colors = useColors();
  const router = useRouter();
  const { t, isRTL } = usePreferences();
  const { width } = useWindowDimensions();

  const GAP = spacing.md;
  const TILE_W = (width - spacing.base * 2 - GAP) / 2;

  return (
    <Screen edges={['bottom']}>
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={s.content}
      >
        <Text style={[s.screenTitle, { color: colors.foreground, textAlign: isRTL ? 'right' : 'left' }]}>{t('screens.more')}</Text>

        <View style={s.grid}>
          {MODULES.map((mod) => (
            <TouchableOpacity
              key={mod.labelKey}
              activeOpacity={0.75}
              style={[
                s.tile,
                shadow.md,
                {
                  width: TILE_W,
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  borderRadius: 20,
                  borderCurve: 'continuous',
                },
              ]}
              onPress={() => router.push(mod.route as any)}
            >
              <View style={[s.iconCircle, { backgroundColor: mod.color + '16' }]}>
                <Feather name={mod.icon as any} size={28} color={mod.color} />
              </View>
              <Text
                style={[s.tileLabel, { color: colors.foreground }]}
                numberOfLines={2}
                textBreakStrategy="simple"
              >
                {t(mod.labelKey)}
              </Text>
            </TouchableOpacity>
          ))}
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
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    textAlign: 'right',
    marginBottom: spacing.lg,
    marginTop: spacing.sm,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  tile: {
    borderWidth: 1,
    padding: spacing.base,
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 14,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileLabel: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    textAlign: 'center',
  },
});
