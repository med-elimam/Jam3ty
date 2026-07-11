import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { useColors } from '@/hooks/useColors';

interface DirectionalHeaderTitleProps {
  title: string;
  isRTL: boolean;
}

function DirectionalHeaderTitle({ title, isRTL }: DirectionalHeaderTitleProps) {
  const colors = useColors();
  return (
    <Text
      accessibilityRole="header"
      numberOfLines={1}
      style={[styles.title, { color: colors.foreground }, isRTL ? styles.rtl : styles.ltr]}
    >
      {title}
    </Text>
  );
}

/**
 * React Navigation's native-stack web header supports left/center title alignment,
 * but not right. Keep the real route title for labels/document metadata and render
 * Arabic titles in the header's right slot so they reach the far edge on web.
 */
export function directionalHeaderOptions(title: string, isRTL: boolean) {
  return {
    title,
    headerTitleAlign: 'left' as const,
    headerTitle: isRTL
      ? () => null
      : () => <DirectionalHeaderTitle title={title} isRTL={false} />,
    headerRight: isRTL
      ? () => <DirectionalHeaderTitle title={title} isRTL />
      : undefined,
  };
}

const styles = StyleSheet.create({
  title: {
    fontSize: 17,
    fontWeight: '700',
    maxWidth: '100%',
  },
  rtl: {
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  ltr: {
    textAlign: 'left',
    writingDirection: 'ltr',
  },
});
