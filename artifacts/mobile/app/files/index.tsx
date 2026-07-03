import React, { useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useListFiles, useToggleFileFavorite, ListFilesType } from '@workspace/api-client-react';
import { getListFilesQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';

const FILE_TYPES = [
  { key: 'all', label: 'الكل' },
  { key: 'lecture', label: 'محاضرة' },
  { key: 'td', label: 'TD' },
  { key: 'tp', label: 'TP' },
  { key: 'summary', label: 'ملخص' },
  { key: 'exam', label: 'امتحان' },
  { key: 'correction', label: 'تصحيح' },
  { key: 'book', label: 'كتاب' },
];

function FileTypeChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const colors = useColors();
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{ paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: active ? colors.navy : colors.card, borderWidth: 1, borderColor: active ? colors.navy : colors.border, marginRight: 8 }}
    >
      <Text style={{ fontSize: 13, fontWeight: '600', color: active ? '#fff' : colors.mutedForeground }}>{label}</Text>
    </TouchableOpacity>
  );
}

const FILE_ICONS: Record<string, string> = { lecture: 'book-open', td: 'edit-3', tp: 'tool', summary: 'align-left', exam: 'file-text', correction: 'check-square', book: 'book', other: 'file' };
const FILE_TYPE_AR: Record<string, string> = { lecture: 'محاضرة', td: 'TD', tp: 'TP', summary: 'ملخص', exam: 'امتحان', correction: 'تصحيح', book: 'كتاب', other: 'أخرى' };

export default function FilesScreen() {
  const colors = useColors();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [activeType, setActiveType] = useState('all');

  const { data, isLoading, refetch, isRefetching } = useListFiles({
    search: search || undefined,
    type: (activeType === 'all' ? undefined : activeType) as ListFilesType | undefined,
  });
  const toggleFav = useToggleFileFavorite({ mutation: { onSuccess: () => qc.invalidateQueries({ queryKey: getListFilesQueryKey() }) } });

  const files: any[] = (data as any)?.data ?? [];
  const s = styles(colors);

  return (
    <View style={s.root}>
      <View style={s.searchRow}>
        <Feather name="search" size={16} color={colors.mutedForeground} />
        <TextInput
          style={s.searchInput}
          placeholder="ابحث عن ملف…"
          placeholderTextColor={colors.mutedForeground}
          value={search}
          onChangeText={setSearch}
          textAlign="right"
        />
      </View>
      <FlatList
        horizontal showsHorizontalScrollIndicator={false}
        data={FILE_TYPES} keyExtractor={(t) => t.key}
        contentContainerStyle={{ paddingHorizontal: 16, marginBottom: 8 }}
        renderItem={({ item }) => (
          <FileTypeChip label={item.label} active={activeType === item.key} onPress={() => setActiveType(item.key)} />
        )}
      />
      {isLoading ? (
        <ActivityIndicator color={colors.navy} size="large" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={files}
          keyExtractor={(f: any) => f.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
          ListEmptyComponent={<View style={s.empty}><Feather name="folder" size={48} color={colors.border} /><Text style={s.emptyText}>لا توجد ملفات</Text></View>}
          renderItem={({ item }: { item: any }) => (
            <View style={s.fileCard}>
              <View style={[s.fileIcon, { backgroundColor: colors.navy + '15' }]}>
                <Feather name={(FILE_ICONS[item.fileType] ?? 'file') as any} size={22} color={colors.navy} />
              </View>
              <View style={s.fileInfo}>
                <Text style={s.fileName} numberOfLines={2}>{item.title}</Text>
                <Text style={s.fileMeta}>{item.uploaderName} · {FILE_TYPE_AR[item.fileType] ?? item.fileType}</Text>
                {item.courseName && <Text style={s.fileCourseName}>{item.courseName}</Text>}
              </View>
              <TouchableOpacity onPress={() => toggleFav.mutate({ fileId: item.id })}>
                <Feather name="heart" size={20} color={item.isFavorited ? colors.destructive : colors.mutedForeground} />
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, margin: 16, marginBottom: 10, padding: 12, backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.border },
    searchInput: { flex: 1, fontSize: 15, color: colors.foreground },
    fileCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.card, borderRadius: 12, padding: 14, marginBottom: 8, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 2 },
    fileIcon: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    fileInfo: { flex: 1 },
    fileName: { fontSize: 14, fontWeight: '600', color: colors.foreground, textAlign: 'right' },
    fileMeta: { fontSize: 12, color: colors.mutedForeground, marginTop: 2, textAlign: 'right' },
    fileCourseName: { fontSize: 11, color: colors.navy, marginTop: 2, textAlign: 'right' },
    empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
    emptyText: { fontSize: 15, color: colors.mutedForeground },
  });
