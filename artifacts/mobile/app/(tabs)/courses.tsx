import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Animated,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { usePreferences } from '@/contexts/PreferencesContext';
import { useListCourses, Course } from '@workspace/api-client-react';
import { Feather } from '@expo/vector-icons';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { GuestGate } from '@/components/GuestGate';
import { spacing, fontSize, fontWeight, shadow } from '@/constants/theme';

// ── Subject identity colors (used only as a small accent, never as a fill) ──
const SUBJECT_HUES = ['#4F46E5', '#10B981', '#F59E0B', '#3B82F6', '#EC4899', '#14B8A6', '#8B5CF6', '#EF4444'];

/** Leading non-digit part of a course code, e.g. "CS101" → "CS", "MATH101" → "MATH". */
function codePrefix(code?: string | null): string | null {
  if (!code) return null;
  const p = code.replace(/[0-9].*$/, '').trim().toUpperCase();
  return p.length > 0 ? p : null;
}

/** Deterministic subject color from a string key. */
function hueFor(key: string): string {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return SUBJECT_HUES[h % SUBJECT_HUES.length];
}

type SortKey = 'alpha' | 'files' | 'assignments';

/** Respect the OS "Reduce Motion" setting for press feedback. */
function useReduceMotion(): boolean {
  const [rm, setRm] = useState(false);
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => mounted && setRm(v));
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setRm);
    return () => {
      mounted = false;
      sub?.remove?.();
    };
  }, []);
  return rm;
}

export default function CoursesScreen() {
  return (
    <GuestGate>
      <CoursesScreenInner />
    </GuestGate>
  );
}

