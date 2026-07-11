import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { fontSize, fontWeight, spacing } from '@/constants/theme';

/** Centered loading state for the viewer; shows download progress when known. */
export function ViewerLoading({ progress }: { progress?: number | null }) {
  const colors = useColors();
  const pct = progress != null && progress > 0 && progress < 1 ? Math.round(progress * 100) : null;

  return (
    <View style={s.root}>
      <ActivityIndicator size="large" color={colors.primary} />
      {pct != null && (
        <Text style={[s.pct, { color: colors.mutedForeground }]}>{pct}%</Text>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  pct: { fontSize: fontSize.sm, fontWeight: fontWeight.medium },
});
