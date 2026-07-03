import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/contexts/AuthContext';
import { useListPosts, useCreatePost, useReactToPost } from '@workspace/api-client-react';
import { getListPostsQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Feather } from '@expo/vector-icons';
import { Avatar } from '@/components/ui/Avatar';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { spacing, fontSize, fontWeight, radius } from '@/constants/theme';

function timeAgo(date: string) {
  const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (diff < 60) return 'الآن';
  if (diff < 3600) return `${Math.floor(diff / 60)}د`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}س`;
  return `${Math.floor(diff / 86400)}ي`;
}

export default function CommunityScreen() {
  const colors = useColors();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [newPost, setNewPost] = useState('');

  const { data, isLoading, isRefetching, refetch } = useListPosts();
  const posts: any[] = (data as any)?.data ?? [];

  const createPost = useCreatePost({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListPostsQueryKey() });
        setNewPost('');
        setShowCreate(false);
      },
      onError: () => Alert.alert('خطأ', 'تعذّر نشر المنشور.'),
    },
  });

  const reactPost = useReactToPost({
    mutation: { onSuccess: () => qc.invalidateQueries({ queryKey: getListPostsQueryKey() }) },
  });

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <FlatList
        data={posts}
        keyExtractor={(item: any) => item.id}
        contentContainerStyle={s.list}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.navy} />}
        ListHeaderComponent={
          <TouchableOpacity
            style={[s.createRow, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => setShowCreate(true)}
          >
            <Avatar name={user?.fullName ?? 'U'} size={36} />
            <View style={[s.createPlaceholder, { backgroundColor: colors.secondary, borderRadius: radius.full }]}>
              <Text style={[s.createPlaceholderText, { color: colors.mutedForeground }]}>شاركنا أفكارك…</Text>
            </View>
          </TouchableOpacity>
        }
        ListEmptyComponent={
          !isLoading ? (
            <EmptyState
              icon="users"
              title="لا توجد منشورات بعد"
              body="كن أول من يطرح سؤالًا أو يشارك معلومة مع زملائك."
              actionLabel="إنشاء منشور"
              onAction={() => setShowCreate(true)}
            />
          ) : null
        }
        renderItem={({ item }: { item: any }) => (
          <Card style={s.postCard}>
            <View style={s.postHeader}>
              <Avatar name={item.authorName} size={38} />
              <View style={s.postMeta}>
                <Text style={[s.authorName, { color: colors.foreground }]}>{item.authorName}</Text>
                <Text style={[s.postTime, { color: colors.mutedForeground }]}>{timeAgo(item.createdAt)}</Text>
              </View>
              {item.isPinned && <Feather name="bookmark" size={16} color={colors.gold} />}
            </View>
            <Text style={[s.postContent, { color: colors.foreground }]}>{item.content}</Text>
            <View style={[s.postActions, { borderTopColor: colors.border }]}>
              <TouchableOpacity
                style={s.actionBtn}
                onPress={() => reactPost.mutate({ postId: item.id, data: { reaction: 'like' } })}
              >
                <Feather name="heart" size={16} color={item.userReaction === 'like' ? colors.destructive : colors.mutedForeground} />
                <Text style={[s.actionText, { color: colors.mutedForeground }]}>{item.reactionCount ?? 0}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.actionBtn}>
                <Feather name="message-circle" size={16} color={colors.mutedForeground} />
                <Text style={[s.actionText, { color: colors.mutedForeground }]}>{item.commentCount ?? 0}</Text>
              </TouchableOpacity>
            </View>
          </Card>
        )}
      />

      {/* Create modal */}
      <Modal visible={showCreate} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowCreate(false)}>
        <View style={[s.modal, { backgroundColor: colors.background }]}>
          <View style={[s.modalHeader, { borderBottomColor: colors.border }]}>
            <Button label="إلغاء" variant="ghost" size="sm" fullWidth={false} onPress={() => setShowCreate(false)} />
            <Text style={[s.modalTitle, { color: colors.foreground }]}>منشور جديد</Text>
            <Button
              label="نشر"
              variant="primary"
              size="sm"
              fullWidth={false}
              loading={createPost.isPending}
              disabled={!newPost.trim()}
              onPress={() => { if (newPost.trim()) createPost.mutate({ data: { content: newPost.trim() } }); }}
            />
          </View>
          <View style={s.modalBody}>
            <Avatar name={user?.fullName ?? 'U'} size={44} />
            <TextInput
              style={[s.postInput, { color: colors.foreground }]}
              multiline
              autoFocus
              placeholder="شارك شيئاً مع زملائك الطلاب…"
              placeholderTextColor={colors.mutedForeground}
              value={newPost}
              onChangeText={setNewPost}
              textAlignVertical="top"
              textAlign="right"
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  list: { padding: spacing.base, paddingBottom: 100, gap: spacing.sm },
  createRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, marginBottom: spacing.xs,
  },
  createPlaceholder: { flex: 1, paddingHorizontal: spacing.base, paddingVertical: spacing.sm },
  createPlaceholderText: { fontSize: fontSize.md, textAlign: 'right' },
  postCard: { gap: spacing.sm },
  postHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  postMeta: { flex: 1 },
  authorName: { fontSize: fontSize.base, fontWeight: fontWeight.bold },
  postTime: { fontSize: fontSize.xs },
  postContent: { fontSize: fontSize.md, lineHeight: fontSize.md * 1.6, textAlign: 'right' },
  postActions: { flexDirection: 'row', gap: spacing.base, borderTopWidth: 1, paddingTop: spacing.sm },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionText: { fontSize: fontSize.sm },
  modal: { flex: 1 },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: spacing.base, borderBottomWidth: 1,
  },
  modalTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold },
  modalBody: { flexDirection: 'row', gap: spacing.md, padding: spacing.base },
  postInput: { flex: 1, fontSize: fontSize.lg, lineHeight: fontSize.lg * 1.5, minHeight: 120 },
});
