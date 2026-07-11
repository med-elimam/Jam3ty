import React from 'react';
import { TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';

/**
 * A compact bell button for tab headers that deep-links to notifications.
 * Mirrors the Home header bell; reused as a `headerRight` for root tabs.
 */
export function HeaderNotificationButton() {
  const colors = useColors();
  const router = useRouter();

  return (
    <TouchableOpacity
      onPress={() => router.push('/notifications')}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel="Notifications"
      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      style={{
        width: 36,
        height: 36,
        borderRadius: 18,
        borderCurve: 'continuous',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.muted,
        marginHorizontal: 12,
      }}
    >
      <Feather name="bell" size={18} color={colors.foreground} />
    </TouchableOpacity>
  );
}
