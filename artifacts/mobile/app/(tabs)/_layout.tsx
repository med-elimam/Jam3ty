import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { usePreferences } from '@/contexts/PreferencesContext';
import { useResolvedScheme } from '@/contexts/PreferencesContext';
import { Feather } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Tabs } from 'expo-router';
import { directionalHeaderOptions } from '@/components/DirectionalHeaderTitle';

type FeatherName = React.ComponentProps<typeof Feather>['name'];

function TabIcon({ name, color }: { name: FeatherName; color: string }) {
  return (
    <View style={styles.iconWrap}>
      <Feather name={name} size={22} color={color} />
    </View>
  );
}

// Canonical LTR tab order (visual left → right for French).
// Route name → icon + label key. Reversed as a whole for Arabic (RTL).
const TAB_ORDER: { name: string; icon: FeatherName; titleKey: string }[] = [
  { name: 'index', icon: 'home', titleKey: 'nav.home' },
  { name: 'courses', icon: 'book-open', titleKey: 'nav.courses' },
  { name: 'calendar', icon: 'calendar', titleKey: 'nav.timetable' },
  { name: 'community', icon: 'users', titleKey: 'nav.community' },
  { name: 'profile', icon: 'user', titleKey: 'nav.profile' },
];

export default function TabLayout() {
  const colors = useColors();
  const { t, isRTL } = usePreferences();
  const isDark = useResolvedScheme() === 'dark';
  const isIOS = Platform.OS === 'ios';

  // Arabic: reverse the whole array so الرئيسية (Home) renders far right and
  // الملف (Profile) far left. French: keep canonical order (Accueil far left).
  // The tab bar itself uses a plain 'row' — order is driven by declaration order.
  const tabs = isRTL ? [...TAB_ORDER].reverse() : TAB_ORDER;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        headerShown: true,
        headerStyle: { backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border, elevation: 0, shadowOpacity: 0 },
        headerTintColor: colors.foreground,
        tabBarStyle: {
          flexDirection: 'row',
          position: 'absolute',
          backgroundColor: isIOS ? 'transparent' : colors.card,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          elevation: 0,
          height: Platform.OS === 'android' ? 64 : 80,
          paddingBottom: Platform.OS === 'android' ? 8 : 22,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          marginTop: 2,
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView
              intensity={96}
              tint={isDark ? 'dark' : 'default'}
              style={StyleSheet.absoluteFill}
            />
          ) : null,
      }}
    >
      {tabs.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            ...directionalHeaderOptions(t(tab.titleKey), isRTL),
            headerShown: tab.name !== 'index', // Hide header for Home tab
            tabBarIcon: ({ color }) => (
              <TabIcon name={tab.icon} color={color} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconWrap: { alignItems: 'center', justifyContent: 'center', gap: 3 },
});
