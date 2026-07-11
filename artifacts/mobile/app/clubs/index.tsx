import React from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { showAlert } from '@/lib/alert';
import { Image } from 'expo-image';
import { useColors } from '@/hooks/useColors';
import { useListClubs, useJoinClub, Club } from '@workspace/api-client-react';
import { getListClubsQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { GuestGate } from '@/components/GuestGate';
import { resolveFileUrl } from '@/lib/urls';
import { usePreferences } from '@/contexts/PreferencesContext';
import { spacing, fontSize, fontWeight, radius } from '@/constants/theme';

export default function ClubsScreen() {
  return (
    <GuestGate>
      <ClubsScreenInner />
    </GuestGate>
  );
}

function ClubsScreenInner() {
  const colors = useColors();
  const { t, isRTL } = usePreferences();
  const qc = useQueryClient();
  const { data, isLoading, isError, refetch, isRefetching } = useListClubs();
  const join = useJoinClub({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListClubsQueryKey() });
        showAlert(t('clubs.requestSent'), t('clubs.requestSentBody'));
      },
      onError: () => showAlert(t('common.error'), t('clubs.requestError')),
    },
  });
  const clubs: Club[] = data?.data ?? [];
  const align = { textAlign: isRTL ? 'right' : 'left' } as const;
  const rowDir = { flexDirection: isRTL ? 'row-reverse' : 'row' } as const;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {isLoading ? (
        <ActivityIndicator color={colors.primary} size="large" style={{ marginTop: 40 }} />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : (
        <FlatList
          data={clubs}
          keyExtractor={(c) => c.id}
          contentContainerStyle={s.list}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
          ListEmptyComponent={
            <EmptyState icon="users" title={t('clubs.empty')} body={t('clubs.emptyBody')} />
          }
          renderItem={({ item }: { item: Club }) => {
            const logoUrl = resolveFileUrl(item.logoUrl);
            return (
              <Card style={s.card}>
                <View style={[s.cardTop, rowDir]}>
                  <View style={[s.clubLogo, { backgroundColor: colors.primary + '12' }]}>
                    {logoUrl ? (
                      <Image source={{ uri: logoUrl }} style={s.logoImage} contentFit="cover" />
                    ) : (
                      <Text style={s.emoji}>🎓</Text>
                    )}
                  </View>
                  <View style={s.cardInfo}>
                    <Text style={[s.clubName, { color: colors.foreground }, align]}>{item.name}</Text>
                  </View>
                  {item.isMember ? (
                    <Badge label={t('clubs.member')} color="success" />
                  ) : (
                    <Button
                      label={t('clubs.join')}
                      variant="primary"
                      size="sm"
                      fullWidth={false}
                      onPress={() => join.mutate({ clubId: item.id })}
                    />
                  )}
                </View>
                {item.description && (
                  <Text style={[s.desc, { color: colors.mutedForeground }, align]} numberOfLines={2}>
                    {item.description}
                  </Text>
                )}
                {item.memberCount > 0 && (
                  <Text style={[s.meta, { color: colors.mutedForeground }, align]}>{t('clubs.memberCount', { n: item.memberCount })}</Text>
                )}
              </Card>
            );
          }}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  list: { padding: spacing.base, paddingBottom: 100, gap: spacing.sm },
  card: { gap: spacing.sm },
  cardTop: { alignItems: 'center', gap: spacing.md },
  clubLogo: { width: 46, height: 46, borderRadius: 12, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' },
  logoImage: { width: '100%', height: '100%' },
  emoji: { fontSize: 22 },
  cardInfo: { flex: 1 },
  clubName: { fontSize: fontSize.md, fontWeight: fontWeight.bold },
  desc: { fontSize: fontSize.sm, lineHeight: fontSize.sm * 1.6 },
  meta: { fontSize: fontSize.xs },
});
