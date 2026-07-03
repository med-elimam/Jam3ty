import React from 'react';
import { Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { Feather } from '@expo/vector-icons';
import { spacing, radius, fontSize, fontWeight, shadow } from '@/constants/theme';

const SCREEN_W = Dimensions.get('window').width;
const GAP = spacing.md;
const TILE_W = (SCREEN_W - spacing.base * 2 - GAP) / 2;

const MODULES = [
  { icon: 'file-text',   label: 'الملفات',      route: '/files',         color: '#3B82F6' },
  { icon: 'bell',        label: 'الإعلانات',    route: '/announcements', color: '#F59E0B' },
  { icon: 'clipboard',   label: 'الواجبات',     route: '/assignments',   color: '#EF4444' },
  { icon: 'bar-chart-2', label: 'الامتحانات',   route: '/exams',         color: '#8B5CF6' },
  { icon: 'calendar',    label: 'الفعاليات',    route: '/events',        color: '#10B981' },
  { icon: 'users',       label: 'النوادي',      route: '/clubs',         color: '#EC4899' },
  { icon: 'briefcase',   label: 'الفرص',        route: '/opportunities', color: '#14B8A6' },
  { icon: 'cpu',         label: 'المساعد الذكي', route: '/ai',            color: '#6366F1' },
  { icon: 'star',        label: 'الاشتراك',     route: '/subscription',  color: '#D4A853' },
] as const;

export default function MoreScreen() {
  const colors = useColors();
  const router = useRouter();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={s.content}
    >
      <Text style={[s.screenTitle, { color: colors.foreground }]}>جميع الأقسام</Text>

      <View style={s.grid}>
        {MODULES.map((mod) => (
          <TouchableOpacity
            key={mod.label}
            activeOpacity={0.75}
            style={[
              s.tile,
              shadow.sm,
              {
                width: TILE_W,
                backgroundColor: colors.card,
                borderColor: colors.border,
                borderRadius: radius.lg,
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
              {mod.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
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
    gap: GAP,
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
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileLabel: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    textAlign: 'center',
  },
});
