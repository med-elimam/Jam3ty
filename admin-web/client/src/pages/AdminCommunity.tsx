import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import AdminLayout from '@/components/AdminLayout';
import { useAdminI18n } from '@/contexts/AdminI18nContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Spinner } from '@/components/ui/spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  getListAdminCommunityCommentsQueryKey,
  getListAdminCommunityPostsQueryKey,
  getListAdminCommunityReportsQueryKey,
  useDeleteAdminCommunityComment,
  useDeleteAdminCommunityPost,
  useListAdminCommunityComments,
  useListAdminCommunityPosts,
  useListAdminCommunityReports,
  useUpdateAdminCommunityComment,
  useUpdateAdminCommunityPost,
  useUpdateAdminCommunityReport,
} from '@workspace/api-client-react';
import type {
  AdminCommunityComment,
  AdminCommunityPost,
  AdminCommunityPostModerationStatus,
  ListAdminCommunityPostsParams,
} from '@workspace/api-client-react';

const ALL = '__all__';
const POST_STATUSES = ['pending', 'visible', 'hidden', 'removed'] as const;
const REPORT_STATUSES = ['pending', 'reviewed', 'resolved', 'rejected'] as const;

const copy = {
  ar: {
    allStatuses: 'كل الحالات',
    reportedOnly: 'المبلغ عنها فقط',
    allReports: 'كل البلاغات',
    comments: 'التعليقات',
    author: 'الكاتب',
    reports: 'بلاغات',
    reactions: 'تفاعلات',
    pin: 'تثبيت',
    unpin: 'إلغاء التثبيت',
    removed: 'تمت إزالة المنشور بأمان.',
    saved: 'تم حفظ التغيير.',
    deleted: 'تم الحذف.',
    emptyPosts: 'لا توجد منشورات مطابقة.',
    emptyComments: 'لا توجد تعليقات مطابقة.',
    emptyReports: 'لا توجد بلاغات مطابقة.',
    loadError: 'تعذر تحميل بيانات المجتمع.',
    saveError: 'تعذر تنفيذ العملية.',
    reportStatus: 'حالة البلاغ',
    statuses: { pending: 'قيد المراجعة', visible: 'ظاهر', hidden: 'مخفي', removed: 'محذوف' },
    reportStatuses: { pending: 'قيد الانتظار', reviewed: 'تمت المراجعة', resolved: 'محلول', rejected: 'مرفوض' },
  },
  fr: {
    allStatuses: 'Tous les statuts',
    reportedOnly: 'Signalées seulement',
    allReports: 'Tous les signalements',
    comments: 'Commentaires',
    author: 'Auteur',
    reports: 'signalements',
    reactions: 'réactions',
    pin: 'Épingler',
    unpin: 'Désépingler',
    removed: 'Publication retirée en sécurité.',
    saved: 'Changement enregistré.',
    deleted: 'Supprimé.',
    emptyPosts: 'Aucune publication ne correspond.',
    emptyComments: 'Aucun commentaire ne correspond.',
    emptyReports: 'Aucun signalement ne correspond.',
    loadError: 'Impossible de charger la communauté.',
    saveError: 'Impossible d’exécuter l’action.',
    reportStatus: 'Statut du signalement',
    statuses: { pending: 'En revue', visible: 'Visible', hidden: 'Masquée', removed: 'Retirée' },
    reportStatuses: { pending: 'En attente', reviewed: 'Revu', resolved: 'Résolu', rejected: 'Rejeté' },
  },
} as const;

function errorMessage(err: unknown, fallback: string) {
  return (err as { data?: { error?: { message?: string } } })?.data?.error?.message ?? fallback;
}

