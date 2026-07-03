import React from 'react';
import { ActivityIndicator, Alert, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useListClubs, useJoinClub } from '@workspace/api-client-react';
import { getListClubsQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { spacing, fontSize, fontWeight, radius } from '@/constants/theme';

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

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {isLoading ? (
        <ActivityIndicator color={colors.navy} size="large" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={clubs}
          keyExtractor={(c: any) => c.id}
          contentContainerStyle={s.list}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.navy} />}
          ListEmptyComponent={
            <EmptyState icon="users" title="لا توجد نوادٍ متاحة" body="ستظهر هنا النوادي الطلابية المتاحة في جامعتك." />
          }
          renderItem={({ item }: { item: any }) => (
            <Card style={s.card}>
              <View style={s.cardTop}>
                <View style={[s.clubEmoji, { backgroundColor: colors.navy + '10' }]}>
                  <Text style={s.emoji}>🎓</Text>
                </View>
                <View style={s.cardInfo}>
                  <Text style={[s.clubName, { color: colors.foreground }]}>{item.nameAr || item.name}</Text>
                  {item.category && <Text style={[s.clubCat, { color: colors.mutedForeground }]}>{item.category}</Text>}
                </View>
                {item.isMember ? (
                  <Badge label="عضو" color="success" />
                ) : (
                  <Button
                    label="انضم"
                    variant="primary"
                    size="sm"
                    fullWidth={false}
                    onPress={() => join.mutate({ clubId: item.id })}
                  />
                )}
              </View>
              {item.description && (
                <Text style={[s.desc, { color: colors.mutedForeground }]} numberOfLines={2}>
                  {item.descriptionAr || item.description}
                </Text>
              )}
              {item.memberCount > 0 && (
                <Text style={[s.meta, { color: colors.mutedForeground }]}>{item.memberCount} عضو</Text>
              )}
            </Card>
          )}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  list: { padding: spacing.base, paddingBottom: 100, gap: spacing.sm },
  card: { gap: spacing.sm },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  clubEmoji: { width: 46, height: 46, borderRadius: radius.full, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  emoji: { fontSize: 22 },
  cardInfo: { flex: 1 },
  clubName: { fontSize: fontSize.md, fontWeight: fontWeight.bold, textAlign: 'right' },
  clubCat: { fontSize: fontSize.sm, marginTop: 2, textAlign: 'right' },
  desc: { fontSize: fontSize.sm, lineHeight: fontSize.sm * 1.6, textAlign: 'right' },
  meta: { fontSize: fontSize.xs, textAlign: 'right' },
});
