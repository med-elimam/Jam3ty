import React from 'react';
import { Modal, Platform, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { usePreferences } from '@/contexts/PreferencesContext';
import { showAlert } from '@/lib/alert';
import { ContentViewer, ViewableContent } from './ContentViewer';
import { fontSize, fontWeight, spacing } from '@/constants/theme';

/**
 * Fullscreen viewer shell: our own chrome (close, title, share) over the
 * ContentViewer dispatcher. The content itself never leaves the app.
 */
export function ViewerModal({
  visible,
  content,
  shareable = true,
  onClose,
}: {
  visible: boolean;
  content: ViewableContent;
  shareable?: boolean;
  onClose: () => void;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { t, isRTL } = usePreferences();

  const handleShare = async () => {
    if (!content.url) return;
    try {
      if (Platform.OS === 'web') {
        // RN's Navigator type doesn't know the web APIs — narrow through unknown.
        const nav = (typeof navigator !== 'undefined' ? navigator : undefined) as
          | { share?: (data: { title: string; url: string }) => Promise<void>; clipboard?: { writeText: (s: string) => Promise<void> } }
          | undefined;
        if (nav?.share) {
          await nav.share({ title: content.title, url: content.url });
        } else if (nav?.clipboard) {
          await nav.clipboard.writeText(content.url);
          showAlert(t('content.linkCopied'));
        }
        return;
      }
      await Share.share(
        Platform.OS === 'ios'
          ? { url: content.url, message: content.title }
          : { message: `${content.title}\n${content.url}` },
      );
    } catch {
      // User dismissed the share sheet — not an error.
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
      presentationStyle="fullScreen"
    >
      <View style={[s.root, { backgroundColor: colors.background }]}>
        {/* Top chrome */}
        <View
          style={[
            s.topBar,
            {
              flexDirection: isRTL ? 'row-reverse' : 'row',
              paddingTop: insets.top + spacing.sm,
              backgroundColor: colors.card,
              borderBottomColor: colors.border,
            },
          ]}
        >
          <TouchableOpacity
            onPress={onClose}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel={t('common.close')}
            style={[s.iconBtn, { backgroundColor: colors.muted }]}
          >
            <Feather name="x" size={18} color={colors.foreground} />
          </TouchableOpacity>

          <Text style={[s.title, { color: colors.foreground }]} numberOfLines={1}>
            {content.title}
          </Text>

          {shareable && content.url ? (
            <TouchableOpacity
              onPress={handleShare}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityRole="button"
              accessibilityLabel={t('content.share')}
              style={[s.iconBtn, { backgroundColor: colors.muted }]}
            >
              <Feather name="share-2" size={17} color={colors.foreground} />
            </TouchableOpacity>
          ) : (
            <View style={s.iconBtn} />
          )}
        </View>

        {/* Content */}
        <View style={{ flex: 1, paddingBottom: insets.bottom }}>
          <ContentViewer content={content} />
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  topBar: {
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.sm + 2,
    borderBottomWidth: 1,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { flex: 1, fontSize: fontSize.md, fontWeight: fontWeight.semibold, textAlign: 'center' },
});