function CoursesScreenInner() {
  const colors = useColors();
  const router = useRouter();
  const { t, isRTL } = usePreferences();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string | null>(null); // null = "all"
  const [sort, setSort] = useState<SortKey>('alpha');
  const [sortOpen, setSortOpen] = useState(false);

  const { data, isLoading, isError, refetch } = useListCourses({ search: search || undefined });
  const allCourses: Course[] = data?.data ?? [];

  // Categories derived purely from real course-code prefixes.
  const categories = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of allCourses) {
      const p = codePrefix(c.code);
      if (p) map.set(p, (map.get(p) ?? 0) + 1);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [allCourses]);

  // Client-side category filter + sort (search stays server-side).
  const courses = useMemo(() => {
    let list = category ? allCourses.filter((c) => codePrefix(c.code) === category) : allCourses;
    list = [...list];
    if (sort === 'alpha') {
      list.sort((a, b) => (a.nameAr || a.name).localeCompare(b.nameAr || b.name));
    } else if (sort === 'files') {
      list.sort((a, b) => (b.fileCount ?? 0) - (a.fileCount ?? 0));
    } else {
      list.sort((a, b) => (b.assignmentCount ?? 0) - (a.assignmentCount ?? 0));
    }
    return list;
  }, [allCourses, category, sort]);

  const sortLabel =
    sort === 'alpha' ? t('courses.sortAlpha') : sort === 'files' ? t('courses.sortFiles') : t('courses.sortAssignments');

  const rowDir = { flexDirection: isRTL ? 'row-reverse' : 'row' } as const;
  const showLowDataHint = !search && category === null && courses.length === 1;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* ── Search + filter row (fixed) ── */}
      <View style={[s.searchRow, rowDir]}>
        <View style={[s.searchBar, rowDir, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="search" size={18} color={colors.mutedForeground} />
          <TextInput
            style={[s.searchInput, { color: colors.foreground }]}
            placeholder={t('courses.searchPlaceholder')}
            placeholderTextColor={colors.mutedForeground}
            value={search}
            onChangeText={setSearch}
            textAlign={isRTL ? 'right' : 'left'}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Feather name="x" size={18} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          onPress={() => setSortOpen(true)}
          activeOpacity={0.75}
          accessibilityRole="button"
          accessibilityLabel={t('courses.sortLabel')}
          style={[s.filterBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <Feather name="sliders" size={18} color={colors.foreground} />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.primary} size="large" style={{ marginTop: 40 }} />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : (
        <FlatList
          data={courses}
          keyExtractor={(item) => item.id}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            allCourses.length > 0 ? (
              <View>
                {/* ── Subject category strip ── */}
                {categories.length > 0 && (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={[s.stripContent, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                  >
                    <CategoryChip
                      label={t('courses.all')}
                      count={allCourses.length}
                      icon="grid"
                      active={category === null}
                      onPress={() => setCategory(null)}
                    />
                    {categories.map(([code, n]) => (
                      <CategoryChip
                        key={code}
                        label={code}
                        count={n}
                        dot={hueFor(code)}
                        countLabel={t('courses.subjectUnit', { n })}
                        active={category === code}
                        onPress={() => setCategory(category === code ? null : code)}
                      />
                    ))}
                  </ScrollView>
                )}

                {/* ── Section header + sort ── */}
                <View style={[s.sectionHeader, rowDir]}>
                  <Text style={[s.sectionTitle, { color: colors.foreground }]}>
                    {t('courses.sectionCount', { n: courses.length })}
                  </Text>
                  <TouchableOpacity
                    onPress={() => setSortOpen(true)}
                    activeOpacity={0.75}
                    accessibilityRole="button"
                    style={[s.sortPill, rowDir, { borderColor: colors.border, backgroundColor: colors.card }]}
                  >
                    <Text style={[s.sortPillText, { color: colors.foreground }]}>{sortLabel}</Text>
                    <Feather name="chevron-down" size={14} color={colors.mutedForeground} />
                  </TouchableOpacity>
                </View>
              </View>
            ) : null
          }
          ListEmptyComponent={
            search ? (
              <CompactEmpty icon="search" title={t('courses.noResults')} body={t('courses.noResultsBody')} />
            ) : (
              <EmptyState icon="book-open" title={t('courses.empty')} body={t('courses.emptyBody')} />
            )
          }
          ListFooterComponent={
            showLowDataHint ? (
              <Text style={[s.lowDataHint, { color: colors.mutedForeground }]}>{t('courses.moreSoon')}</Text>
            ) : null
          }
          renderItem={({ item }) => (
            <SubjectCard
              course={item}
              onPress={() => router.push({ pathname: '/course/[id]', params: { id: item.id } })}
            />
          )}
        />
      )}

      <SortSheet
        visible={sortOpen}
        current={sort}
        onSelect={(k) => {
          setSort(k);
          setSortOpen(false);
        }}
        onClose={() => setSortOpen(false)}
      />
    </View>
  );
}

// ── Subject category chip ──
function CategoryChip({
  label,
  count,
  countLabel,
  icon,
  dot,
  active,
  onPress,
}: {
  label: string;
  count: number;
  countLabel?: string;
  icon?: keyof typeof Feather.glyphMap;
  dot?: string;
  active: boolean;
  onPress: () => void;
}) {
  const colors = useColors();
  const { t } = usePreferences();

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={[
        s.chip,
        {
          borderColor: active ? colors.primary : colors.border,
          backgroundColor: active ? colors.primary + '12' : colors.card,
        },
      ]}
    >
      <View style={s.chipTop}>
        {icon && <Feather name={icon} size={13} color={active ? colors.primary : colors.mutedForeground} />}
        {dot && <View style={[s.chipDot, { backgroundColor: dot }]} />}
        <Text style={[s.chipLabel, { color: active ? colors.primary : colors.foreground }]}>{label}</Text>
      </View>
      <Text style={[s.chipCount, { color: active ? colors.primary : colors.mutedForeground }]}>
        {countLabel ?? t('courses.subjectUnit', { n: count })}
      </Text>
    </TouchableOpacity>
  );
}

