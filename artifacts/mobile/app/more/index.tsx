import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { Feather } from '@expo/vector-icons';

const MODULES = [
  { icon: 'file-text', label: 'Files', labelAr: 'الملفات', route: '/files', color: '#3B82F6' },
  { icon: 'bell', label: 'Announcements', labelAr: 'الإعلانات', route: '/announcements', color: '#F59E0B' },
  { icon: 'clipboard', label: 'Assignments', labelAr: 'الواجبات', route: '/assignments', color: '#EF4444' },
  { icon: 'bar-chart-2', label: 'Exams', labelAr: 'الامتحانات', route: '/exams', color: '#8B5CF6' },
  { icon: 'calendar', label: 'Events', labelAr: 'الفعاليات', route: '/events', color: '#10B981' },
  { icon: 'users', label: 'Clubs', labelAr: 'النوادي', route: '/clubs', color: '#EC4899' },
  { icon: 'briefcase', label: 'Opportunities', labelAr: 'الفرص', route: '/opportunities', color: '#14B8A6' },
  { icon: 'cpu', label: 'AI Assistant', labelAr: 'المساعد الذكي', route: '/ai', color: '#6366F1' },
  { icon: 'star', label: 'Subscription', labelAr: 'الاشتراك', route: '/subscription', color: '#D4A853' },
] as const;

export default function MoreScreen() {
  const colors = useColors();
  const router = useRouter();
  const s = styles(colors);

  return (
    <ScrollView style={s.root} contentContainerStyle={s.content}>
      <Text style={s.title}>All Modules</Text>
      <View style={s.grid}>
        {MODULES.map((mod) => (
          <TouchableOpacity key={mod.label} style={s.tile} onPress={() => router.push(mod.route as any)}>
            <View style={[s.tileIcon, { backgroundColor: mod.color + '15' }]}>
              <Feather name={mod.icon as any} size={26} color={mod.color} />
            </View>
            <Text style={s.tileLabel}>{mod.label}</Text>
            <Text style={s.tileLabelAr}>{mod.labelAr}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    content: { padding: 16, paddingBottom: 100 },
    title: { fontSize: 22, fontWeight: '700', color: colors.foreground, marginBottom: 20 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    tile: {
      width: '30%', backgroundColor: colors.card, borderRadius: 16,
      padding: 16, alignItems: 'center', gap: 6,
      shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, elevation: 3,
    },
    tileIcon: { width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    tileLabel: { fontSize: 12, fontWeight: '600', color: colors.foreground, textAlign: 'center' },
    tileLabelAr: { fontSize: 10, color: colors.mutedForeground, textAlign: 'center' },
  });
