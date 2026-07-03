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
import { useQueryClient } from '@tanstack/react-query';
import { getListPostsQueryKey } from '@workspace/api-client-react';
import { Feather } from '@expo/vector-icons';

function timeAgo(date: string) {
  const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (diff < 60) return 'الآن';
  if (diff < 3600) return `${Math.floor(diff / 60)}د`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}س`;
  return `${Math.floor(diff / 86400)}ي`;
}

function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const colors = useColors();
  const initials = name?.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase() ?? '?';
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.navy + '30', alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: size * 0.35, fontWeight: '700', color: colors.navy }}>{initials}</Text>
    </View>
  );
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
    mutation: {
      onSuccess: () => qc.invalidateQueries({ queryKey: getListPostsQueryKey() }),
    },
  });

  const s = styles(colors);

  return (
    <View style={s.root}>
      <FlatList
        data={posts}
        keyExtractor={(item: any) => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
        ListHeaderComponent={
          <TouchableOpacity style={s.createRow} onPress={() => setShowCreate(true)}>
            <Avatar name={user?.fullName ?? 'U'} size={36} />
            <View style={s.createPlaceholder}>
              <Text style={s.createPlaceholderText}>شاركنا أفكارك…</Text>
            </View>
          </TouchableOpacity>
        }
        ListEmptyComponent={
          !isLoading ? (
            <View style={s.empty}>
              <Feather name="users" size={48} color={colors.border} />
              <Text style={s.emptyText}>لا توجد منشورات بعد. كن أول من يشارك.</Text>
            </View>
          ) : null
        }
        renderItem={({ item }: { item: any }) => (
          <View style={s.postCard}>
            <View style={s.postHeader}>
              <Avatar name={item.authorName} size={38} />
              <View style={s.postMeta}>
                <Text style={s.authorName}>{item.authorName}</Text>
                <Text style={s.postTime}>{timeAgo(item.createdAt)}</Text>
              </View>
              {item.isPinned && <Feather name="bookmark" size={16} color={colors.gold} />}
            </View>
            <Text style={s.postContent}>{item.content}</Text>
            <View style={s.postActions}>
              <TouchableOpacity
                style={s.actionBtn}
                onPress={() => reactPost.mutate({ postId: item.id, data: { reaction: 'like' } })}
              >
                <Feather name="heart" size={16} color={item.userReaction === 'like' ? colors.destructive : colors.mutedForeground} />
                <Text style={s.actionText}>{item.reactionCount ?? 0}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.actionBtn}>
                <Feather name="message-circle" size={16} color={colors.mutedForeground} />
                <Text style={s.actionText}>{item.commentCount ?? 0}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.actionBtn}>
                <Feather name="share-2" size={16} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      {/* Create post modal */}
      <Modal visible={showCreate} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowCreate(false)}>
        <View style={s.modal}>
          <View style={s.modalHeader}>
            <TouchableOpacity onPress={() => setShowCreate(false)}>
              <Text style={s.cancelText}>إلغاء</Text>
            </TouchableOpacity>
            <Text style={s.modalTitle}>منشور جديد</Text>
            <TouchableOpacity
              onPress={() => { if (newPost.trim()) createPost.mutate({ data: { content: newPost.trim() } }); }}
              disabled={!newPost.trim() || createPost.isPending}
            >
              {createPost.isPending
                ? <ActivityIndicator size="small" color={colors.navy} />
                : <Text style={s.postBtn}>نشر</Text>}
            </TouchableOpacity>
          </View>
          <View style={s.modalBody}>
            <Avatar name={user?.fullName ?? 'U'} size={44} />
            <TextInput
              style={s.postInput}
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

const styles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    createRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.card, borderRadius: 12, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
    createPlaceholder: { flex: 1, backgroundColor: colors.secondary, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10 },
    createPlaceholderText: { color: colors.mutedForeground, fontSize: 14, textAlign: 'right' },
    postCard: { backgroundColor: colors.card, borderRadius: 12, padding: 14, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
    postHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
    postMeta: { flex: 1 },
    authorName: { fontSize: 14, fontWeight: '700', color: colors.foreground },
    postTime: { fontSize: 12, color: colors.mutedForeground },
    postContent: { fontSize: 15, color: colors.foreground, lineHeight: 22, marginBottom: 12, textAlign: 'right' },
    postActions: { flexDirection: 'row', gap: 16, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10 },
    actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    actionText: { fontSize: 13, color: colors.mutedForeground },
    empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
    emptyText: { fontSize: 15, color: colors.mutedForeground, textAlign: 'center' },
    modal: { flex: 1, backgroundColor: colors.background },
    modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
    cancelText: { fontSize: 16, color: colors.mutedForeground },
    modalTitle: { fontSize: 17, fontWeight: '700', color: colors.foreground },
    postBtn: { fontSize: 16, fontWeight: '700', color: colors.navy },
    modalBody: { flexDirection: 'row', gap: 12, padding: 16 },
    postInput: { flex: 1, fontSize: 16, color: colors.foreground, lineHeight: 24, minHeight: 120 },
  });