// ── Rich subject card ──
function SubjectCard({ course, onPress }: { course: Course; onPress: () => void }) {
  const colors = useColors();
  const { t, isRTL } = usePreferences();
  const reduceMotion = useReduceMotion();
  const scale = useRef(new Animated.Value(1)).current;

  const press = (to: number) =>
    Animated.timing(scale, { toValue: reduceMotion ? 1 : to, duration: 150, useNativeDriver: true }).start();

  const prefix = codePrefix(course.code);
  const hue = prefix ? hueFor(prefix) : colors.primary;
  const title = course.nameAr || course.name;
  const semMatch = course.semester?.match(/(\d+)/);
  const semText = semMatch ? t('courses.semesterLabel', { n: semMatch[1] }) : course.semester;

  const align = { textAlign: isRTL ? 'right' : 'left' } as const;
  const accentEdge = isRTL
    ? { left: 0, borderTopLeftRadius: 14, borderBottomLeftRadius: 14 }
    : { right: 0, borderTopRightRadius: 14, borderBottomRightRadius: 14 };

  return (
    <Pressable onPress={onPress} onPressIn={() => press(0.98)} onPressOut={() => press(1)}>
      <Animated.View
        style={[
          s.card,
          shadow.sm,
          { backgroundColor: colors.card, borderColor: colors.border, transform: [{ scale }] },
        ]}
      >
        {/* subject-colored accent line on the end edge */}
        <View style={[s.accent, accentEdge, { backgroundColor: hue }]} />

        <View style={[s.cardRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          {/* start: subject code badge */}
          {course.code ? (
            <View style={[s.codeBadge, { backgroundColor: hue + '14', borderColor: hue + '33' }]}>
              <Text style={[s.codeText, { color: hue }]} numberOfLines={1}>
                {course.code}
              </Text>
            </View>
          ) : null}

          {/* middle: info */}
          <View style={[s.info, { alignItems: isRTL ? 'flex-end' : 'flex-start' }]}>
            <Text style={[s.title, align, { color: colors.foreground }]} numberOfLines={2}>
              {title}
            </Text>
            {course.professorName ? (
              <Text style={[s.meta, align, { color: colors.mutedForeground }]} numberOfLines={1}>
                {t('courses.professorPrefix')}
                {course.professorName}
              </Text>
            ) : null}
            {semText ? (
              <Text style={[s.metaSmall, align, { color: colors.mutedForeground }]} numberOfLines={1}>
                {semText}
              </Text>
            ) : null}

            <View style={[s.divider, { backgroundColor: colors.border }]} />

            <View style={[s.stats, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={[s.stat, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Feather name="file-text" size={12} color={colors.mutedForeground} />
                <Text style={[s.statText, { color: colors.mutedForeground }]}>
                  {t('courses.fileCount', { n: course.fileCount ?? 0 })}
                </Text>
              </View>
              <Text style={[s.dotSep, { color: colors.border }]}>·</Text>
              <View style={[s.stat, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Feather name="clipboard" size={12} color={colors.mutedForeground} />
                <Text style={[s.statText, { color: colors.mutedForeground }]}>
                  {t('courses.assignmentCount', { n: course.assignmentCount ?? 0 })}
                </Text>
              </View>
            </View>
          </View>

          {/* end: chevron */}
          <Feather name={isRTL ? 'chevron-left' : 'chevron-right'} size={18} color={colors.mutedForeground} />
        </View>
      </Animated.View>
    </Pressable>
  );
}

// ── Compact empty state (no oversized illustration) ──
function CompactEmpty({ icon, title, body }: { icon: keyof typeof Feather.glyphMap; title: string; body: string }) {
  const colors = useColors();
  return (
    <View style={s.compactEmpty}>
      <View style={[s.compactIcon, { backgroundColor: colors.muted }]}>
        <Feather name={icon} size={20} color={colors.mutedForeground} />
      </View>
      <Text style={[s.compactTitle, { color: colors.foreground }]}>{title}</Text>
      <Text style={[s.compactBody, { color: colors.mutedForeground }]}>{body}</Text>
    </View>
  );
}

// ── Sort bottom sheet ──
function SortSheet({
  visible,
  current,
  onSelect,
  onClose,
}: {
  visible: boolean;
  current: SortKey;
  onSelect: (k: SortKey) => void;
  onClose: () => void;
}) {
  const colors = useColors();
  const { t, isRTL } = usePreferences();

  const options: { key: SortKey; label: string }[] = [
    { key: 'alpha', label: t('courses.sortAlpha') },
    { key: 'files', label: t('courses.sortFiles') },
    { key: 'assignments', label: t('courses.sortAssignments') },
  ];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose}>
        <Pressable style={[s.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[s.sheetTitle, { color: colors.foreground, textAlign: isRTL ? 'right' : 'left' }]}>
            {t('courses.sortLabel')}
          </Text>
          {options.map((o) => {
            const active = o.key === current;
            return (
              <TouchableOpacity
                key={o.key}
                onPress={() => onSelect(o.key)}
                activeOpacity={0.75}
                style={[s.sheetRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
              >
                <Text style={[s.sheetRowText, { color: active ? colors.primary : colors.foreground }]}>{o.label}</Text>
                {active && <Feather name="check" size={18} color={colors.primary} />}
              </TouchableOpacity>
            );
          })}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  searchRow: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.base,
    paddingTop: spacing.base,
    paddingBottom: spacing.sm,
  },
  searchBar: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md - 1,
    borderRadius: 12,
    borderCurve: 'continuous',
    borderWidth: 1,
  },
  searchInput: { flex: 1, fontSize: fontSize.md },
  filterBtn: {
    width: 46,
    height: 46,
    borderRadius: 12,
    borderCurve: 'continuous',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: { paddingHorizontal: spacing.base, paddingBottom: 100, gap: spacing.sm },

  // category strip
  stripContent: { gap: spacing.sm, paddingVertical: spacing.sm },
  chip: {
    minWidth: 68,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 12,
    borderCurve: 'continuous',
    borderWidth: 1,
    gap: 4,
    alignItems: 'center',
  },
  chipTop: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  chipDot: { width: 7, height: 7, borderRadius: 4 },
  chipLabel: { fontSize: 13, fontWeight: fontWeight.semibold },
  chipCount: { fontSize: 11, fontWeight: fontWeight.medium },

  // section header
  sectionHeader: {
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  sectionTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold },
  sortPill: {
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  sortPillText: { fontSize: fontSize.sm, fontWeight: fontWeight.medium },

  // card
  card: {
    borderRadius: 14,
    borderCurve: 'continuous',
    borderWidth: 1,
    padding: 14,
    minHeight: 96,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  accent: { position: 'absolute', top: 0, bottom: 0, width: 4 },
  cardRow: { alignItems: 'center', gap: spacing.md },
  codeBadge: {
    paddingHorizontal: 10,
    height: 30,
    borderRadius: 8,
    borderCurve: 'continuous',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  codeText: { fontSize: 12, fontWeight: fontWeight.bold },
  info: { flex: 1, minWidth: 0 },
  title: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, alignSelf: 'stretch' },
  meta: { fontSize: fontSize.sm, marginTop: 3, alignSelf: 'stretch' },
  metaSmall: { fontSize: fontSize.xs, marginTop: 2, alignSelf: 'stretch' },
  divider: { height: 1, alignSelf: 'stretch', marginVertical: 8 },
  stats: { alignItems: 'center', gap: spacing.sm },
  stat: { alignItems: 'center', gap: 4 },
  statText: { fontSize: fontSize.xs },
  dotSep: { fontSize: fontSize.sm },

  // compact empty
  compactEmpty: { alignItems: 'center', paddingVertical: spacing['2xl'], paddingHorizontal: spacing['2xl'], gap: 6 },
  compactIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  compactTitle: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, textAlign: 'center' },
  compactBody: { fontSize: fontSize.sm, textAlign: 'center', maxWidth: 260, lineHeight: 18 },
  lowDataHint: { fontSize: fontSize.sm, textAlign: 'center', paddingVertical: spacing.lg, paddingHorizontal: spacing.xl, lineHeight: 20 },

  // sort sheet
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing['2xl'],
    gap: spacing.xs,
  },
  sheetTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, marginBottom: spacing.sm },
  sheetRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
  },
  sheetRowText: { fontSize: fontSize.md, fontWeight: fontWeight.medium },
});
