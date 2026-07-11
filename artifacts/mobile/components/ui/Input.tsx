import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { fontSize, fontWeight, radius, spacing } from '@/constants/theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
  isPassword?: boolean;
}

export function Input({ label, error, containerStyle, isPassword, ...rest }: InputProps) {
  const colors = useColors();
  const [focused, setFocused] = useState(false);
  const [visible, setVisible] = useState(false);

  return (
    <View style={[s.wrapper, containerStyle]}>
      {label && <Text style={[s.label, { color: colors.foreground }]}>{label}</Text>}
      <View
        style={[
          s.inputRow,
          {
            borderColor: error
              ? colors.destructive
              : focused
              ? colors.primary
              : colors.border,
            borderWidth: focused || error ? 1.5 : 1,
            backgroundColor: colors.card,
            borderRadius: 14,
            borderCurve: 'continuous',
            boxShadow: focused ? '0 4px 12px rgba(79, 70, 229, 0.08)' : undefined,
          },
        ]}
      >
        <TextInput
          style={[s.input, { color: colors.foreground }]}
          placeholderTextColor={colors.mutedForeground}
          textAlign="right"
          secureTextEntry={isPassword && !visible}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...rest}
        />
        {isPassword && (
          <TouchableOpacity onPress={() => setVisible((v) => !v)} style={s.eyeBtn}>
            <Feather name={visible ? 'eye-off' : 'eye'} size={18} color={colors.mutedForeground} />
          </TouchableOpacity>
        )}
      </View>
      {error && <Text style={[s.error, { color: colors.destructive }]}>{error}</Text>}
    </View>
  );
}

const s = StyleSheet.create({
  wrapper: { gap: spacing.xs },
  label: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    textAlign: 'right',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    minHeight: 48,
  },
  input: {
    flex: 1,
    fontSize: fontSize.md,
    paddingVertical: 12,
  },
  eyeBtn: { padding: spacing.xs },
  error: { fontSize: fontSize.xs, textAlign: 'right' },
});
