import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useAiChat, useGetAiUsage } from '@workspace/api-client-react';
import { usePreferences } from '@/contexts/PreferencesContext';
import { GuestGate } from '@/components/GuestGate';
import { Feather } from '@expo/vector-icons';

interface Message { id: string; role: 'user' | 'assistant'; content: string; ts: Date; }

export default function AIScreen() {
  return (
    <GuestGate>
      <AIScreenInner />
    </GuestGate>
  );
}

function AIScreenInner() {
  const colors = useColors();
  const { t, isRTL, language } = usePreferences();
  const [messages, setMessages] = useState<Message[]>([
    { id: '0', role: 'assistant', content: t('ai.welcome'), ts: new Date() },
  ]);

  useEffect(() => {
    setMessages((prev) =>
      prev.length === 1 && prev[0].id === '0'
        ? [{ ...prev[0], content: t('ai.welcome') }]
        : prev,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);
  const [input, setInput] = useState('');
  const listRef = useRef<FlatList>(null);

  const { data: usageData } = useGetAiUsage();
  const usage = usageData?.data;

  const chatMutation = useAiChat({
    mutation: {
      onSuccess: (data: any) => {
        const reply = data?.data?.reply ?? t('ai.errorReply');
        setMessages((prev) => [...prev, { id: Date.now().toString(), role: 'assistant', content: reply, ts: new Date() }]);
        setTimeout(() => listRef.current?.scrollToEnd(), 100);
      },
      onError: (err: any) => {
        const msg = err?.data?.error?.message ?? t('ai.connectError');
        setMessages((prev) => [...prev, { id: Date.now().toString(), role: 'assistant', content: msg, ts: new Date() }]);
      },
    },
  });

  const sendMessage = () => {
    if (!input.trim() || chatMutation.isPending) return;
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: input.trim(), ts: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    chatMutation.mutate({ data: { message: input.trim() } });
    setInput('');
    setTimeout(() => listRef.current?.scrollToEnd(), 100);
  };

  const s = styles(colors);

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      {/* Usage indicator */}
      {usage && (
        <View style={s.usageBanner}>
          <Feather name="zap" size={14} color={colors.primary} />
          <Text style={s.usageText}>{t('ai.usage', { used: usage.used, limit: usage.limit, plan: usage.plan })}</Text>
        </View>
      )}

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 20 }}
        onContentSizeChange={() => listRef.current?.scrollToEnd()}
        renderItem={({ item }) => (
          <View style={[s.bubble, item.role === 'user' ? s.bubbleUser : s.bubbleAI]}>
            {item.role === 'assistant' && (
              <View style={s.aiAvatar}><Text style={{ fontSize: 14 }}>🤖</Text></View>
            )}
            <View style={[s.bubbleContent, item.role === 'user' ? s.contentUser : s.contentAI]}>
              <Text style={[s.bubbleText, item.role === 'user' && s.bubbleTextUser]}>{item.content}</Text>
            </View>
          </View>
        )}
      />

      {chatMutation.isPending && (
        <View style={s.thinking}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={s.thinkingText}>{t('ai.thinking')}</Text>
        </View>
      )}

      <View style={s.inputRow}>
        <TextInput
          style={s.input}
          value={input}
          onChangeText={setInput}
          placeholder={t('ai.inputPlaceholder')}
          placeholderTextColor={colors.mutedForeground}
          textAlign={isRTL ? 'right' : 'left'}
          multiline
          maxLength={500}
          onSubmitEditing={sendMessage}
        />
        <TouchableOpacity
          style={[s.sendBtn, (!input.trim() || chatMutation.isPending) && s.sendBtnDisabled]}
          onPress={sendMessage}
          disabled={!input.trim() || chatMutation.isPending}
        >
          <Feather name="send" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    usageBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primary + '12', paddingHorizontal: 16, paddingVertical: 8 },
    usageText: { fontSize: 12, color: colors.primary, fontWeight: '500' },
    bubble: { flexDirection: 'row', gap: 8, alignItems: 'flex-end' },
    bubbleUser: { justifyContent: 'flex-end' },
    bubbleAI: { justifyContent: 'flex-start' },
    aiAvatar: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.primary + '12', alignItems: 'center', justifyContent: 'center' },
    bubbleContent: { maxWidth: '80%', borderRadius: 16, padding: 12 },
    contentUser: { backgroundColor: colors.primary, borderBottomRightRadius: 4 },
    contentAI: { backgroundColor: colors.card, borderBottomLeftRadius: 4, shadowColor: '#0F172A', shadowOpacity: 0.04, shadowRadius: 8, elevation: 1, borderWidth: 1, borderColor: colors.border },
    bubbleText: { fontSize: 15, color: colors.foreground, lineHeight: 22 },
    bubbleTextUser: { color: '#fff' },
    thinking: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingBottom: 8 },
    thinkingText: { fontSize: 13, color: colors.mutedForeground },
    inputRow: { flexDirection: 'row', gap: 8, padding: 12, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.background },
    input: { flex: 1, backgroundColor: colors.card, borderRadius: 14, borderCurve: 'continuous', paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, color: colors.foreground, maxHeight: 100, borderWidth: 1, borderColor: colors.border },
    sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
    sendBtnDisabled: { opacity: 0.4 },
  });
