import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { fontSize, fontWeight, radius, spacing } from '@/constants/theme';

export type BadgeColor = 'primary' | 'success' | 'warning' | 'danger' | 'gold' | 'muted';

interface BadgeProps {
  label: string;
  color?: BadgeColor;
  style?: ViewStyle;
}

export function Badge({ label, color = 'primary', style }: BadgeProps) {
  const colors = useColors();
  const isDark = colors.background === '#0B0F19';

  const bg: Record<BadgeColor, string> = isDark ? {
    primary: 'rgba(99, 102, 241, 0.15)',
    success: 'rgba(16, 185, 129, 0.15)',
    warning: 'rgba(245, 158, 11, 0.15)',
    danger: 'rgba(239, 68, 68, 0.15)',
    gold: 'rgba(99, 102, 241, 0.15)',
    muted: 'rgba(148, 163, 184, 0.15)',
  } : {
    primary: '#EEF2FF',
    success: '#EDF3EC', // Pale green
    warning: '#FBF3DB', // Pale yellow
    danger: '#FDEBEC',  // Pale red
    gold: '#EEF2FF',
    muted: '#F1F5F9',
  };

  const fg: Record<BadgeColor, string> = isDark ? {
    primary: '#818CF8',
    success: '#34D399',
    warning: '#FBBF24',
    danger: '#F87171',
    gold: '#818CF8',
    muted: '#94A3B8',
  } : {
    primary: '#4F46E5',
    success: '#346538',
    warning: '#956400',
    danger: '#9F2F2D',
    gold: '#6366F1',
    muted: '#64748B',
  };

  return (
    <View style={[s.badge, { backgroundColor: bg[color] }, style]}>
      <Text style={[s.label, { color: fg[color] }]}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: 10,
    borderCurve: 'continuous',
    alignSelf: 'flex-start',
  },
  label: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
  },
});
