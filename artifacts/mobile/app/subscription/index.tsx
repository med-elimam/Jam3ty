import React, { useState } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useListPlans, useGetMySubscription, useRedeemActivationCode, useSubmitPaymentProof } from '@workspace/api-client-react';
import { getGetMySubscriptionQueryKey, getListPlansQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { usePreferences } from '@/contexts/PreferencesContext';
import { Feather } from '@expo/vector-icons';

const PAYMENT_METHODS: { id: string; label?: string; labelKey?: string; icon: string }[] = [
  { id: 'bankily', label: 'Bankily', icon: '🏦' },
  { id: 'masrvi', label: 'Masrvi', icon: '📱' },
  { id: 'sedad', label: 'Sedad', icon: '💳' },
  { id: 'cash_agent', labelKey: 'subscription.cashAgent', icon: '💵' },
];

export default function SubscriptionScreen() {
  const colors = useColors();
  const { t, isRTL, language } = usePreferences();
  const qc = useQueryClient();
  const [redeemCode, setRedeemCode] = useState('');
  const [showPayment, setShowPayment] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [payMethod, setPayMethod] = useState('bankily');
  const [phone, setPhone] = useState('');

  const plansQuery = useListPlans();
  const subQuery = useGetMySubscription();
  const plans: any[] = (plansQuery.data as any)?.data ?? [];
  const sub = (subQuery.data as any)?.data;

  const redeemMutation = useRedeemActivationCode({
    mutation: {
      onSuccess: (data: any) => {
        qc.invalidateQueries({ queryKey: getGetMySubscriptionQueryKey() });
        Alert.alert(t('subscription.activatedTitle'), t('subscription.activatedBody', { plan: data?.data?.planName, days: data?.data?.daysRemaining }));
        setRedeemCode('');
      },
      onError: (err: any) => Alert.alert(t('common.error'), err?.data?.error?.message ?? t('subscription.invalidCode')),
    },
  });

  const paymentMutation = useSubmitPaymentProof({
    mutation: {
      onSuccess: () => {
        setShowPayment(false);
        Alert.alert(t('subscription.paymentSentTitle'), t('subscription.paymentSentBody'));
      },
      onError: () => Alert.alert(t('common.error'), t('subscription.paymentError')),
    },
  });

  const s = styles(colors);

  const methodLabel = (m: { label?: string; labelKey?: string }) => m.labelKey ? t(m.labelKey) : (m.label ?? '');
  const planName = (plan: any) => language === 'fr' ? (plan?.nameFr || plan?.name) : (plan?.nameAr || plan?.name);

  return (
    <ScrollView style={s.root} contentContainerStyle={{ paddingBottom: 100 }}>
      {/* Current subscription */}
      {sub ? (
        <View style={s.currentSub}>
          <Feather name="check-circle" size={28} color={colors.success} />
          <View>
            <Text style={s.currentPlan}>{sub.planName}</Text>
            <Text style={s.currentDays}>{t('subscription.daysRemaining', { n: sub.daysRemaining })}</Text>
          </View>
        </View>
      ) : (
        <View style={s.freeBanner}>
          <Text style={s.freeBannerTitle}>{t('subscription.freePlan')}</Text>
          <Text style={s.freeBannerSub}>{t('subscription.freeUpgrade')}</Text>
        </View>
      )}

      {/* Redeem code */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>{`🎟 ${t('subscription.redeemTitle')}`}</Text>
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
            onPress={() => redeemMutation.mutate({ data: { code: redeemCode.trim() } })}
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
        <Text style={s.sectionTitle}>{`💎 ${t('subscription.plansTitle')}`}</Text>
        {plansQuery.isLoading ? <ActivityIndicator color={colors.navy} /> : (
          plans.filter((p) => p.priceMru > 0).map((plan) => (
            <View key={plan.id} style={[s.planCard, plan.isFeatured && s.planFeatured]}>
              {plan.isFeatured && <View style={s.featuredTag}><Text style={s.featuredTagText}>{t('subscription.featured')}</Text></View>}
              <Text style={s.planName}>{planName(plan)}</Text>
              <Text style={s.planPrice}>{t('subscription.perDays', { price: plan.priceMru, days: plan.durationDays })}</Text>
              <Text style={s.planDesc}>{plan.descriptionAr || plan.description}</Text>
              <TouchableOpacity style={s.buyBtn} onPress={() => { setSelectedPlan(plan); setShowPayment(true); }}>
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
            <Text style={s.payInfo}>{`${t('subscription.plan')}: `}<Text style={{ fontWeight: '700', color: colors.navy }}>{planName(selectedPlan)}</Text></Text>
            <Text style={s.payInfo}>{`${t('subscription.amount')}: `}<Text style={{ fontWeight: '700', color: colors.navy }}>{`${selectedPlan?.priceMru} ${t('subscription.currency')}`}</Text></Text>

            <Text style={s.payLabel}>{t('subscription.payMethod')}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {PAYMENT_METHODS.map((m) => (
                <TouchableOpacity key={m.id} style={[s.methodBtn, payMethod === m.id && s.methodBtnActive]} onPress={() => setPayMethod(m.id)}>
                  <Text style={s.methodIcon}>{m.icon}</Text>
                  <Text style={[s.methodLabel, payMethod === m.id && s.methodLabelActive]}>{methodLabel(m)}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={s.payLabel}>{t('subscription.yourPhone')}</Text>
            <TextInput
              style={s.payInput}
              placeholder="+222 XXXX XXXX"
              placeholderTextColor={colors.mutedForeground}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              textAlign={isRTL ? 'right' : 'left'}
            />

            <View style={s.instructBox}>
              <Text style={s.instructTitle}>{`📋 ${t('subscription.payInstructions')}`}</Text>
              <Text style={s.instructText}>{t('subscription.payStep1', { amount: selectedPlan?.priceMru, method: methodLabel(PAYMENT_METHODS.find((m) => m.id === payMethod) ?? {}) })}</Text>
              <Text style={s.instructText}>{t('subscription.payStep2')}</Text>
              <Text style={s.instructText}>{t('subscription.payStep3')}</Text>
            </View>

            <TouchableOpacity
              style={[s.submitBtn, (!phone.trim() || paymentMutation.isPending) && s.btnDisabled]}
              onPress={() => paymentMutation.mutate({ data: { planId: selectedPlan?.id, amountMru: selectedPlan?.priceMru, method: payMethod as any, phoneNumber: phone.trim() } })}
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
    currentSub: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.success + '15', margin: 16, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: colors.success + '30' },
    currentPlan: { fontSize: 18, fontWeight: '700', color: colors.success },
    currentDays: { fontSize: 13, color: colors.mutedForeground },
    freeBanner: { backgroundColor: colors.gold + '15', margin: 16, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: colors.gold + '30' },
    freeBannerTitle: { fontSize: 18, fontWeight: '700', color: colors.gold, textAlign: 'right' },
    freeBannerSub: { fontSize: 13, color: colors.mutedForeground, marginTop: 4, textAlign: 'right' },
    section: { marginHorizontal: 16, marginBottom: 20 },
    sectionTitle: { fontSize: 17, fontWeight: '700', color: colors.foreground, marginBottom: 12, textAlign: 'right' },
    redeemRow: { flexDirection: 'row', gap: 8 },
    codeInput: { flex: 1, borderWidth: 1.5, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: colors.foreground, backgroundColor: colors.card, letterSpacing: 2 },
    redeemBtn: { backgroundColor: colors.navy, borderRadius: 10, paddingHorizontal: 16, justifyContent: 'center' },
    redeemBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
    planCard: { backgroundColor: colors.card, borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1.5, borderColor: colors.border },
    planFeatured: { borderColor: colors.gold, backgroundColor: colors.gold + '08' },
    featuredTag: { backgroundColor: colors.gold, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10, alignSelf: 'flex-end', marginBottom: 8 },
    featuredTagText: { fontSize: 11, fontWeight: '700', color: '#fff' },
    planName: { fontSize: 20, fontWeight: '700', color: colors.navy, textAlign: 'right' },
    planPrice: { fontSize: 15, color: colors.foreground, fontWeight: '600', marginTop: 4, textAlign: 'right' },
    planDesc: { fontSize: 13, color: colors.mutedForeground, marginVertical: 8, textAlign: 'right' },
    buyBtn: { backgroundColor: colors.navy, borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 4 },
    buyBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
    btnDisabled: { opacity: 0.5 },
    modal: { flex: 1, backgroundColor: colors.background },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
    cancelText: { fontSize: 16, color: colors.mutedForeground },
    modalTitle: { fontSize: 17, fontWeight: '700', color: colors.foreground },
    payInfo: { fontSize: 15, color: colors.foreground, textAlign: 'right' },
    payLabel: { fontSize: 14, fontWeight: '600', color: colors.foreground, textAlign: 'right' },
    methodBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.card },
    methodBtnActive: { borderColor: colors.navy, backgroundColor: colors.navy + '10' },
    methodIcon: { fontSize: 18 },
    methodLabel: { fontSize: 14, fontWeight: '600', color: colors.mutedForeground },
    methodLabelActive: { color: colors.navy },
    payInput: { borderWidth: 1.5, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: colors.foreground, backgroundColor: colors.card },
    instructBox: { backgroundColor: colors.secondary, borderRadius: 10, padding: 14, gap: 6 },
    instructTitle: { fontSize: 14, fontWeight: '700', color: colors.foreground, textAlign: 'right' },
    instructText: { fontSize: 13, color: colors.mutedForeground, lineHeight: 20, textAlign: 'right' },
    submitBtn: { backgroundColor: colors.navy, borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
    submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  });
