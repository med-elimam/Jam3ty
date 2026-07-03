import React, { useState } from 'react';
import { ActivityIndicator, FlatList, Linking, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useListOpportunities } from '@workspace/api-client-react';
import { Feather } from '@expo/vector-icons';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { spacing, fontSize, fontWeight, radius } from '@/constants/theme';

const OPP_TYPES: { key: string | undefined; label: string }[] = [
  { key: undefined, label: 'الكل' }, { key: 'internship', label: 'تدريب' },
  { key: 'job', label: 'وظيفة' }, { key: 'scholarship', label: 'منحة' },
  { key: 'training', label: 'دورة' }, { key: 'hackathon', label: 'هاكاثون' },
  { key: 'freelance', label: 'عمل حر' }, { key: 'competition', label: 'مسابقة' },
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
const OPP_TYPE_AR: Record<string, string> = {
  internship: 'تدريب', job: 'وظيفة', scholarship: 'منحة', training: 'دورة',
  hackathon: 'هاكاثون', freelance: 'عمل حر', competition: 'مسابقة', volunteering: 'تطوع',
};

export default function OpportunitiesScreen() {
  const colors = useColors();
  const [activeType, setActiveType] = useState<string | undefined>(undefined);
  const { data, isLoading, refetch, isRefetching } = useListOpportunities({ type: activeType as any });
  const opps: any[] = (data as any)?.data ?? [];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.typeRow}>
        {OPP_TYPES.map((t) => (
          <TouchableOpacity
            key={String(t.key)}
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
          data={opps}
          keyExtractor={(o: any) => o.id}
          contentContainerStyle={s.list}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.navy} />}
          ListEmptyComponent={
            <EmptyState icon="briefcase" title="لا توجد فرص متاحة" body="ستظهر هنا الفرص الوظيفية والتدريبية والمنح." />
          }
          renderItem={({ item }: { item: any }) => {
            const color = OPP_COLOR[item.type] ?? colors.navy;
            const icon = OPP_ICON[item.type] ?? 'briefcase';
            const dLeft = item.deadline ? Math.ceil((new Date(item.deadline).getTime() - Date.now()) / 86400000) : null;
            return (
              <Card style={s.card}>
                {item.isFeatured && <Badge label="⭐ مميز" color="gold" style={{ alignSelf: 'flex-end', marginBottom: spacing.xs }} />}
                <View style={s.cardHeader}>
                  <View style={[s.iconBox, { backgroundColor: color + '15' }]}>
                    <Feather name={icon} size={24} color={color} />
                  </View>
                  <View style={s.cardInfo}>
                    <Text style={[s.cardTitle, { color: colors.foreground }]} numberOfLines={2}>{item.titleAr || item.title}</Text>
                    <Text style={[s.cardCompany, { color: colors.mutedForeground }]}>{item.company}</Text>
                  </View>
                  <Badge label={OPP_TYPE_AR[item.type] ?? item.type} color="primary" />
                </View>
                {item.description && (
                  <Text style={[s.cardDesc, { color: colors.mutedForeground }]} numberOfLines={2}>
                    {item.descriptionAr || item.description}
                  </Text>
                )}
                <View style={s.metaRow}>
                  {item.location && <Text style={[s.meta, { color: colors.mutedForeground }]}>📍 {item.location}</Text>}
                  {dLeft !== null && (
                    <Text style={[s.meta, { color: dLeft <= 7 ? colors.destructive : colors.mutedForeground }]}>
                      ⏰ {dLeft <= 0 ? 'انتهت' : `${dLeft} يوم متبقٍ`}
                    </Text>
                  )}
                </View>
                {item.applyUrl && item.applyUrl !== '#' && (
                  <Button
                    label="تقدّم الآن"
                    variant="primary"
                    size="sm"
                    onPress={() => Linking.openURL(item.applyUrl)}
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
  typeChip: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.full, borderWidth: 1.5 },
  typeLabel: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  list: { paddingHorizontal: spacing.base, paddingBottom: 100, gap: spacing.sm },
  card: { gap: spacing.sm },
  cardHeader: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  iconBox: { width: 48, height: 48, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: fontSize.md, fontWeight: fontWeight.bold, textAlign: 'right' },
  cardCompany: { fontSize: fontSize.sm, marginTop: 2, textAlign: 'right' },
  cardDesc: { fontSize: fontSize.sm, lineHeight: fontSize.sm * 1.6, textAlign: 'right' },
  metaRow: { flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap' },
  meta: { fontSize: fontSize.sm },
});
