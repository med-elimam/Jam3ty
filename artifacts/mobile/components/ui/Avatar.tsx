import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { radius } from '@/constants/theme';

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

  return (
    <View
      style={[
        s.root,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: bg ?? colors.navy + '20',
        },
        style,
      ]}
    >
      <Text
        style={[
          s.text,
          {
            fontSize: size * 0.36,
            color: fg ?? colors.navy,
          },
        ]}
      >
        {initials}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { alignItems: 'center', justifyContent: 'center' },
  text: { fontWeight: '700' },
});
