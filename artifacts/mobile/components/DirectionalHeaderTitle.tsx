import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useRouter, useNavigation } from 'expo-router';
import { Feather } from '@expo/vector-icons';

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

export function HeaderBackButton({ isRTL }: { isRTL: boolean }) {
  const router = useRouter();
  const navigation = useNavigation();
  const colors = useColors();
  const chevron = isRTL ? 'chevron-right' : 'chevron-left';

  // Only render if navigation stack has a history to go back to
  if (!navigation.canGoBack()) {
    return null;
  }

  return (
    <TouchableOpacity
      onPress={() => router.back()}
      activeOpacity={0.7}
      style={{
        width: 36,
        height: 36,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.card,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Feather name={chevron} size={18} color={colors.foreground} />
    </TouchableOpacity>
  );
}

export function directionalHeaderOptions(title: string, isRTL: boolean) {
  return {
    title,
    headerTitleAlign: 'center' as const,
    headerBackVisible: false,
    headerLeft: isRTL
      ? () => null
      : () => <HeaderBackButton isRTL={false} />,
    headerRight: isRTL
      ? () => <HeaderBackButton isRTL={true} />
      : () => null,
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
