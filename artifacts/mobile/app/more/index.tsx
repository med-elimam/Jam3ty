import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { Feather } from '@expo/vector-icons';

const MODULES = [
  { icon: 'file-text', label: 'الملفات', route: '/files', color: '#3B82F6' },
  { icon: 'bell', label: 'الإعلانات', route: '/announcements', color: '#F59E0B' },
  { icon: 'clipboard', label: 'الواجبات', route: '/assignments', color: '#EF4444' },
  { icon: 'bar-chart-2', label: 'الامتحانات', route: '/exams', color: '#8B5CF6' },
  { icon: 'calendar', label: 'الفعاليات', route: '/events', color: '#10B981' },
  { icon: 'users', label: 'النوادي', route: '/clubs', color: '#EC4899' },
  { icon: 'briefcase', label: 'الفرص', route: '/opportunities', color: '#14B8A6' },
  { icon: 'cpu', label: 'المساعد الذكي', route: '/ai', color: '#6366F1' },
  { icon: 'star', label: 'الاشتراك', route: '/subscription', color: '#D4A853' },
] as const;

export default function MoreScreen() {
  const colors = useColors();
  const router = useRouter();
  const s = styles(colors);

  return (
    <ScrollView style={s.root} contentContainerStyle={s.content}>
      <Text style={s.title}>جميع الأقسام</Text>
      <View style={s.grid}>
        {MODULES.map((mod) => (
          <TouchableOpacity key={mod.label} style={s.tile} onPress={() => router.push(mod.route as any)}>
            <View style={[s.tileIcon, { backgroundColor: mod.color + '15' }]}>
              <Feather name={mod.icon as any} size={26} color={mod.color} />
            </View>
            <Text style={s.tileLabel}>{mod.label}</Text>
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
    title: { fontSize: 22, fontWeight: '700', color: colors.foreground, marginBottom: 20, textAlign: 'right' },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    tile: {
      width: '30%', backgroundColor: colors.card, borderRadius: 16,
      padding: 16, alignItems: 'center', gap: 8,
      shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, elevation: 3,
    },
    tileIcon: { width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    tileLabel: { fontSize: 12, fontWeight: '700', color: colors.foreground, textAlign: 'center' },
  });
