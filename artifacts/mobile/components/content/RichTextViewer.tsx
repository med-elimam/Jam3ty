import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { usePreferences } from '@/contexts/PreferencesContext';
import { openExternalUrl } from '@/lib/urls';
import { showAlert } from '@/lib/alert';
import { fontSize, fontWeight, lineHeight, spacing } from '@/constants/theme';

const URL_RE = /(https?:\/\/[^\s<>"')\]]+)/g;

/**
 * Article-style rendering for plain-text content (announcements, descriptions):
 * title, meta row, paragraphs split on blank lines, tappable bare URLs
 * (consented external open). RTL-aware. No markdown dependency.
 */
export function RichTextViewer({
  title,
  meta,
  body,
}: {
  title?: string;
  meta?: string;
  body: string;
}) {
  const colors = useColors();
  const { t, isRTL } = usePreferences();
  const align = { textAlign: isRTL ? 'right' : 'left' } as const;

  const paragraphs = useMemo(
    () => body.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean),
    [body],
  );

  const openLink = async (url: string) => {
    const ok = await openExternalUrl(url);
    if (!ok) showAlert(t('common.errorTitle'), t('content.loadError'));
  };

  const renderParagraph = (text: string, idx: number) => {
    const parts = text.split(URL_RE);
    return (
      <Text key={idx} style={[s.paragraph, align, { color: colors.foreground }]}>
        {parts.map((part, i) =>
          /^https?:\/\//i.test(part) ? (
            <Text
              key={i}
              style={{ color: colors.primary, textDecorationLine: 'underline' }}
              onPress={() => openLink(part)}
            >
              {part}
            </Text>
          ) : (
            part
          ),
        )}
      </Text>
    );
  };

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
      {title ? <Text style={[s.title, align, { color: colors.foreground }]}>{title}</Text> : null}
      {meta ? <Text style={[s.meta, align, { color: colors.mutedForeground }]}>{meta}</Text> : null}
      {(title || meta) && <View style={[s.rule, { backgroundColor: colors.border }]} />}
      {paragraphs.map(renderParagraph)}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: spacing['3xl'], gap: spacing.base },
  title: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, lineHeight: fontSize.xl * lineHeight.tight },
  meta: { fontSize: fontSize.sm, marginTop: -spacing.sm },
  rule: { height: 1, marginVertical: spacing.xs },
  paragraph: { fontSize: fontSize.md, lineHeight: fontSize.md * lineHeight.relaxed },
});
