import React, { useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { showAlert } from '@/lib/alert';
import { useColors } from '@/hooks/useColors';
import { useListOpportunities, ListOpportunitiesType, Opportunity } from '@workspace/api-client-react';
import { Feather } from '@expo/vector-icons';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { GuestGate } from '@/components/GuestGate';
import { openExternalUrl } from '@/lib/urls';
import { usePreferences } from '@/contexts/PreferencesContext';
import { spacing, fontSize, fontWeight, radius } from '@/constants/theme';

const OPP_TYPE_KEYS: { key: ListOpportunitiesType | undefined; labelKey: string }[] = [
  { key: undefined, labelKey: 'all' }, { key: ListOpportunitiesType.internship, labelKey: 'internship' },
  { key: ListOpportunitiesType.job, labelKey: 'job' }, { key: ListOpportunitiesType.scholarship, labelKey: 'scholarship' },
  { key: ListOpportunitiesType.training, labelKey: 'training' }, { key: ListOpportunitiesType.hackathon, labelKey: 'hackathon' },
  { key: ListOpportunitiesType.freelance, labelKey: 'freelance' }, { key: ListOpportunitiesType.competition, labelKey: 'competition' },
];
const OPP_COLOR: Record<string, string> = {
  internship: '#3B82F6', job: '#10B981', scholarship: '#D4A853',
  training: '#8B5CF6', hackathon: '#EF4444', freelance: '#F59E0B',
  competition: '#EC4899', volunteering: '#14B8A6',
};
const OPP_ICON: Record<string, React.ComponentProps<typeof Feather>['name']> = {
  internship: 'briefcase', job: 'trending-up', scholarship: 'award',
  training: 'book', hackathon: 'code', freelance: 'dollar-sign',
  competition: 'zap', volunteering: 'heart',
};

/** opportunities.deadline is free text in the schema — only treat it as a date when it parses. */
function deadlineDaysLeft(deadline: string | null | undefined): number | null {
  if (!deadline) return null;
  const ts = new Date(deadline).getTime();
  if (!Number.isFinite(ts)) return null;
  return Math.ceil((ts - Date.now()) / 86400000);
}

export default function OpportunitiesScreen() {
  return (
    <GuestGate>
      <OpportunitiesScreenInner />
    </GuestGate>
  );
}

function OpportunitiesScreenInner() {
  const colors = useColors();
  const { t, isRTL } = usePreferences();
  const [activeType, setActiveType] = useState<ListOpportunitiesType | undefined>(undefined);
  const { data, isLoading, isError, refetch, isRefetching } = useListOpportunities({ type: activeType });
  const opps: Opportunity[] = data?.data ?? [];
  const align = { textAlign: isRTL ? 'right' : 'left' } as const;
  const rowDir = { flexDirection: isRTL ? 'row-reverse' : 'row' } as const;

  const openLink = async (link: string) => {
    const opened = await openExternalUrl(link);
    if (!opened) showAlert(t('common.error'), t('files.openError'));
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[s.typeRow, rowDir]}>
        {OPP_TYPE_KEYS.map((opt) => (
          <TouchableOpacity
            key={String(opt.key)}
            activeOpacity={0.75}
            style={[s.typeChip, { backgroundColor: activeType === opt.key ? colors.navy : colors.card, borderColor: activeType === opt.key ? colors.navy : colors.border }]}
            onPress={() => setActiveType(opt.key)}
          >
            <Text style={[s.typeLabel, { color: activeType === opt.key ? '#fff' : colors.mutedForeground }]}>{t(`opportunityTypes.${opt.labelKey}`)}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {isLoading ? (
        <ActivityIndicator color={colors.navy} size="large" style={{ marginTop: 40 }} />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : (
        <FlatList
          data={opps}
          keyExtractor={(o) => o.id}
          contentContainerStyle={s.list}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.navy} />}
          ListEmptyComponent={
            <EmptyState icon="briefcase" title={t('opportunities.empty')} body={t('opportunities.emptyBody')} />
          }
          renderItem={({ item }: { item: Opportunity }) => {
            const color = OPP_COLOR[item.type] ?? colors.navy;
            const icon = OPP_ICON[item.type] ?? 'briefcase';
            const dLeft = deadlineDaysLeft(item.deadline);
            const link = item.link && /^https?:\/\//i.test(item.link) ? item.link : null;
            return (
              <Card style={s.card}>
                {item.isFeatured && <Badge label={t('opportunities.featured')} color="gold" style={{ alignSelf: isRTL ? 'flex-start' : 'flex-end', marginBottom: spacing.xs }} />}
                <View style={[s.cardHeader, rowDir]}>
                  <View style={[s.iconBox, { backgroundColor: color + '15' }]}>
                    <Feather name={icon} size={24} color={color} />
                  </View>
                  <View style={s.cardInfo}>
                    <Text style={[s.cardTitle, { color: colors.foreground }, align]} numberOfLines={2}>{item.title}</Text>
                    <Text style={[s.cardCompany, { color: colors.mutedForeground }, align]}>{item.organization}</Text>
                  </View>
                  <Badge label={t(`opportunityTypes.${item.type}`)} color="primary" />
                </View>
                {item.description && (
                  <Text style={[s.cardDesc, { color: colors.mutedForeground }, align]} numberOfLines={2}>
                    {item.description}
                  </Text>
                )}
                <View style={[s.metaRow, rowDir]}>
                  {item.location && <Text style={[s.meta, { color: colors.mutedForeground }]}>📍 {item.location}</Text>}
                  {dLeft !== null ? (
                    <Text style={[s.meta, { color: dLeft <= 7 ? colors.destructive : colors.mutedForeground }]}>
                      ⏰ {dLeft <= 0 ? t('opportunities.expired') : t('opportunities.daysLeft', { n: dLeft })}
                    </Text>
                  ) : item.deadline ? (
                    <Text style={[s.meta, { color: colors.mutedForeground }]}>⏰ {item.deadline}</Text>
                  ) : null}
                </View>
                {link && (
                  <Button
                    label={t('opportunities.apply')}
                    variant="primary"
                    size="sm"
                    onPress={() => openLink(link)}
                  />
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
  typeRow: { paddingHorizontal: spacing.base, paddingVertical: spacing.md, gap: spacing.sm },
  typeChip: {
    paddingHorizontal: spacing.md,
    height: 32,
    borderRadius: radius.full,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  typeLabel: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  list: { paddingHorizontal: spacing.base, paddingBottom: 100, gap: spacing.sm },
  card: { gap: spacing.sm },
  cardHeader: { gap: spacing.md, alignItems: 'flex-start' },
  iconBox: { width: 48, height: 48, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: fontSize.md, fontWeight: fontWeight.bold },
  cardCompany: { fontSize: fontSize.sm, marginTop: 2 },
  cardDesc: { fontSize: fontSize.sm, lineHeight: fontSize.sm * 1.6 },
  metaRow: { gap: spacing.md, flexWrap: 'wrap' },
  meta: { fontSize: fontSize.sm },
});
