import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableOpacityProps,
  View,
} from 'react-native';
import { useColors } from '@/hooks/useColors';
import { radius, fontSize, fontWeight, spacing } from '@/constants/theme';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'gold';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends Omit<TouchableOpacityProps, 'style'> {
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
  style?: import('react-native').ViewStyle;
}

export function Button({
  label,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  fullWidth = true,
  disabled,
  style,
  ...rest
}: ButtonProps) {
  const colors = useColors();
  const isDisabled = disabled || loading;

  const bg: Record<ButtonVariant, string> = {
    primary: colors.navy,
    secondary: colors.secondary,
    outline: 'transparent',
    ghost: 'transparent',
    danger: colors.destructive,
    gold: colors.gold,
  };

  const textColor: Record<ButtonVariant, string> = {
    primary: '#fff',
    secondary: colors.navy,
    outline: colors.navy,
    ghost: colors.navy,
    danger: '#fff',
    gold: '#1A1A2E',
  };

  const borderColor: Record<ButtonVariant, string | undefined> = {
    primary: undefined,
    secondary: undefined,
    outline: colors.navy,
    ghost: undefined,
    danger: undefined,
    gold: undefined,
  };

  const pad: Record<ButtonSize, { paddingVertical: number; paddingHorizontal: number }> = {
    sm: { paddingVertical: 8, paddingHorizontal: spacing.md },
    md: { paddingVertical: 13, paddingHorizontal: spacing.base },
    lg: { paddingVertical: 17, paddingHorizontal: spacing.xl },
  };

  const textSize: Record<ButtonSize, number> = {
    sm: fontSize.sm,
    md: fontSize.md,
    lg: fontSize.lg,
  };

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      disabled={isDisabled}
      style={[
        s.btn,
        pad[size],
        { backgroundColor: bg[variant], borderRadius: radius.lg },
        borderColor[variant] ? { borderWidth: 1.5, borderColor: borderColor[variant] } : undefined,
        fullWidth && { alignSelf: 'stretch' },
        isDisabled && s.disabled,
        style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={textColor[variant]} size="small" />
      ) : (
        <View style={s.inner}>
          {icon && <View style={s.icon}>{icon}</View>}
          <Text style={[s.label, { color: textColor[variant], fontSize: textSize[size] }]}>
            {label}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  btn: { alignItems: 'center', justifyContent: 'center' },
  inner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  icon: {},
  label: { fontWeight: fontWeight.bold, textAlign: 'center' },
  disabled: { opacity: 0.5 },
});
