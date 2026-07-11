import React, { useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { showAlert } from '@/lib/alert';
import { useLocalSearchParams } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { useListFiles, useToggleFileFavorite, ListFilesType, AcademicFile } from '@workspace/api-client-react';
import { getListFilesQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { GuestGate } from '@/components/GuestGate';
import { resolveFileUrl, openExternalUrl } from '@/lib/urls';
import { spacing, fontSize, fontWeight, radius, shadow } from '@/constants/theme';
import { usePreferences } from '@/contexts/PreferencesContext';

const FILE_TYPES: string[] = ['all', 'lecture', 'td', 'tp', 'summary', 'exam', 'correction', 'book'];
const FILE_ICON: Record<string, React.ComponentProps<typeof Feather>['name']> = {
  lecture: 'book-open', td: 'edit-3', tp: 'tool', summary: 'align-left',
  exam: 'file-text', correction: 'check-square', book: 'book', other: 'file',
};

export default function FilesScreen() {
  return (
    <GuestGate>
      <FilesScreenInner />
    </GuestGate>
  );
}

function FilesScreenInner() {
  const colors = useColors();
  const { t, isRTL } = usePreferences();
  const qc = useQueryClient();
  const params = useLocalSearchParams<{ courseId?: string; courseName?: string }>();
  const [search, setSearch] = useState('');
  const [activeType, setActiveType] = useState('all');
  const [courseFilter, setCourseFilter] = useState<string | undefined>(
    typeof params.courseId === 'string' && params.courseId ? params.courseId : undefined,
  );

  const { data, isLoading, isError, refetch, isRefetching } = useListFiles({
    search: search || undefined,
    type: (activeType === 'all' ? undefined : activeType) as ListFilesType | undefined,
    courseId: courseFilter,
  });
  const toggleFav = useToggleFileFavorite({
    mutation: { onSuccess: () => qc.invalidateQueries({ queryKey: getListFilesQueryKey() }) },
  });

  const files: AcademicFile[] = data?.data ?? [];
  const rowDir = { flexDirection: isRTL ? 'row-reverse' : 'row' } as const;
  const align = { textAlign: isRTL ? 'right' : 'left' } as const;

  const openFile = async (file: AcademicFile) => {
    const url = resolveFileUrl(file.fileUrl);
    if (!url) {
      showAlert(t('common.error'), t('files.noUrl'));
      return;
    }
    const opened = await openExternalUrl(url);
    if (!opened) showAlert(t('common.error'), t('files.openError'));
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Search bar */}
      <View style={[s.searchBar, rowDir, shadow.sm, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Feather name="search" size={16} color={colors.mutedForeground} />
        <TextInput
          style={[s.searchInput, { color: colors.foreground }]}
          placeholder={t('files.searchPlaceholder')}
          placeholderTextColor={colors.mutedForeground}
          value={search}
          onChangeText={setSearch}
          textAlign={isRTL ? 'right' : 'left'}
        />
      </View>

      {/* Active course filter (navigated from a course page) */}
      {courseFilter && (
        <View style={[s.courseChipRow, rowDir]}>
          <View style={[s.courseChip, rowDir, { backgroundColor: colors.primary + '12' }]}>
            <Feather name="book-open" size={13} color={colors.primary} />
            <Text style={[s.courseChipText, { color: colors.primary }]} numberOfLines={1}>
              {typeof params.courseName === 'string' && params.courseName ? params.courseName : t('files.courseFilter')}
            </Text>
            <TouchableOpacity onPress={() => setCourseFilter(undefined)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Feather name="x" size={14} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Horizontal filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[s.chipRow, rowDir]}
      >
        {FILE_TYPES.map((key) => {
          const active = activeType === key;
          return (
            <TouchableOpacity
              key={key}
              activeOpacity={0.75}
              style={[
                s.chip,
                {
                  backgroundColor: active ? colors.primary : colors.card,
                  borderColor: active ? colors.primary : colors.border,
                },
              ]}
              onPress={() => setActiveType(key)}
            >
              <Text style={[s.chipLabel, { color: active ? '#fff' : colors.mutedForeground }]}>
                {t(`fileTypes.${key}`)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {isLoading ? (
        <ActivityIndicator color={colors.primary} size="large" style={{ marginTop: 40 }} />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : (
        <FlatList
          data={files}
          keyExtractor={(f) => f.id}
          contentContainerStyle={s.list}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
          ListEmptyComponent={
            <EmptyState icon="folder" title={t('files.empty')} body={t('files.emptyBody')} />
          }
          renderItem={({ item }: { item: AcademicFile }) => (
            <Card onPress={() => openFile(item)} style={[s.fileCard, rowDir]}>
              <View style={[s.fileIcon, { backgroundColor: colors.primary + '12' }]}>
                <Feather name={FILE_ICON[item.fileType] ?? 'file'} size={22} color={colors.primary} />
              </View>
              <View style={s.fileInfo}>
                <Text style={[s.fileName, { color: colors.foreground }, align]} numberOfLines={2}>{item.title}</Text>
                <Text style={[s.fileMeta, { color: colors.mutedForeground }, align]}>
                  {item.uploaderName} · {t(`fileTypes.${item.fileType}`)}
                </Text>
                {item.courseName && <Text style={[s.fileCourse, { color: colors.primary }, align]}>{item.courseName}</Text>}
              </View>
              <TouchableOpacity onPress={() => toggleFav.mutate({ fileId: item.id })} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Feather name="heart" size={20} color={item.isFavorited ? colors.destructive : colors.border} />
              </TouchableOpacity>
            </Card>
          )}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  searchBar: {
    alignItems: 'center', gap: spacing.sm,
    margin: spacing.base, marginBottom: spacing.sm,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md - 1,
    borderRadius: 16,
    borderCurve: 'continuous',
    borderWidth: 1,
  },
  searchInput: { flex: 1, fontSize: fontSize.md },

  // ── Active course filter chip ────────────────────────────────────────
  courseChipRow: { paddingHorizontal: spacing.base, paddingBottom: spacing.sm },
  courseChip: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: 10,
    borderCurve: 'continuous',
    maxWidth: '80%',
  },
  courseChipText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, flexShrink: 1 },

  // ── Horizontal filter chips ──────────────────────────────────────────
  chipRow: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    height: 32,
    borderRadius: 9999,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipLabel: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },

  list: { paddingHorizontal: spacing.base, paddingBottom: 100, gap: spacing.sm },
  fileCard: { alignItems: 'center', gap: spacing.md },
  fileIcon: { width: 48, height: 48, borderRadius: 10, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  fileInfo: { flex: 1 },
  fileName: { fontSize: fontSize.base, fontWeight: fontWeight.semibold },
  fileMeta: { fontSize: fontSize.sm, marginTop: 2 },
  fileCourse: { fontSize: fontSize.xs, marginTop: 2 },
});
