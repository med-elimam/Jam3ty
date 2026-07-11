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
    primary: colors.primary + '0A',
    success: colors.success + '0A',
    warning: colors.warning + '0A',
    danger: colors.destructive + '0A',
    gold: colors.primary + '0A',
    muted: colors.mutedForeground + '0D',
  };

  const border: Record<BadgeColor, string> = {
    primary: colors.primary + '28',
    success: colors.success + '28',
    warning: colors.warning + '28',
    danger: colors.destructive + '28',
    gold: colors.primary + '28',
    muted: colors.mutedForeground + '20',
  };

  const fg: Record<BadgeColor, string> = {
    primary: colors.primary,
    success: colors.success,
    warning: colors.warning,
    danger: colors.destructive,
    gold: colors.primary,
    muted: colors.mutedForeground,
  };

  return (
    <View style={[s.badge, { backgroundColor: bg[color], borderColor: border[color] }, style]}>
      <Text style={[s.label, { color: fg[color] }]}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderCurve: 'continuous',
    alignSelf: 'flex-start',
  },
  label: {
    fontSize: 10,
    fontWeight: fontWeight.bold,
  },
});
