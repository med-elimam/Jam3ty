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

  const bg: Record<BadgeColor, string> = {
    primary: colors.navy + '18',
    success: colors.success + '20',
    warning: colors.warning + '20',
    danger: colors.destructive + '20',
    gold: colors.gold + '22',
    muted: colors.mutedForeground + '18',
  };

  const fg: Record<BadgeColor, string> = {
    primary: colors.navy,
    success: colors.success,
    warning: colors.warning,
    danger: colors.destructive,
    gold: colors.gold,
    muted: colors.mutedForeground,
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
    paddingVertical: 3,
    borderRadius: radius.full,
    alignSelf: 'flex-start',
  },
  label: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
  },
});
