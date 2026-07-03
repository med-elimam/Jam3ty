import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/contexts/AuthContext';
import {
  useListUniversities,
  useListFaculties,
  useListDepartments,
  useListLevels,
  useListGroups,
  useCompleteOnboarding,
} from '@workspace/api-client-react';

const STEPS = ['University', 'Faculty', 'Department', 'Level', 'Language'] as const;

const LANGUAGES = [
  { code: 'ar', label: 'العربية', flag: '🇲🇷' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
];

interface Selection {
  universityId: string;
  universityName: string;
  facultyId: string;
  facultyName: string;
  departmentId: string;
  departmentName: string;
  levelId: string;
  levelName: string;
  groupId?: string;
  language: 'ar' | 'fr' | 'en';
}

export default function OnboardingScreen() {
  const colors = useColors();
  const router = useRouter();
  const { updateUser } = useAuth();
  const [step, setStep] = useState(0);
  const [sel, setSel] = useState<Partial<Selection>>({ language: 'ar' });

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
      onError: () => Alert.alert('خطأ', 'تعذّر حفظ بياناتك. يرجى المحاولة مجدداً.'),
    },
  });

  const canNext = () => {
    switch (step) {
      case 0: return !!sel.universityId;
      case 1: return !!sel.facultyId;
      case 2: return !!sel.departmentId;
      case 3: return !!sel.levelId;
      case 4: return !!sel.language;
      default: return false;
    }
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
        language: sel.language ?? 'ar',
      },
    });
  };

  const getStepData = () => {
    switch (step) {
      case 0: return { items: universities.data?.data ?? [], isLoading: universities.isLoading, field: 'universityId', getLabel: (i: any) => `${i.nameAr || i.name}` };
      case 1: return { items: faculties.data?.data ?? [], isLoading: faculties.isLoading, field: 'facultyId', getLabel: (i: any) => `${i.nameAr || i.name}` };
      case 2: return { items: departments.data?.data ?? [], isLoading: departments.isLoading, field: 'departmentId', getLabel: (i: any) => `${i.nameAr || i.name}` };
      case 3: return { items: [...(levels.data?.data ?? []), ...(groups.data?.data ?? [])], isLoading: levels.isLoading, field: 'levelId', getLabel: (i: any) => `${i.nameAr || i.name}` };
      case 4: return { items: LANGUAGES, isLoading: false, field: 'language', getLabel: (i: any) => `${i.flag} ${i.label}` };
      default: return { items: [], isLoading: false, field: '', getLabel: (_: any) => '' };
    }
  };

  const { items, isLoading, field, getLabel } = getStepData();

  const s = styles(colors);

  return (
    <View style={s.root}>
      {/* Progress */}
      <View style={s.progress}>
        {STEPS.map((_, i) => (
          <View key={i} style={[s.dot, i <= step && s.dotActive]} />
        ))}
      </View>

      <Text style={s.title}>{stepTitle(step)}</Text>

      {isLoading ? (
        <ActivityIndicator color={colors.navy} size="large" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={step === 3 ? levels.data?.data ?? [] : items}
          keyExtractor={(item: any) => item.id ?? item.code}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 120 }}
          renderItem={({ item }: { item: any }) => {
            const isSelected = field === 'language'
              ? sel.language === item.code
              : (sel as any)[field] === item.id;
            return (
              <TouchableOpacity
                style={[s.option, isSelected && s.optionSelected]}
                onPress={() => {
                  if (field === 'language') {
                    setSel((p) => ({ ...p, language: item.code }));
                  } else {
                    setSel((p) => ({ ...p, [field]: item.id }));
                  }
                }}
              >
                <Text style={[s.optionText, isSelected && s.optionTextSelected]}>
                  {getLabel(item)}
                </Text>
                {isSelected && <Text style={s.check}>✓</Text>}
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={<Text style={s.empty}>لا توجد خيارات متاحة</Text>}
        />
      )}

      {/* Groups on step 3 */}
      {step === 3 && sel.levelId && (groups.data?.data ?? []).length > 0 && (
        <View style={{ paddingHorizontal: 24, marginTop: 8 }}>
          <Text style={s.groupLabel}>المجموعة (اختياري)</Text>
          {(groups.data?.data ?? []).map((g: any) => (
            <TouchableOpacity
              key={g.id}
              style={[s.option, sel.groupId === g.id && s.optionSelected]}
              onPress={() => setSel((p) => ({ ...p, groupId: g.id }))}
            >
              <Text style={[s.optionText, sel.groupId === g.id && s.optionTextSelected]}>
                {g.nameAr || g.name}
              </Text>
              {sel.groupId === g.id && <Text style={s.check}>✓</Text>}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Bottom actions */}
      <View style={s.bottom}>
        {step > 0 && (
          <TouchableOpacity style={s.backBtn} onPress={() => setStep((p) => p - 1)}>
            <Text style={s.backBtnText}>رجوع</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[s.nextBtn, (!canNext() || completeMutation.isPending) && s.btnDisabled]}
          disabled={!canNext() || completeMutation.isPending}
          onPress={() => {
            if (step < STEPS.length - 1) setStep((p) => p + 1);
            else handleFinish();
          }}
        >
          {completeMutation.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={s.nextBtnText}>{step === STEPS.length - 1 ? 'إنهاء' : 'التالي'}</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

function stepTitle(step: number) {
  switch (step) {
    case 0: return 'اختر جامعتك';
    case 1: return 'اختر الكلية أو المعهد';
    case 2: return 'اختر القسم';
    case 3: return 'اختر السنة الدراسية';
    case 4: return 'اختر لغة التطبيق';
    default: return '';
  }
}

const styles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background, paddingTop: 60 },
    progress: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 24 },
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.border },
    dotActive: { backgroundColor: colors.navy, width: 24 },
    title: { fontSize: 24, fontWeight: '700', color: colors.navy, textAlign: 'center', marginBottom: 24 },
    option: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      backgroundColor: colors.card, borderRadius: 12, padding: 16, marginBottom: 8,
      borderWidth: 1.5, borderColor: colors.border,
    },
    optionSelected: { borderColor: colors.navy, backgroundColor: colors.secondary },
    optionText: { fontSize: 16, color: colors.foreground, flex: 1, textAlign: 'right' },
    optionTextSelected: { color: colors.navy, fontWeight: '600' },
    check: { fontSize: 18, color: colors.navy },
    empty: { textAlign: 'center', color: colors.mutedForeground, marginTop: 40 },
    groupLabel: { fontSize: 14, fontWeight: '600', color: colors.mutedForeground, marginBottom: 8, textAlign: 'right' },
    bottom: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 24, flexDirection: 'row', gap: 12, backgroundColor: colors.background, borderTopWidth: 1, borderTopColor: colors.border },
    backBtn: { flex: 1, borderWidth: 1.5, borderColor: colors.border, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
    backBtnText: { fontSize: 16, fontWeight: '600', color: colors.foreground },
    nextBtn: { flex: 2, backgroundColor: colors.navy, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
    nextBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
    btnDisabled: { opacity: 0.5 },
  });
