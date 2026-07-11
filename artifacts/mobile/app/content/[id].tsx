import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import {
  useGetFile,
  useRecordFileView,
  useToggleFileFavorite,
  getGetFileQueryKey,
  getListFilesQueryKey,
} from '@workspace/api-client-react';
import { useColors } from '@/hooks/useColors';
import { usePreferences } from '@/contexts/PreferencesContext';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/ErrorState';
import { GuestGate } from '@/components/GuestGate';
import { ViewerModal } from '@/components/content/ViewerModal';
import { resolveFileUrl } from '@/lib/urls';
import { deriveContentKind, FILE_ICON, KIND_ICON, formatFileSize } from '@/lib/content';
import { hydratePositions } from '@/lib/viewerPositions';
import { spacing, fontSize, fontWeight } from '@/constants/theme';

export default function ContentScreen() {
  return (
    <GuestGate>
      <ContentScreenInner />
    </GuestGate>
  );
}

function ContentScreenInner() {
  const colors = useColors();
  const { t, isRTL, language } = usePreferences();
  const qc = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data, isLoading, isError, refetch } = useGetFile(id ?? '', {
    query: { enabled: !!id, queryKey: getGetFileQueryKey(id ?? '') },
  });
  const file = data?.data;

  const [viewerOpen, setViewerOpen] = useState(false);
  const [positionsReady, setPositionsReady] = useState(false);
  const viewRecorded = useRef(false);

  const recordView = useRecordFileView();
  const toggleFav = useToggleFileFavorite({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListFilesQueryKey() });
        if (id) qc.invalidateQueries({ queryKey: getGetFileQueryKey(id) });
      },
    },
  });

  // Position memory must be hydrated before the viewer reads it synchronously.
  useEffect(() => {
    hydratePositions().then(() => setPositionsReady(true));
  }, []);

  const rowDir = { flexDirection: isRTL ? 'row-reverse' : 'row' } as const;
  const align = { textAlign: isRTL ? 'right' : 'left' } as const;

  if (isLoading) {
    return (
      <View style={[s.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (isError || !file) {
    return (
      <View style={[s.center, { backgroundColor: colors.background }]}>
        <ErrorState onRetry={() => refetch()} />
      </View>
    );
  }

  const url = resolveFileUrl(file.fileUrl);
  const kind = url ? deriveContentKind(file.mimeType, url) : 'unsupported';
  const sizeLabel = formatFileSize(file.fileSize);
  const dateLabel = file.createdAt
    ? new Date(file.createdAt).toLocaleDateString(language === 'ar' ? 'ar' : 'fr-FR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  const openViewer = () => {
    setViewerOpen(true);
    if (!viewRecorded.current && id) {
      viewRecorded.current = true;
      recordView.mutate({ fileId: id }); // fire-and-forget
    }
  };

  const metaRows: { icon: keyof typeof Feather.glyphMap; label: string; value: string }[] = [];
  if (file.courseName) metaRows.push({ icon: 'book-open', label: t('content.course'), value: file.courseName });
  if (file.uploaderName) metaRows.push({ icon: 'user', label: t('content.uploader'), value: file.uploaderName });
  if (dateLabel) metaRows.push({ icon: 'calendar', label: t('content.uploadedAt'), value: dateLabel });
  if (sizeLabel) metaRows.push({ icon: 'hard-drive', label: t('content.size'), value: sizeLabel });
  if (file.viewCount != null)
    metaRows.push({ icon: 'eye', label: t('content.views'), value: String(file.viewCount) });

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {/* ── Header card ── */}
        <Card padding={20}>
          <View style={s.headerBlock}>
            <View style={[s.iconCircle, { backgroundColor: colors.primary + '12', borderColor: colors.primary + '28' }]}>
              <Feather name={FILE_ICON[file.fileType] ?? KIND_ICON[kind]} size={26} color={colors.primary} />
            </View>

            <Text style={[s.title, { color: colors.foreground }]}>{file.title}</Text>

            <View style={[s.badgeRow, rowDir]}>
              <Badge label={t(`fileTypes.${file.fileType}`)} color="primary" />
              {file.isFavorited && <Badge label="♥" color="danger" />}
            </View>
          </View>

          <View style={[s.rule, { backgroundColor: colors.border }]} />

          {/* ── Metadata rows ── */}
          <View style={s.metaList}>
            {metaRows.map((row) => (
              <View key={row.label} style={[s.metaRow, rowDir]}>
                <View style={[s.metaLabelWrap, rowDir]}>
                  <Feather name={row.icon} size={14} color={colors.mutedForeground} />
                  <Text style={[s.metaLabel, { color: colors.mutedForeground }]}>{row.label}</Text>
                </View>
                <Text style={[s.metaValue, { color: colors.foreground }, align]} numberOfLines={2}>
                  {row.value}
                </Text>
              </View>
            ))}
          </View>
        </Card>

        {/* ── Actions ── */}
        <Button
          label={t('content.open')}
          onPress={openViewer}
          variant="primary"
          fullWidth
          disabled={!positionsReady}
          icon={<Feather name={KIND_ICON[kind]} size={16} color={colors.primaryForeground} />}
        />

        <TouchableOpacity
          onPress={() => id && toggleFav.mutate({ fileId: id })}
          activeOpacity={0.75}
          style={[s.favBtn, rowDir, { borderColor: colors.border, backgroundColor: colors.card }]}
        >
          <Feather
            name="heart"
            size={16}
            color={file.isFavorited ? colors.destructive : colors.mutedForeground}
          />
          <Text style={[s.favLabel, { color: colors.foreground }]}>
            {file.isFavorited ? t('content.unfavorite') : t('content.favorite')}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <ViewerModal
        visible={viewerOpen}
        onClose={() => setViewerOpen(false)}
        content={{
          id: file.id,
          title: file.title,
          mimeType: file.mimeType,
          url,
        }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center' },
  content: { padding: spacing.base, paddingBottom: 100, gap: spacing.base },
  headerBlock: { alignItems: 'center', gap: spacing.md },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, textAlign: 'center', lineHeight: fontSize.lg * 1.35 },
  badgeRow: { alignItems: 'center', gap: spacing.sm },
  rule: { height: 1, marginVertical: spacing.base },
  metaList: { gap: spacing.md },
  metaRow: { alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  metaLabelWrap: { alignItems: 'center', gap: spacing.sm, flexShrink: 0 },
  metaLabel: { fontSize: fontSize.sm },
  metaValue: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, flex: 1 },
  favBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: 12,
    borderCurve: 'continuous',
    borderWidth: 1,
  },
  favLabel: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
});
