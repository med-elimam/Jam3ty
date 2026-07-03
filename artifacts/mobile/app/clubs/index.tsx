import React from 'react';
import { ActivityIndicator, Alert, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useListClubs, useJoinClub } from '@workspace/api-client-react';
import { getListClubsQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Feather as F } from '@expo/vector-icons';

export default function ClubsScreen() {
  const colors = useColors();
  const qc = useQueryClient();
  const { data, isLoading, refetch, isRefetching } = useListClubs();
  const join = useJoinClub({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListClubsQueryKey() });
        Alert.alert('تم إرسال الطلب!', 'تم إرسال طلب الانضمام بنجاح.');
      },
      onError: () => Alert.alert('خطأ', 'تعذّر إرسال طلب الانضمام.'),
    },
  });

  const clubs: any[] = (data as any)?.data ?? [];
  const s = styles(colors);

  return (
    <View style={s.root}>
      {isLoading ? <ActivityIndicator color={colors.navy} size="large" style={{ marginTop: 40 }} /> : (
        <FlatList
          data={clubs}
          keyExtractor={(c: any) => c.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
          ListEmptyComponent={<View style={s.empty}><F name="users" size={48} color={colors.border} /><Text style={s.emptyText}>لا توجد نوادٍ متاحة</Text></View>}
          renderItem={({ item }: { item: any }) => (
            <View style={s.card}>
              <View style={s.cardHeader}>
                <View style={s.clubIcon}><Text style={s.clubEmoji}>🎓</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={s.name}>{item.nameAr || item.name}</Text>
                  {item.category && <Text style={s.category}>{item.category}</Text>}
                </View>
                {item.isMember ? (
                  <View style={s.memberBadge}><Text style={s.memberText}>عضو</Text></View>
                ) : (
                  <TouchableOpacity style={s.joinBtn} onPress={() => join.mutate({ clubId: item.id })}>
                    <Text style={s.joinBtnText}>انضم</Text>
                  </TouchableOpacity>
                )}
              </View>
              {item.description && <Text style={s.desc} numberOfLines={2}>{item.descriptionAr || item.description}</Text>}
              {item.memberCount > 0 && <Text style={s.meta}>{item.memberCount} عضو</Text>}
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
    card: { backgroundColor: colors.card, borderRadius: 12, padding: 14, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 2 },
    cardHeader: { flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 8 },
    clubIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.navy + '10', alignItems: 'center', justifyContent: 'center' },
    clubEmoji: { fontSize: 22 },
    name: { fontSize: 15, fontWeight: '700', color: colors.foreground, textAlign: 'right' },
    category: { fontSize: 12, color: colors.mutedForeground, marginTop: 2, textAlign: 'right' },
    memberBadge: { backgroundColor: colors.success + '20', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
    memberText: { fontSize: 12, fontWeight: '600', color: colors.success },
    joinBtn: { backgroundColor: colors.navy, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8 },
    joinBtnText: { fontSize: 13, fontWeight: '600', color: '#fff' },
    desc: { fontSize: 13, color: colors.mutedForeground, lineHeight: 19, textAlign: 'right' },
    meta: { fontSize: 11, color: colors.mutedForeground, marginTop: 6, textAlign: 'right' },
    empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
    emptyText: { fontSize: 15, color: colors.mutedForeground },
  });