export default function AdminCommunity() {
  const { t, lang } = useAdminI18n();
  const c = copy[lang];
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState(ALL);
  const [reportedOnly, setReportedOnly] = useState(false);
  const [commentSearch, setCommentSearch] = useState('');
  const [reportStatus, setReportStatus] = useState(ALL);
  const [editingComment, setEditingComment] = useState<AdminCommunityComment | null>(null);
  const [commentContent, setCommentContent] = useState('');

  const postParams: ListAdminCommunityPostsParams = {
    status: status === ALL ? undefined : status as ListAdminCommunityPostsParams['status'],
    search: search.trim() || undefined,
    reported: reportedOnly ? 'true' : undefined,
  };
  const commentParams = { search: commentSearch.trim() || undefined };
  const reportParams = { status: reportStatus === ALL ? undefined : reportStatus };

  const postsQuery = useListAdminCommunityPosts(postParams);
  const commentsQuery = useListAdminCommunityComments(commentParams);
  const reportsQuery = useListAdminCommunityReports(reportParams);
  const posts = postsQuery.data?.data ?? [];
  const comments = commentsQuery.data?.data ?? [];
  const reports = reportsQuery.data?.data ?? [];

  const updatePost = useUpdateAdminCommunityPost();
  const removePost = useDeleteAdminCommunityPost();
  const updateComment = useUpdateAdminCommunityComment();
  const deleteComment = useDeleteAdminCommunityComment();
  const updateReport = useUpdateAdminCommunityReport();

  const invalidatePosts = () => queryClient.invalidateQueries({ queryKey: getListAdminCommunityPostsQueryKey(postParams) });
  const invalidateComments = () => queryClient.invalidateQueries({ queryKey: getListAdminCommunityCommentsQueryKey(commentParams) });
  const invalidateReports = () => queryClient.invalidateQueries({ queryKey: getListAdminCommunityReportsQueryKey(reportParams) });

  function moderatePost(post: AdminCommunityPost, nextStatus: AdminCommunityPostModerationStatus) {
    updatePost.mutate(
      { postId: post.id, data: { moderationStatus: nextStatus } },
      { onSuccess: () => { toast.success(c.saved); invalidatePosts(); }, onError: (err) => toast.error(errorMessage(err, c.saveError)) },
    );
  }

  function togglePin(post: AdminCommunityPost) {
    updatePost.mutate(
      { postId: post.id, data: { isPinned: !post.isPinned } },
      { onSuccess: () => { toast.success(c.saved); invalidatePosts(); }, onError: (err) => toast.error(errorMessage(err, c.saveError)) },
    );
  }

  function saveComment() {
    if (!editingComment || !commentContent.trim()) return;
    updateComment.mutate(
      { commentId: editingComment.id, data: { content: commentContent.trim() } },
      {
        onSuccess: () => {
          toast.success(c.saved);
          setEditingComment(null);
          invalidateComments();
        },
        onError: (err) => toast.error(errorMessage(err, c.saveError)),
      },
    );
  }

  return (
    <AdminLayout>
      <div className="mx-auto max-w-7xl p-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-3xl font-bold text-foreground">{t('community.title')}</h1>
        </div>

        <Tabs defaultValue="posts" className="space-y-4">
          <TabsList>
            <TabsTrigger value="posts">{t('community.posts')}</TabsTrigger>
            <TabsTrigger value="comments">{c.comments}</TabsTrigger>
            <TabsTrigger value="reports">{t('community.reports')}</TabsTrigger>
          </TabsList>

          <TabsContent value="posts" className="space-y-4">
            <Card className="p-4">
              <div className="grid gap-3 md:grid-cols-[1fr_220px_auto]">
                <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t('common.search')} />
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>{c.allStatuses}</SelectItem>
                    {POST_STATUSES.map((item) => <SelectItem key={item} value={item}>{c.statuses[item]}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button variant={reportedOnly ? 'default' : 'outline'} onClick={() => setReportedOnly((value) => !value)}>{c.reportedOnly}</Button>
              </div>
            </Card>

            {postsQuery.isLoading ? <div className="flex justify-center py-20"><Spinner /></div> : postsQuery.isError ? (
              <Card className="p-12 text-center"><p className="text-destructive">{c.loadError}</p></Card>
            ) : posts.length > 0 ? (
              <div className="space-y-3">
                {posts.map((post) => (
                  <Card key={post.id} className="p-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:justify-between">
                      <div className="min-w-0 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-foreground">{post.authorName}</span>
                          <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">{c.statuses[post.moderationStatus]}</span>
                          {post.isPinned ? <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">{c.pin}</span> : null}
                        </div>
                        <p className="text-sm text-foreground">{post.content}</p>
                        <p className="text-xs text-muted-foreground">
                          {post.commentCount} {c.comments} · {post.reactionCount} {c.reactions} · {post.reportCount} {c.reports}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-start gap-2 lg:shrink-0">
                        {POST_STATUSES.filter((item) => item !== post.moderationStatus).map((item) => (
                          <Button key={item} variant="outline" size="sm" onClick={() => moderatePost(post, item)}>{c.statuses[item]}</Button>
                        ))}
                        <Button variant="outline" size="sm" onClick={() => togglePin(post)}>{post.isPinned ? c.unpin : c.pin}</Button>
                        <Button variant="outline" size="sm" className="text-destructive" onClick={() => removePost.mutate({ postId: post.id }, { onSuccess: () => { toast.success(c.removed); invalidatePosts(); }, onError: (err) => toast.error(errorMessage(err, c.saveError)) })}>{t('community.remove')}</Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : <Card className="p-12 text-center"><p className="text-muted-foreground">{c.emptyPosts}</p></Card>}
          </TabsContent>

          <TabsContent value="comments" className="space-y-4">
            <Card className="p-4"><Input value={commentSearch} onChange={(event) => setCommentSearch(event.target.value)} placeholder={t('common.search')} /></Card>
            {commentsQuery.isLoading ? <div className="flex justify-center py-20"><Spinner /></div> : commentsQuery.isError ? (
              <Card className="p-12 text-center"><p className="text-destructive">{c.loadError}</p></Card>
            ) : comments.length > 0 ? (
              <div className="space-y-3">
                {comments.map((comment) => (
                  <Card key={comment.id} className="p-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:justify-between">
                      <div className="min-w-0">
                        <p className="font-medium text-foreground">{comment.authorName}</p>
                        <p className="mt-2 text-sm text-foreground">{comment.content}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{comment.reportCount} {c.reports}</p>
                      </div>
                      <div className="flex gap-2 lg:shrink-0">
                        <Button variant="outline" size="sm" onClick={() => { setEditingComment(comment); setCommentContent(comment.content); }}>{t('common.edit')}</Button>
                        <Button variant="outline" size="sm" className="text-destructive" onClick={() => deleteComment.mutate({ commentId: comment.id }, { onSuccess: () => { toast.success(c.deleted); invalidateComments(); }, onError: (err) => toast.error(errorMessage(err, c.saveError)) })}>{t('common.delete')}</Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : <Card className="p-12 text-center"><p className="text-muted-foreground">{c.emptyComments}</p></Card>}
          </TabsContent>

          <TabsContent value="reports" className="space-y-4">
            <Card className="p-4">
              <Select value={reportStatus} onValueChange={setReportStatus}>
                <SelectTrigger className="max-w-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>{c.allReports}</SelectItem>
                  {REPORT_STATUSES.map((item) => <SelectItem key={item} value={item}>{c.reportStatuses[item]}</SelectItem>)}
                </SelectContent>
              </Select>
            </Card>
            {reportsQuery.isLoading ? <div className="flex justify-center py-20"><Spinner /></div> : reportsQuery.isError ? (
              <Card className="p-12 text-center"><p className="text-destructive">{c.loadError}</p></Card>
            ) : reports.length > 0 ? (
              <div className="space-y-3">
                {reports.map((report) => (
                  <Card key={report.id} className="p-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:justify-between">
                      <div className="min-w-0">
                        <p className="font-medium text-foreground">{report.targetType} · {report.reporterName}</p>
                        <p className="mt-2 text-sm text-foreground">{report.reason}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{c.reportStatus}: {report.status}</p>
                      </div>
                      <div className="flex flex-wrap gap-2 lg:shrink-0">
                        {REPORT_STATUSES.map((item) => (
                          <Button key={item} variant={report.status === item ? 'default' : 'outline'} size="sm" onClick={() => updateReport.mutate({ reportId: report.id, data: { status: item } }, { onSuccess: () => { toast.success(c.saved); invalidateReports(); }, onError: (err) => toast.error(errorMessage(err, c.saveError)) })}>{c.reportStatuses[item]}</Button>
                        ))}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : <Card className="p-12 text-center"><p className="text-muted-foreground">{c.emptyReports}</p></Card>}
          </TabsContent>
        </Tabs>
      </div>

      {editingComment ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <Card className="w-full max-w-lg p-5">
            <h2 className="mb-4 text-xl font-semibold">{t('common.edit')}</h2>
            <Textarea value={commentContent} onChange={(event) => setCommentContent(event.target.value)} />
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditingComment(null)}>{t('common.cancel')}</Button>
              <Button onClick={saveComment} disabled={updateComment.isPending}>{t('common.save')}</Button>
            </div>
          </Card>
        </div>
      ) : null}
    </AdminLayout>
  );
}
