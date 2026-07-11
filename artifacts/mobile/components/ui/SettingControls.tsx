import React from 'react';
import { StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { usePreferences } from '@/contexts/PreferencesContext';
import { spacing, fontSize, fontWeight } from '@/constants/theme';

/** A single-select option row with a check mark on the selected item. */
export function OptionRow({
  label,
  selected,
  onPress,
  last = false,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  last?: boolean;
}) {
  const colors = useColors();
  const { isRTL } = usePreferences();
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[
        s.row,
        { flexDirection: isRTL ? 'row-reverse' : 'row' },
        !last && { borderBottomWidth: 1, borderBottomColor: colors.border },
      ]}
    >
      <Text style={[s.label, { color: colors.foreground, textAlign: isRTL ? 'right' : 'left' }]}>{label}</Text>
      {selected && <Feather name="check" size={20} color={colors.primary} />}
    </TouchableOpacity>
  );
}

/** A labelled on/off toggle row. */
export function ToggleRow({
  label,
  value,
  onValueChange,
  last = false,
}: {
  label: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  last?: boolean;
}) {
  const colors = useColors();
  const { isRTL } = usePreferences();
  return (
    <View
      style={[
        s.row,
        { flexDirection: isRTL ? 'row-reverse' : 'row' },
        !last && { borderBottomWidth: 1, borderBottomColor: colors.border },
      ]}
    >
      <Text style={[s.label, { color: colors.foreground, textAlign: isRTL ? 'right' : 'left' }]}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.border, true: colors.primary }}
        thumbColor="#fff"
      />
    </View>
  );
}

const s = StyleSheet.create({
  row: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.base,
    gap: spacing.md,
  },
  label: { flex: 1, fontSize: fontSize.md, fontWeight: fontWeight.medium },
});
