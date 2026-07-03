import React, { useState } from 'react';
import { ActivityIndicator, FlatList, Linking, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useListOpportunities } from '@workspace/api-client-react';
import { Feather } from '@expo/vector-icons';

const OPP_TYPES: { key: string | undefined; label: string }[] = [
  { key: undefined, label: 'الكل' },
  { key: 'internship', label: 'تدريب' },
  { key: 'job', label: 'وظيفة' },
  { key: 'scholarship', label: 'منحة' },
  { key: 'training', label: 'دورة' },
  { key: 'hackathon', label: 'هاكاثون' },
  { key: 'freelance', label: 'عمل حر' },
  { key: 'competition', label: 'مسابقة' },
];
const OPP_COLOR: Record<string, string> = { internship: '#3B82F6', job: '#10B981', scholarship: '#D4A853', training: '#8B5CF6', hackathon: '#EF4444', freelance: '#F59E0B', competition: '#EC4899', volunteering: '#14B8A6' };
const OPP_ICON: Record<string, string> = { internship: 'briefcase', job: 'trending-up', scholarship: 'award', training: 'book', hackathon: 'code', freelance: 'dollar-sign', competition: 'zap', volunteering: 'heart' };
const OPP_TYPE_AR: Record<string, string> = { internship: 'تدريب', job: 'وظيفة', scholarship: 'منحة', training: 'دورة', hackathon: 'هاكاثون', freelance: 'عمل حر', competition: 'مسابقة', volunteering: 'تطوع' };

export default function OpportunitiesScreen() {
  const colors = useColors();
  const [activeType, setActiveType] = useState<string | undefined>(undefined);
  const { data, isLoading, refetch, isRefetching } = useListOpportunities({ type: activeType as any });
  const opps: any[] = (data as any)?.data ?? [];
  const s = styles(colors);

  return (
    <View style={s.root}>
      <FlatList
        horizontal showsHorizontalScrollIndicator={false}
        data={OPP_TYPES} keyExtractor={(t) => String(t.key)}
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12, gap: 8 }}
        renderItem={({ item }) => {
          const active = activeType === item.key;
          return (
            <TouchableOpacity
              onPress={() => setActiveType(item.key)}
              style={{ paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: active ? colors.navy : colors.card, borderWidth: 1, borderColor: active ? colors.navy : colors.border }}
            >
              <Text style={{ fontSize: 13, fontWeight: '600', color: active ? '#fff' : colors.mutedForeground }}>{item.label}</Text>
            </TouchableOpacity>
          );
        }}
      />
      {isLoading ? <ActivityIndicator color={colors.navy} size="large" style={{ marginTop: 40 }} /> : (
        <FlatList
          data={opps}
          keyExtractor={(o: any) => o.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
          ListEmptyComponent={<View style={s.empty}><Feather name="briefcase" size={48} color={colors.border} /><Text style={s.emptyText}>لا توجد فرص متاحة</Text></View>}
          renderItem={({ item }: { item: any }) => {
            const color = OPP_COLOR[item.type] ?? colors.navy;
            const icon = OPP_ICON[item.type] ?? 'briefcase';
            const dLeft = item.deadline ? Math.ceil((new Date(item.deadline).getTime() - Date.now()) / 86400000) : null;
            return (
              <View style={s.card}>
                {item.isFeatured && <View style={s.featuredBadge}><Text style={s.featuredText}>⭐ مميز</Text></View>}
                <View style={s.cardHeader}>
                  <View style={[s.iconBox, { backgroundColor: color + '15' }]}>
                    <Feather name={icon as any} size={22} color={color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.title} numberOfLines={2}>{item.titleAr || item.title}</Text>
                    <Text style={s.company}>{item.company}</Text>
                  </View>
                  <View style={[s.typeBadge, { backgroundColor: color + '15' }]}>
                    <Text style={[s.typeText, { color }]}>{OPP_TYPE_AR[item.type] ?? item.type}</Text>
                  </View>
                </View>
                <Text style={s.desc} numberOfLines={2}>{item.descriptionAr || item.description}</Text>
                <View style={s.infoRow}>
                  {item.location && <Text style={s.info}>📍 {item.location}</Text>}
                  {dLeft !== null && (
                    <Text style={[s.info, dLeft <= 7 && { color: colors.destructive }]}>
                      ⏰ {dLeft <= 0 ? 'انتهت' : `${dLeft} يوم متبقٍ`}
                    </Text>
                  )}
                </View>
                {item.applyUrl && item.applyUrl !== '#' && (
                  <TouchableOpacity style={s.applyBtn} onPress={() => Linking.openURL(item.applyUrl)}>
                    <Text style={s.applyBtnText}>تقدّم الآن ←</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    card: { backgroundColor: colors.card, borderRadius: 12, padding: 14, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 2 },
    featuredBadge: { backgroundColor: colors.gold + '20', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, alignSelf: 'flex-end', marginBottom: 8 },
    featuredText: { fontSize: 11, fontWeight: '600', color: colors.gold },
    cardHeader: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginBottom: 8 },
    iconBox: { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    title: { fontSize: 14, fontWeight: '700', color: colors.foreground, textAlign: 'right' },
    company: { fontSize: 12, color: colors.mutedForeground, marginTop: 2, textAlign: 'right' },
    typeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, alignSelf: 'flex-start' },
    typeText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
    desc: { fontSize: 13, color: colors.mutedForeground, lineHeight: 19, marginBottom: 8, textAlign: 'right' },
    infoRow: { flexDirection: 'row', gap: 12, marginBottom: 10 },
    info: { fontSize: 12, color: colors.mutedForeground },
    applyBtn: { backgroundColor: colors.navy, borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
    applyBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
    empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
    emptyText: { fontSize: 15, color: colors.mutedForeground },
  });
