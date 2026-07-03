import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { Edge, SafeAreaView } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';

interface ScreenProps {
  children: React.ReactNode;
  /**
   * Which edges to apply safe-area insets to. Defaults to top + bottom.
   * Screens rendered inside a Stack/Tabs header usually pass `['bottom']`
   * (or `['left','right','bottom']`) because the header already covers the top.
   */
  edges?: Edge[];
  style?: ViewStyle;
  /** Override the background color (defaults to theme background). */
  backgroundColor?: string;
}

/**
 * Reusable safe-area screen wrapper. Guarantees content never sits under the
 * status bar / notch or behind the tab bar. Use on every screen.
 */
export function Screen({ children, edges = ['top', 'bottom'], style, backgroundColor }: ScreenProps) {
  const colors = useColors();
  return (
    <SafeAreaView
      edges={edges}
      style={[styles.root, { backgroundColor: backgroundColor ?? colors.background }, style]}
    >
      {children}
    </SafeAreaView>
  );
}

/** Non-safe plain container sharing the same background, for rare cases. */
export function ScreenPlain({ children, style, backgroundColor }: Omit<ScreenProps, 'edges'>) {
  const colors = useColors();
  return (
    <View style={[styles.root, { backgroundColor: backgroundColor ?? colors.background }, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
