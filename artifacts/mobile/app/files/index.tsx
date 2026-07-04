import React, { useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useListFiles, useToggleFileFavorite, ListFilesType } from '@workspace/api-client-react';
import { getListFilesQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { spacing, fontSize, fontWeight, radius } from '@/constants/theme';
import { usePreferences } from '@/contexts/PreferencesContext';

const FILE_TYPES: string[] = ['all', 'lecture', 'td', 'tp', 'summary', 'exam', 'correction', 'book'];
const FILE_ICON: Record<string, React.ComponentProps<typeof Feather>['name']> = {
  lecture: 'book-open', td: 'edit-3', tp: 'tool', summary: 'align-left',
  exam: 'file-text', correction: 'check-square', book: 'book', other: 'file',
};

export default function FilesScreen() {
  const colors = useColors();
  const { t, isRTL } = usePreferences();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [activeType, setActiveType] = useState('all');

  const { data, isLoading, refetch, isRefetching } = useListFiles({
    search: search || undefined,
    type: (activeType === 'all' ? undefined : activeType) as ListFilesType | undefined,
  });
  const toggleFav = useToggleFileFavorite({
    mutation: { onSuccess: () => qc.invalidateQueries({ queryKey: getListFilesQueryKey() }) },
  });

  const files: any[] = (data as any)?.data ?? [];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Search bar */}
      <View style={[s.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
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

      {/* Horizontal filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[s.chipRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
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
                  backgroundColor: active ? colors.navy : colors.card,
                  borderColor: active ? colors.navy : colors.border,
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
        <ActivityIndicator color={colors.navy} size="large" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={files}
          keyExtractor={(f: any) => f.id}
          contentContainerStyle={s.list}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.navy} />}
          ListEmptyComponent={
            <EmptyState icon="folder" title={t('files.empty')} body={t('files.emptyBody')} />
          }
          renderItem={({ item }: { item: any }) => (
            <Card style={s.fileCard}>
              <View style={[s.fileIcon, { backgroundColor: colors.navy + '12' }]}>
                <Feather name={FILE_ICON[item.fileType] ?? 'file'} size={22} color={colors.navy} />
              </View>
              <View style={s.fileInfo}>
                <Text style={[s.fileName, { color: colors.foreground }]} numberOfLines={2}>{item.title}</Text>
                <Text style={[s.fileMeta, { color: colors.mutedForeground }]}>
                  {item.uploaderName} · {t(`fileTypes.${item.fileType}`)}
                </Text>
                {item.courseName && <Text style={[s.fileCourse, { color: colors.navy }]}>{item.courseName}</Text>}
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
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    margin: spacing.base, marginBottom: spacing.sm,
    padding: spacing.md, borderRadius: radius.lg, borderWidth: 1,
  },
  searchInput: { flex: 1, fontSize: fontSize.md },

  // ── Horizontal filter chips ──────────────────────────────────────────
  chipRow: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    height: 32,
    borderRadius: radius.full,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipLabel: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },

  list: { paddingHorizontal: spacing.base, paddingBottom: 100, gap: spacing.sm },
  fileCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  fileIcon: { width: 48, height: 48, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  fileInfo: { flex: 1 },
  fileName: { fontSize: fontSize.base, fontWeight: fontWeight.semibold, textAlign: 'right' },
  fileMeta: { fontSize: fontSize.sm, marginTop: 2, textAlign: 'right' },
  fileCourse: { fontSize: fontSize.xs, marginTop: 2, textAlign: 'right' },
});
