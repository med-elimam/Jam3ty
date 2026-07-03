import React from 'react';
import { ActivityIndicator, Alert, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useListEvents, useRegisterForEvent } from '@workspace/api-client-react';
import { getListEventsQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';

const EVENT_TYPE_ICON: Record<string, string> = { conference: 'mic', workshop: 'tool', competition: 'award', hackathon: 'code', seminar: 'book', career_fair: 'briefcase', cultural: 'music', sports: 'activity', other: 'calendar' };

export default function EventsScreen() {
  const colors = useColors();
  const qc = useQueryClient();
  const { data, isLoading, refetch, isRefetching } = useListEvents();
  const register = useRegisterForEvent({
    mutation: {
      onSuccess: () => { qc.invalidateQueries({ queryKey: getListEventsQueryKey() }); Alert.alert('Registered!', 'You have been registered for this event.'); },
      onError: () => Alert.alert('Error', 'Could not register for this event.'),
    },
  });

  const events: any[] = (data as any)?.data ?? [];
  const s = styles(colors);

  return (
    <View style={s.root}>
      {isLoading ? <ActivityIndicator color={colors.navy} size="large" style={{ marginTop: 40 }} /> : (
        <FlatList
          data={events}
          keyExtractor={(e: any) => e.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
          ListEmptyComponent={<View style={s.empty}><Feather name="calendar" size={48} color={colors.border} /><Text style={s.emptyText}>No upcoming events</Text></View>}
          renderItem={({ item }: { item: any }) => (
            <View style={s.card}>
              <View style={s.cardHeader}>
                <View style={[s.iconBox, { backgroundColor: colors.navy + '10' }]}>
                  <Feather name={(EVENT_TYPE_ICON[item.type] ?? 'calendar') as any} size={22} color={colors.navy} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.title} numberOfLines={2}>{item.titleAr || item.title}</Text>
                  <Text style={s.type}>{item.type?.replace('_', ' ')}</Text>
                </View>
                {item.isRegistered && <Feather name="check-circle" size={20} color={colors.success} />}
              </View>
              <Text style={s.description} numberOfLines={2}>{item.descriptionAr || item.description}</Text>
              <View style={s.infoRow}>
                <Text style={s.info}>📅 {new Date(item.startDate).toLocaleDateString()}</Text>
                {item.location && <Text style={s.info}>📍 {item.location}</Text>}
              </View>
              {item.requiresRegistration && !item.isRegistered && (
                <TouchableOpacity style={s.regBtn} onPress={() => register.mutate({ eventId: item.id })}>
                  <Text style={s.regBtnText}>Register</Text>
                </TouchableOpacity>
              )}
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
    cardHeader: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginBottom: 8 },
    iconBox: { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    title: { fontSize: 15, fontWeight: '700', color: colors.foreground },
    type: { fontSize: 11, color: colors.mutedForeground, textTransform: 'capitalize', marginTop: 2 },
    description: { fontSize: 13, color: colors.mutedForeground, lineHeight: 19, marginBottom: 8 },
    infoRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
    info: { fontSize: 12, color: colors.mutedForeground },
    regBtn: { backgroundColor: colors.navy, borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
    regBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
    empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
    emptyText: { fontSize: 15, color: colors.mutedForeground },
  });
