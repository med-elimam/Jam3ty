import React from 'react';
import {
  StyleProp,
  StyleSheet,
  TouchableOpacity,
  TouchableOpacityProps,
  View,
  ViewStyle,
} from 'react-native';
import { useColors } from '@/hooks/useColors';
import { radius, shadow, spacing } from '@/constants/theme';

interface CardProps {
  children: React.ReactNode;
  onPress?: TouchableOpacityProps['onPress'];
  style?: StyleProp<ViewStyle>;
  padding?: number;
  /** Show a colored left border accent */
  accent?: string;
}

export function Card({ children, onPress, style, padding = 20, accent }: CardProps) {
  const colors = useColors();

  const containerStyle: ViewStyle[] = [
    s.card,
    shadow.md,
    {
      backgroundColor: colors.card,
      borderRadius: 20,
      borderCurve: 'continuous',
      padding,
      borderWidth: 1,
      borderColor: colors.border,
    },
    accent ? { borderLeftWidth: 3.5, borderLeftColor: accent } : undefined,
    style,
  ].filter(Boolean) as ViewStyle[];

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.75} style={containerStyle}>
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={containerStyle}>{children}</View>;
}

const s = StyleSheet.create({
  card: {},
});
