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

const FILE_TYPES: { key: string; label: string }[] = [
  { key: 'all', label: 'الكل' }, { key: 'lecture', label: 'محاضرة' }, { key: 'td', label: 'TD' },
  { key: 'tp', label: 'TP' }, { key: 'summary', label: 'ملخص' }, { key: 'exam', label: 'امتحان' },
  { key: 'correction', label: 'تصحيح' }, { key: 'book', label: 'كتاب' },
];
const FILE_ICON: Record<string, React.ComponentProps<typeof Feather>['name']> = {
  lecture: 'book-open', td: 'edit-3', tp: 'tool', summary: 'align-left',
  exam: 'file-text', correction: 'check-square', book: 'book', other: 'file',
};
const FILE_TYPE_AR: Record<string, string> = {
  lecture: 'محاضرة', td: 'TD', tp: 'TP', summary: 'ملخص',
  exam: 'امتحان', correction: 'تصحيح', book: 'كتاب', other: 'أخرى',
};

export default function FilesScreen() {
  const colors = useColors();
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
      <View style={[s.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Feather name="search" size={16} color={colors.mutedForeground} />
        <TextInput
          style={[s.searchInput, { color: colors.foreground }]}
          placeholder="ابحث عن ملف…"
          placeholderTextColor={colors.mutedForeground}
          value={search}
          onChangeText={setSearch}
          textAlign="right"
        />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.typeRow}>
        {FILE_TYPES.map((t) => (
          <TouchableOpacity
            key={t.key}
            activeOpacity={0.75}
            style={[s.typeChip, { backgroundColor: activeType === t.key ? colors.navy : colors.card, borderColor: activeType === t.key ? colors.navy : colors.border }]}
            onPress={() => setActiveType(t.key)}
          >
            <Text style={[s.typeLabel, { color: activeType === t.key ? '#fff' : colors.mutedForeground }]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
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
            <EmptyState icon="folder" title="لا توجد ملفات" body="ستظهر هنا الملفات المرفوعة للمواد." />
          }
          renderItem={({ item }: { item: any }) => (
            <Card style={s.fileCard}>
              <View style={[s.fileIcon, { backgroundColor: colors.navy + '12' }]}>
                <Feather name={FILE_ICON[item.fileType] ?? 'file'} size={22} color={colors.navy} />
              </View>
              <View style={s.fileInfo}>
                <Text style={[s.fileName, { color: colors.foreground }]} numberOfLines={2}>{item.title}</Text>
                <Text style={[s.fileMeta, { color: colors.mutedForeground }]}>
                  {item.uploaderName} · {FILE_TYPE_AR[item.fileType] ?? item.fileType}
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
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, margin: spacing.base, marginBottom: spacing.sm, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1 },
  searchInput: { flex: 1, fontSize: fontSize.md },
  typeRow: { paddingHorizontal: spacing.base, paddingBottom: spacing.sm, gap: spacing.sm },
  typeChip: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.full, borderWidth: 1.5 },
  typeLabel: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  list: { paddingHorizontal: spacing.base, paddingBottom: 100, gap: spacing.sm },
  fileCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  fileIcon: { width: 48, height: 48, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  fileInfo: { flex: 1 },
  fileName: { fontSize: fontSize.base, fontWeight: fontWeight.semibold, textAlign: 'right' },
  fileMeta: { fontSize: fontSize.sm, marginTop: 2, textAlign: 'right' },
  fileCourse: { fontSize: fontSize.xs, marginTop: 2, textAlign: 'right' },
});
