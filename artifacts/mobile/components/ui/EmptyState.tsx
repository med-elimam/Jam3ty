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
      <View style={[s.iconCircle, { backgroundColor: colors.muted }]}>
        <Feather name={icon} size={24} color={colors.mutedForeground} />
      </View>
      <Text style={[s.title, { color: colors.foreground }]}>{title}</Text>
      {body && <Text style={[s.body, { color: colors.mutedForeground }]}>{body}</Text>}
      {actionLabel && onAction && (
        <View style={s.action}>
          <Button label={actionLabel} onPress={onAction} variant="primary" size="sm" fullWidth={false} />
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: spacing['2xl'],
    gap: spacing.sm,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  title: {
    fontSize: 15,
    fontWeight: fontWeight.semibold,
    textAlign: 'center',
  },
  body: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 280,
  },
  action: { marginTop: spacing.md },
});
