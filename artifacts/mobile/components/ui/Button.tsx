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
    primary: colors.primary,
    secondary: '#FFFFFF',
    outline: 'transparent',
    ghost: 'transparent',
    danger: colors.destructive,
    gold: colors.gold,
  };

  const textColor: Record<ButtonVariant, string> = {
    primary: '#FFFFFF',
    secondary: colors.primary,
    outline: colors.primary,
    ghost: colors.primary,
    danger: '#FFFFFF',
    gold: '#FFFFFF',
  };

  const borderColor: Record<ButtonVariant, string | undefined> = {
    primary: undefined,
    secondary: colors.primary,
    outline: colors.border,
    ghost: undefined,
    danger: undefined,
    gold: undefined,
  };

  const pad: Record<ButtonSize, { paddingVertical: number; paddingHorizontal: number }> = {
    sm: { paddingVertical: 8, paddingHorizontal: spacing.md },
    md: { paddingVertical: 12, paddingHorizontal: spacing.base },
    lg: { paddingVertical: 16, paddingHorizontal: spacing.xl },
  };

  const textSize: Record<ButtonSize, number> = {
    sm: fontSize.sm,
    md: fontSize.md,
    lg: fontSize.lg,
  };

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      disabled={isDisabled}
      style={[
        s.btn,
        pad[size],
        { backgroundColor: bg[variant], borderRadius: 12, borderCurve: 'continuous' },
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
