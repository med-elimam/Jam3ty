import React, { useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { showAlert } from '@/lib/alert';
import { useColors } from '@/hooks/useColors';
import { useListPlans, useGetMySubscription, useRedeemActivationCode, useSubmitPaymentProof, Plan, PaymentProofInputMethod } from '@workspace/api-client-react';
import { getGetMySubscriptionQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { usePreferences } from '@/contexts/PreferencesContext';
import { useAuth } from '@/contexts/AuthContext';
import { useRequireAccount } from '@/components/GuestGate';
import { ErrorState } from '@/components/ui/ErrorState';
import { Feather } from '@expo/vector-icons';

const PAYMENT_METHODS: { id: PaymentProofInputMethod; label?: string; labelKey?: string; icon: string }[] = [
  { id: PaymentProofInputMethod.bankily, label: 'Bankily', icon: '🏦' },
  { id: PaymentProofInputMethod.masrvi, label: 'Masrvi', icon: '📱' },
  { id: PaymentProofInputMethod.sedad, label: 'Sedad', icon: '💳' },
  { id: PaymentProofInputMethod.cash_agent, labelKey: 'subscription.cashAgent', icon: '💵' },
];

// Guest-visible: plans & pricing are public (GET /plans requires no auth).
// The my-subscription query is skipped for guests; redeeming a code and
// subscribing prompt for an account.
export default function SubscriptionScreen() {
  const colors = useColors();
  const { t, isRTL, language } = usePreferences();
  const { isGuest } = useAuth();
  const requireAccount = useRequireAccount();
  const qc = useQueryClient();
  const [redeemCode, setRedeemCode] = useState('');
  const [showPayment, setShowPayment] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [payMethod, setPayMethod] = useState<PaymentProofInputMethod>(PaymentProofInputMethod.bankily);
  const [phone, setPhone] = useState('');
  const [transactionRef, setTransactionRef] = useState('');

  const plansQuery = useListPlans();
  const subQuery = useGetMySubscription({ query: { enabled: !isGuest, queryKey: getGetMySubscriptionQueryKey() } });
  const plans: Plan[] = plansQuery.data?.data ?? [];
  const sub = subQuery.data?.data;

  const redeemMutation = useRedeemActivationCode({
    mutation: {
      onSuccess: (data) => {
        qc.invalidateQueries({ queryKey: getGetMySubscriptionQueryKey() });
        showAlert(t('subscription.activatedTitle'), t('subscription.activatedBody', { plan: data.data.planName, days: data.data.daysRemaining }));
        setRedeemCode('');
      },
      onError: () => showAlert(t('common.error'), t('subscription.invalidCode')),
    },
  });

  const paymentMutation = useSubmitPaymentProof({
    mutation: {
      onSuccess: () => {
        setShowPayment(false);
        setPhone('');
        setTransactionRef('');
        showAlert(t('subscription.paymentSentTitle'), t('subscription.paymentSentBody'));
      },
      onError: () => showAlert(t('common.error'), t('subscription.paymentError')),
    },
  });

  const s = styles(colors);
  const align = { textAlign: isRTL ? 'right' : 'left' } as const;

  const methodLabel = (m: { label?: string; labelKey?: string }) => m.labelKey ? t(m.labelKey) : (m.label ?? '');
  const planName = (plan: Plan | null) => {
    if (!plan) return '';
    return language === 'fr' ? (plan.nameFr || plan.name) : (plan.nameAr || plan.name);
  };

  const submitPayment = () => {
    if (!selectedPlan || !phone.trim()) return;
    paymentMutation.mutate({
      data: {
        planId: selectedPlan.id,
        amountMru: selectedPlan.priceMru,
        method: payMethod,
        phoneNumber: phone.trim(),
        transactionRef: transactionRef.trim() || null,
      },
    });
  };

  return (
    <ScrollView style={s.root} contentContainerStyle={{ paddingBottom: 100 }}>
      {/* Current subscription */}
      {sub ? (
        <View style={s.currentSub}>
          <Feather name="check-circle" size={28} color={colors.success} />
          <View>
            <Text style={[s.currentPlan, align]}>{sub.planName}</Text>
            <Text style={[s.currentDays, align]}>{t('subscription.daysRemaining', { n: sub.daysRemaining })}</Text>
          </View>
        </View>
      ) : (
        <View style={s.freeBanner}>
          <Text style={[s.freeBannerTitle, align]}>{t('subscription.freePlan')}</Text>
          <Text style={[s.freeBannerSub, align]}>{t('subscription.freeUpgrade')}</Text>
        </View>
      )}

      {/* Redeem code */}
      <View style={s.section}>
        <Text style={[s.sectionTitle, align]}>{`🎟 ${t('subscription.redeemTitle')}`}</Text>
        <View style={s.redeemRow}>
          <TextInput
            style={s.codeInput}
            placeholder={t('subscription.redeemPlaceholder')}
            placeholderTextColor={colors.mutedForeground}
            value={redeemCode}
            onChangeText={setRedeemCode}
            autoCapitalize="characters"
            textAlign={isRTL ? 'right' : 'left'}
          />
          <TouchableOpacity
            style={[s.redeemBtn, (!redeemCode.trim() || redeemMutation.isPending) && s.btnDisabled]}
            onPress={() => {
              if (requireAccount()) return;
              redeemMutation.mutate({ data: { code: redeemCode.trim() } });
            }}
            disabled={!redeemCode.trim() || redeemMutation.isPending}
          >
            {redeemMutation.isPending
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={s.redeemBtnText}>{t('subscription.redeem')}</Text>}
          </TouchableOpacity>
        </View>
      </View>

      {/* Plans */}
      <View style={s.section}>
        <Text style={[s.sectionTitle, align]}>{`💎 ${t('subscription.plansTitle')}`}</Text>
        {plansQuery.isLoading ? <ActivityIndicator color={colors.primary} /> : plansQuery.isError ? (
          <ErrorState onRetry={() => plansQuery.refetch()} />
        ) : (
          plans.filter((p) => p.priceMru > 0).map((plan) => (
            <View key={plan.id} style={s.planCard}>
              <Text style={[s.planName, align]}>{planName(plan)}</Text>
              <Text style={[s.planPrice, align]}>{t('subscription.perDays', { price: plan.priceMru, days: plan.durationDays })}</Text>
              {plan.features.length > 0 && (
                <View style={s.featureList}>
                  {plan.features.map((feature, idx) => (
                    <View key={idx} style={[s.featureRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                      <Feather name="check" size={14} color={colors.success} />
                      <Text style={[s.featureText, align]}>{feature}</Text>
                    </View>
                  ))}
                </View>
              )}
              <TouchableOpacity
                style={s.buyBtn}
                onPress={() => {
                  if (requireAccount()) return;
                  setSelectedPlan(plan);
                  setShowPayment(true);
                }}
              >
                <Text style={s.buyBtnText}>{t('subscription.subscribeNow', { price: plan.priceMru })}</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>

      {/* Payment modal */}
      <Modal visible={showPayment} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowPayment(false)}>
        <View style={s.modal}>
          <View style={s.modalHeader}>
            <TouchableOpacity onPress={() => setShowPayment(false)}>
              <Text style={s.cancelText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            <Text style={s.modalTitle}>{t('subscription.paymentDetails')}</Text>
            <View style={{ width: 60 }} />
          </View>
          <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
            <Text style={[s.payInfo, align]}>{`${t('subscription.plan')}: `}<Text style={{ fontWeight: '700', color: colors.primary }}>{planName(selectedPlan)}</Text></Text>
            <Text style={[s.payInfo, align]}>{`${t('subscription.amount')}: `}<Text style={{ fontWeight: '700', color: colors.primary }}>{`${selectedPlan?.priceMru ?? 0} ${t('subscription.currency')}`}</Text></Text>

            <Text style={[s.payLabel, align]}>{t('subscription.payMethod')}</Text>
            <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', flexWrap: 'wrap', gap: 8 }}>
              {PAYMENT_METHODS.map((m) => (
                <TouchableOpacity key={m.id} style={[s.methodBtn, payMethod === m.id && s.methodBtnActive]} onPress={() => setPayMethod(m.id)}>
                  <Text style={s.methodIcon}>{m.icon}</Text>
                  <Text style={[s.methodLabel, payMethod === m.id && s.methodLabelActive]}>{methodLabel(m)}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[s.payLabel, align]}>{t('subscription.yourPhone')}</Text>
            <TextInput
              style={s.payInput}
              placeholder="+222 XXXX XXXX"
              placeholderTextColor={colors.mutedForeground}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              textAlign={isRTL ? 'right' : 'left'}
            />

            <Text style={[s.payLabel, align]}>{t('subscription.transactionRef')}</Text>
            <TextInput
              style={s.payInput}
              placeholder="TX-XXXXXX"
              placeholderTextColor={colors.mutedForeground}
              value={transactionRef}
              onChangeText={setTransactionRef}
              autoCapitalize="characters"
              textAlign={isRTL ? 'right' : 'left'}
            />

            <View style={s.instructBox}>
              <Text style={[s.instructTitle, align]}>{`📋 ${t('subscription.payInstructions')}`}</Text>
              <Text style={[s.instructText, align]}>{t('subscription.payStep1', { amount: selectedPlan?.priceMru ?? 0, method: methodLabel(PAYMENT_METHODS.find((m) => m.id === payMethod) ?? {}) })}</Text>
              <Text style={[s.instructText, align]}>{t('subscription.payStep2')}</Text>
              <Text style={[s.instructText, align]}>{t('subscription.payStep3')}</Text>
            </View>

            <TouchableOpacity
              style={[s.submitBtn, (!phone.trim() || paymentMutation.isPending) && s.btnDisabled]}
              onPress={submitPayment}
              disabled={!phone.trim() || paymentMutation.isPending}
            >
              {paymentMutation.isPending
                ? <ActivityIndicator color="#fff" />
                : <Text style={s.submitBtnText}>{t('subscription.submitProof')}</Text>}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    currentSub: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.success + '12', margin: 16, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: colors.success + '30' },
    currentPlan: { fontSize: 18, fontWeight: '700', color: colors.success },
    currentDays: { fontSize: 13, color: colors.mutedForeground },
    freeBanner: { backgroundColor: colors.primary + '12', margin: 16, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: colors.primary + '30' },
    freeBannerTitle: { fontSize: 18, fontWeight: '700', color: colors.primary },
    freeBannerSub: { fontSize: 13, color: colors.mutedForeground, marginTop: 4 },
    section: { marginHorizontal: 16, marginBottom: 20 },
    sectionTitle: { fontSize: 17, fontWeight: '700', color: colors.foreground, marginBottom: 12 },
    redeemRow: { flexDirection: 'row', gap: 8 },
    codeInput: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 14, borderCurve: 'continuous', paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: colors.foreground, backgroundColor: colors.card, letterSpacing: 2 },
    redeemBtn: { backgroundColor: colors.primary, borderRadius: 14, borderCurve: 'continuous', paddingHorizontal: 16, justifyContent: 'center' },
    redeemBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
    planCard: { backgroundColor: colors.card, borderRadius: 16, borderCurve: 'continuous', padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
    planName: { fontSize: 20, fontWeight: '700', color: colors.primary },
    planPrice: { fontSize: 15, color: colors.foreground, fontWeight: '600', marginTop: 4 },
    featureList: { marginVertical: 8, gap: 6 },
    featureRow: { alignItems: 'center', gap: 8 },
    featureText: { flex: 1, fontSize: 13, color: colors.mutedForeground },
    buyBtn: { backgroundColor: colors.primary, borderRadius: 14, borderCurve: 'continuous', paddingVertical: 12, alignItems: 'center', marginTop: 4 },
    buyBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
    btnDisabled: { opacity: 0.5 },
    modal: { flex: 1, backgroundColor: colors.background },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
    cancelText: { fontSize: 16, color: colors.mutedForeground },
    modalTitle: { fontSize: 17, fontWeight: '700', color: colors.foreground },
    payInfo: { fontSize: 15, color: colors.foreground },
    payLabel: { fontSize: 14, fontWeight: '600', color: colors.foreground },
    methodBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card },
    methodBtnActive: { borderColor: colors.primary, backgroundColor: colors.primary + '10' },
    methodIcon: { fontSize: 18 },
    methodLabel: { fontSize: 14, fontWeight: '600', color: colors.mutedForeground },
    methodLabelActive: { color: colors.primary },
    payInput: { borderWidth: 1, borderColor: colors.border, borderRadius: 14, borderCurve: 'continuous', paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: colors.foreground, backgroundColor: colors.card },
    instructBox: { backgroundColor: colors.muted, borderRadius: 12, padding: 14, gap: 6 },
    instructTitle: { fontSize: 14, fontWeight: '700', color: colors.foreground },
    instructText: { fontSize: 13, color: colors.mutedForeground, lineHeight: 20 },
    submitBtn: { backgroundColor: colors.primary, borderRadius: 14, borderCurve: 'continuous', paddingVertical: 16, alignItems: 'center' },
    submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  });
