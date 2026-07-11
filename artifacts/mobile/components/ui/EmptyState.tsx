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
  const isDark = colors.background === '#0B0F19';

  return (
    <View style={s.root}>
      <View style={[s.iconCircle, { backgroundColor: isDark ? 'rgba(99, 102, 241, 0.15)' : '#EEF2FF' }]}>
        <Feather name={icon} size={32} color={isDark ? '#818CF8' : '#4F46E5'} />
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
    paddingVertical: 40,
    paddingHorizontal: spacing['2xl'],
    gap: spacing.sm,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  title: {
    fontSize: 18,
    fontWeight: fontWeight.bold,
    textAlign: 'center',
  },
  body: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
  action: { marginTop: spacing.md },
});
