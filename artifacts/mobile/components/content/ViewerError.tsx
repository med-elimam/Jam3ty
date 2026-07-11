import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ErrorState } from '@/components/ui/ErrorState';

/** Centered failure state for the viewer, reusing the app-wide ErrorState. */
export function ViewerError({ onRetry }: { onRetry?: () => void }) {
  return (
    <View style={s.root}>
      <ErrorState onRetry={onRetry} />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, justifyContent: 'center' },
});
