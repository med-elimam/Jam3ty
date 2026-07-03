import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { Button } from './Button';
import { fontSize, fontWeight, spacing, radius } from '@/constants/theme';

interface EmptyStateProps {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  body?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon, title, body, actionLabel, onAction }: EmptyStateProps) {
  const colors = useColors();

  return (
    <View style={s.root}>
      <View style={[s.iconCircle, { backgroundColor: colors.secondary }]}>
        <View style={[s.iconInner, { backgroundColor: colors.navy + '15' }]}>
          <Feather name={icon} size={36} color={colors.navy} />
        </View>
      </View>
      <Text style={[s.title, { color: colors.foreground }]}>{title}</Text>
      {body && <Text style={[s.body, { color: colors.mutedForeground }]}>{body}</Text>}
      {actionLabel && onAction && (
        <View style={s.action}>
          <Button label={actionLabel} onPress={onAction} variant="outline" size="sm" fullWidth={false} />
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    alignItems: 'center',
    paddingTop: spacing['3xl'],
    paddingHorizontal: spacing['2xl'],
    gap: spacing.md,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  iconInner: {
    width: 72,
    height: 72,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    textAlign: 'center',
  },
  body: {
    fontSize: fontSize.base,
    textAlign: 'center',
    lineHeight: fontSize.base * 1.6,
  },
  action: { marginTop: spacing.sm },
});
