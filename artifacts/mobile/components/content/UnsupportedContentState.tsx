import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { usePreferences } from '@/contexts/PreferencesContext';
import { openExternalUrl } from '@/lib/urls';
import { showAlert } from '@/lib/alert';
import { fontSize, fontWeight, spacing } from '@/constants/theme';

/**
 * Shown for content the in-app viewer cannot render (Office files, arbitrary
 * external links). The ONLY sanctioned external open in the content system —
 * and only on an explicit user tap.
 */
export function UnsupportedContentState({
  url,
  canOpenExternally = true,
}: {
  url: string | null;
  canOpenExternally?: boolean;
}) {
  const colors = useColors();
  const { t, isRTL } = usePreferences();
  const [opening, setOpening] = useState(false);

  const handleOpen = async () => {
    if (!url || opening) return;
    setOpening(true);
    const ok = await openExternalUrl(url);
    setOpening(false);
    if (!ok) showAlert(t('common.errorTitle'), t('content.loadError'));
  };

  return (
    <View style={s.root}>
      <View style={[s.iconCircle, { backgroundColor: colors.muted }]}>
        <Feather name="file" size={22} color={colors.mutedForeground} />
      </View>
      <Text style={[s.title, { color: colors.foreground }]}>{t('content.unsupportedTitle')}</Text>
      <Text style={[s.body, { color: colors.mutedForeground }]}>{t('content.unsupportedBody')}</Text>

      {canOpenExternally && url && (
        <TouchableOpacity
          onPress={handleOpen}
          activeOpacity={0.75}
          disabled={opening}
          style={[s.externalBtn, { borderColor: colors.border, backgroundColor: colors.card, flexDirection: isRTL ? 'row-reverse' : 'row' }]}
        >
          <Feather name="external-link" size={15} color={colors.primary} />
          <Text style={[s.externalLabel, { color: colors.primary }]}>{t('content.openExternally')}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing['2xl'], gap: spacing.sm },
  iconCircle: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xs },
  title: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, textAlign: 'center' },
  body: { fontSize: fontSize.sm, textAlign: 'center', lineHeight: 19, maxWidth: 280 },
  externalBtn: {
    marginTop: spacing.md,
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm + 2,
    borderRadius: 12,
    borderCurve: 'continuous',
    borderWidth: 1,
  },
  externalLabel: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
});
