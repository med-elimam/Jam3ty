import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Pdf from 'react-native-pdf';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { usePreferences } from '@/contexts/PreferencesContext';
import { getCachedFileUri } from '@/lib/fileCache';
import { getPosition, savePosition } from '@/lib/viewerPositions';
import { ViewerLoading } from './ViewerLoading';
import { ViewerError } from './ViewerError';
import { fontSize, fontWeight, spacing } from '@/constants/theme';

/**
 * Native in-app PDF viewer (react-native-pdf): paging, pinch zoom, page
 * indicator with go-to-page, position memory. The file is served from the
 * local cache (downloaded on first open) so reopening is instant.
 *
 * Known limitation (documented in the plan): no text search in v1 —
 * react-native-pdf exposes no search API.
 */
export function PdfViewer({ fileId, uri }: { fileId: string; uri: string }) {
  const colors = useColors();
  const { t, isRTL } = usePreferences();

  const [localUri, setLocalUri] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [jumpOpen, setJumpOpen] = useState(false);
  const [jumpValue, setJumpValue] = useState('');
  const pdfRef = useRef<Pdf>(null);
  const initialPage = useRef<number>(getPosition(fileId, 'page') ?? 1);

  useEffect(() => {
    let cancelled = false;
    setError(false);
    setLocalUri(null);
    getCachedFileUri(uri, (r) => !cancelled && setProgress(r))
      .then((u) => !cancelled && setLocalUri(u))
      .catch(() => !cancelled && setError(true));
    return () => {
      cancelled = true;
    };
  }, [uri]);

  const goToPage = () => {
    const n = parseInt(jumpValue, 10);
    if (Number.isFinite(n) && n >= 1 && (total === 0 || n <= total)) {
      pdfRef.current?.setPage(n);
    }
    setJumpOpen(false);
    setJumpValue('');
  };

  if (error) {
    return (
      <ViewerError
        onRetry={() => {
          setError(false);
          setLocalUri(null);
          getCachedFileUri(uri, setProgress).then(setLocalUri).catch(() => setError(true));
        }}
      />
    );
  }

  if (!localUri) return <ViewerLoading progress={progress} />;

  return (
    <View style={s.root}>
      <Pdf
        ref={pdfRef}
        source={{ uri: localUri, cache: true }}
        page={initialPage.current}
        style={[s.pdf, { backgroundColor: colors.background }]}
        trustAllCerts={false}
        onLoadComplete={(numberOfPages) => setTotal(numberOfPages)}
        onPageChanged={(p, n) => {
          setPage(p);
          setTotal(n);
          savePosition(fileId, 'page', p);
        }}
        onError={() => setError(true)}
        renderActivityIndicator={() => <ViewerLoading />}
      />

      {/* Page indicator / go-to-page */}
      <View style={[s.pageBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {jumpOpen ? (
          <View style={[s.jumpRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <TextInput
              style={[s.jumpInput, { color: colors.foreground, borderColor: colors.border }]}
              value={jumpValue}
              onChangeText={setJumpValue}
              keyboardType="number-pad"
              placeholder={t('content.goToPage')}
              placeholderTextColor={colors.mutedForeground}
              autoFocus
              onSubmitEditing={goToPage}
              returnKeyType="go"
            />
            <TouchableOpacity onPress={goToPage} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Feather name="corner-down-left" size={18} color={colors.primary} />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity onPress={() => setJumpOpen(true)} activeOpacity={0.7}>
            <Text style={[s.pageText, { color: colors.foreground }]}>
              {page} / {total || '…'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  pdf: { flex: 1 },
  pageBar: {
    position: 'absolute',
    bottom: spacing.lg,
    alignSelf: 'center',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    minWidth: 76,
    alignItems: 'center',
  },
  pageText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, fontVariant: ['tabular-nums'] },
  jumpRow: { alignItems: 'center', gap: spacing.sm },
  jumpInput: {
    minWidth: 90,
    fontSize: fontSize.sm,
    borderBottomWidth: 1,
    paddingVertical: 2,
    textAlign: 'center',
  },
});
