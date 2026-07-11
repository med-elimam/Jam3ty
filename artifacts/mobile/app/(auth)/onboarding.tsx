import React, { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/contexts/AuthContext';
import { useT } from '@/contexts/PreferencesContext';
import {
  useListUniversities,
  useListFaculties,
  useListDepartments,
  useListLevels,
  useListGroups,
  useCompleteOnboarding,
} from '@workspace/api-client-react';
import { Button } from '@/components/ui/Button';
import { showAlert } from '@/lib/alert';
import { spacing, fontSize, fontWeight, radius, shadow } from '@/constants/theme';

const STEPS = ['University', 'Faculty', 'Department', 'Level', 'Language'] as const;

const LANGUAGES = [
  { code: 'ar', label: 'العربية', flag: '🇲🇷' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
] as const;

interface Selection {
  universityId?: string;
  facultyId?: string;
  departmentId?: string;
  levelId?: string;
  groupId?: string;
  language: 'ar' | 'fr';
}

export default function OnboardingScreen() {
  const colors = useColors();
  const router = useRouter();
  const { updateUser } = useAuth();
  const { t, tArray } = useT();
  const [step, setStep] = useState(0);
  const [sel, setSel] = useState<Selection>({ language: 'ar' });

  const universities = useListUniversities();
  const faculties = useListFaculties(sel.universityId ?? '', { query: { enabled: !!sel.universityId } } as any);
  const departments = useListDepartments(sel.facultyId ?? '', { query: { enabled: !!sel.facultyId } } as any);
  const levels = useListLevels(sel.departmentId ?? '', { query: { enabled: !!sel.departmentId } } as any);
  const groups = useListGroups(sel.levelId ?? '', { query: { enabled: !!sel.levelId } } as any);

  const completeMutation = useCompleteOnboarding({
    mutation: {
      onSuccess: () => {
        updateUser({ profile: { onboardingComplete: true } });
        router.replace('/(tabs)');
      },
      onError: () => showAlert(t('common.error'), t('onboarding.saveError')),
    },
  });

  const canNext = () => {
    if (step === 0) return !!sel.universityId;
    if (step === 1) return !!sel.facultyId;
    if (step === 2) return !!sel.departmentId;
    if (step === 3) return !!sel.levelId;
    if (step === 4) return !!sel.language;
    return false;
  };

  const handleFinish = () => {
    if (!sel.universityId || !sel.facultyId || !sel.departmentId || !sel.levelId) return;
    completeMutation.mutate({
      data: {
        universityId: sel.universityId,
        facultyId: sel.facultyId,
        departmentId: sel.departmentId,
        levelId: sel.levelId,
        groupId: sel.groupId,
        language: sel.language,
      },
    });
  };

  type StepData = {
    items: any[];
    isLoading: boolean;
    field: keyof Selection | 'language';
    getId: (i: any) => string;
    getLabel: (i: any) => string;
  };

  const getStepData = (): StepData => {
    switch (step) {
      case 0: return { items: (universities.data as any)?.data ?? [], isLoading: universities.isLoading, field: 'universityId', getId: (i) => i.id, getLabel: (i) => i.nameAr || i.name };
      case 1: return { items: (faculties.data as any)?.data ?? [], isLoading: faculties.isLoading, field: 'facultyId', getId: (i) => i.id, getLabel: (i) => i.nameAr || i.name };
      case 2: return { items: (departments.data as any)?.data ?? [], isLoading: departments.isLoading, field: 'departmentId', getId: (i) => i.id, getLabel: (i) => i.nameAr || i.name };
      case 3: return { items: (levels.data as any)?.data ?? [], isLoading: levels.isLoading, field: 'levelId', getId: (i) => i.id, getLabel: (i) => i.nameAr || i.name };
      case 4: return { items: LANGUAGES as any, isLoading: false, field: 'language', getId: (i) => i.code, getLabel: (i) => `${i.flag}  ${i.label}` };
      default: return { items: [], isLoading: false, field: 'universityId', getId: () => '', getLabel: () => '' };
    }
  };

  const { items, isLoading, field, getId, getLabel } = getStepData();

  const getSelected = (): string | undefined => (sel as any)[field];

  /** When a higher-level field changes, clear all dependent downstream fields. */
  const selectField = (f: keyof Selection, value: string) => {
    setSel((prev) => {
      const next: Selection = { ...prev, [f]: value };
      if (f === 'universityId') {
        next.facultyId = undefined;
        next.departmentId = undefined;
        next.levelId = undefined;
        next.groupId = undefined;
      } else if (f === 'facultyId') {
        next.departmentId = undefined;
        next.levelId = undefined;
        next.groupId = undefined;
      } else if (f === 'departmentId') {
        next.levelId = undefined;
        next.groupId = undefined;
      } else if (f === 'levelId') {
        next.groupId = undefined;
      }
      return next;
    });
  };

  const progressPct = ((step + 1) / STEPS.length) * 100;
  const stepTitles = tArray('onboarding.steps');

  return (
    <View style={[s.root, { backgroundColor: colors.background }]}>
      {/* Progress bar */}
      <View style={[s.progressTrack, { backgroundColor: colors.border }]}>
        <View
          style={[
            s.progressFill,
            { backgroundColor: colors.primary, width: `${progressPct}%` as any },
          ]}
        />
      </View>

      {/* Step info */}
      <View style={s.stepInfo}>
        <Text style={[s.stepCount, { color: colors.mutedForeground }]}>
          {step + 1} / {STEPS.length}
        </Text>
        <Text style={[s.stepTitle, { color: colors.primary }]}>{stepTitles[step]}</Text>
      </View>

      {/* Options list */}
      {isLoading ? (
        <View style={s.loader}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => getId(item)}
          contentContainerStyle={s.list}
          ListEmptyComponent={
            <Text style={[s.emptyText, { color: colors.mutedForeground }]}>
              {t('onboarding.noOptions')}
            </Text>
          }
          renderItem={({ item }) => {
            const id = getId(item);
            const isSelected = getSelected() === id;
            return (
              <TouchableOpacity
                activeOpacity={0.75}
                style={[
                  s.option,
                  shadow.sm,
                  {
                    backgroundColor: isSelected ? colors.primary : colors.card,
                    borderColor: isSelected ? colors.primary : colors.border,
                    borderRadius: 16,
                    borderCurve: 'continuous',
                  },
                ]}
                onPress={() => selectField(field as keyof Selection, id)}
              >
                <Text
                  style={[
                    s.optionLabel,
                    { color: isSelected ? '#fff' : colors.foreground },
                  ]}
                  numberOfLines={2}
                >
                  {getLabel(item)}
                </Text>
                <View
                  style={[
                    s.radio,
                    {
                      borderColor: isSelected ? '#fff' : colors.border,
                      backgroundColor: isSelected ? '#fff' : 'transparent',
                    },
                  ]}
                >
                  {isSelected && (
                    <View style={[s.radioDot, { backgroundColor: colors.primary }]} />
                  )}
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* Optional group selector on step 3 */}
      {step === 3 && sel.levelId && (groups.data as any)?.data?.length > 0 && (
        <View style={[s.groupSection, { borderTopColor: colors.border }]}>
          <Text style={[s.groupTitle, { color: colors.mutedForeground }]}>{t('onboarding.groupOptional')}</Text>
          <View style={s.groupRow}>
            {((groups.data as any)?.data ?? []).map((g: any) => (
              <TouchableOpacity
                key={g.id}
                style={[
                  s.groupChip,
                  {
                    backgroundColor: sel.groupId === g.id ? colors.primary : colors.secondary,
                    borderRadius: radius.full,
                  },
                ]}
                onPress={() => setSel((p) => ({ ...p, groupId: g.id }))}
              >
                <Text style={{ color: sel.groupId === g.id ? '#fff' : colors.primary, fontSize: fontSize.sm, fontWeight: fontWeight.semibold }}>
                  {g.nameAr || g.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Bottom actions */}
      <View style={[s.bottom, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
        {step > 0 && (
          <Button
            label={t('onboarding.back')}
            variant="outline"
            size="md"
            onPress={() => setStep((p) => p - 1)}
            style={s.backBtn}
          />
        )}
        <Button
          label={step === STEPS.length - 1 ? t('onboarding.finish') : t('onboarding.next')}
          variant="primary"
          size="lg"
          disabled={!canNext()}
          loading={completeMutation.isPending}
          onPress={() => {
            if (step < STEPS.length - 1) setStep((p) => p + 1);
            else handleFinish();
          }}
          style={s.nextBtn}
        />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },

  progressTrack: { height: 4, marginHorizontal: spacing.base, marginTop: spacing.xl, borderRadius: radius.full, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: radius.full },

  stepInfo: { paddingHorizontal: spacing.base, paddingTop: spacing.lg, paddingBottom: spacing.sm, gap: spacing.xs },
  stepCount: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, textAlign: 'right' },
  stepTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, textAlign: 'right' },

  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  list: { paddingHorizontal: spacing.base, paddingBottom: 160, gap: spacing.sm },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.base,
    borderWidth: 1.5,
  },
  optionLabel: { flex: 1, fontSize: fontSize.md, fontWeight: fontWeight.medium, textAlign: 'right' },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginLeft: spacing.md },
  radioDot: { width: 10, height: 10, borderRadius: 5 },

  emptyText: { textAlign: 'center', marginTop: spacing['3xl'], fontSize: fontSize.md },

  groupSection: { paddingHorizontal: spacing.base, paddingVertical: spacing.md, borderTopWidth: 1, gap: spacing.sm },
  groupTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, textAlign: 'right' },
  groupRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'flex-end' },
  groupChip: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm },

  bottom: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    padding: spacing.base,
    paddingBottom: spacing.xl,
    flexDirection: 'row',
    gap: spacing.sm,
    borderTopWidth: 1,
  },
  backBtn: { flex: 1 },
  nextBtn: { flex: 2 },
});
