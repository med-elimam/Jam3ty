import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { radius } from '@/constants/theme';

import { LinearGradient } from 'expo-linear-gradient';

interface AvatarProps {
  name: string;
  size?: number;
  style?: ViewStyle | ViewStyle[];
  /** Override background color */
  bg?: string;
  /** Override text color */
  fg?: string;
}

export function Avatar({ name, size = 40, style, bg, fg }: AvatarProps) {
  const colors = useColors();

  const initials = (name ?? 'U')
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const innerContent = (
    <Text
      style={[
        s.text,
        {
          fontSize: size * 0.36,
          color: fg ?? (bg ? colors.primary : '#FFFFFF'),
        },
      ]}
    >
      {initials}
    </Text>
  );

  const containerStyle = [
    s.root,
    {
      width: size,
      height: size,
      borderRadius: size / 2,
      borderWidth: 1.5,
      borderColor: '#FFFFFF',
      overflow: 'hidden' as const,
    },
    style,
  ];

  if (bg) {
    return (
      <View style={[containerStyle, { backgroundColor: bg }]}>
        {innerContent}
      </View>
    );
  }

  return (
    <View style={containerStyle}>
      <LinearGradient
        colors={['#4F46E5', '#6366F1']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[StyleSheet.absoluteFill, s.root]}
      >
        {innerContent}
      </LinearGradient>
    </View>
  );
}

const s = StyleSheet.create({
  root: { alignItems: 'center', justifyContent: 'center' },
  text: { fontWeight: '700' },
});
