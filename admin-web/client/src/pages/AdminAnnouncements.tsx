import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import AdminLayout from '@/components/AdminLayout';
import { useAdminI18n } from '@/contexts/AdminI18nContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  getListAdminAnnouncementsQueryKey,
  useCreateAdminAnnouncement,
  useDeleteAdminAnnouncement,
  useListAdminAnnouncements,
  useListAdminCourses,
  useListAdminDepartments,
  useListAdminFaculties,
  useListAdminGroups,
  useListAdminLevels,
  useListUniversities,
  useUpdateAdminAnnouncement,
} from '@workspace/api-client-react';
import type { AdminAnnouncement, CreateAdminAnnouncementInput } from '@workspace/api-client-react';

const ALL = '__all__';
const SCOPES = ['global', 'university', 'faculty', 'department', 'level', 'group', 'course'] as const;
const PRIORITIES = ['normal', 'important', 'urgent'] as const;

interface FormState {
  title: string;
  content: string;
  priority: CreateAdminAnnouncementInput['priority'];
  scope: CreateAdminAnnouncementInput['scope'];
  scopeTargetId: string;
  expiresAt: string;
}

const EMPTY_FORM: FormState = {
  title: '',
  content: '',
  priority: 'normal',
  scope: 'global',
  scopeTargetId: '',
  expiresAt: '',
};

function extractErrorMessage(err: unknown, fallback: string): string {
  const data = (err as { data?: { error?: { message?: string } } })?.data;
  return data?.error?.message ?? fallback;
}

function toDateTimeLocal(value?: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 16);
}

export default function AdminAnnouncements() {
  const { t } = useAdminI18n();
  const queryClient = useQueryClient();

  const [scopeFilter, setScopeFilter] = useState(ALL);
  const [priorityFilter, setPriorityFilter] = useState(ALL);
  const [search, setSearch] = useState('');

  const params = {
    scope: scopeFilter === ALL ? undefined : (scopeFilter as CreateAdminAnnouncementInput['scope']),
    priority: priorityFilter === ALL ? undefined : (priorityFilter as CreateAdminAnnouncementInput['priority']),
    search: search.trim() || undefined,
  };

  const announcementsQuery = useListAdminAnnouncements(params);
  const announcements = announcementsQuery.data?.data ?? [];

  const { data: universitiesData } = useListUniversities();
  const facultiesQuery = useListAdminFaculties();
  const departmentsQuery = useListAdminDepartments();
  const levelsQuery = useListAdminLevels();
  const groupsQuery = useListAdminGroups();
  const coursesQuery = useListAdminCourses();

  const createMutation = useCreateAdminAnnouncement();
  const updateMutation = useUpdateAdminAnnouncement();
  const deleteMutation = useDeleteAdminAnnouncement();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AdminAnnouncement | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<AdminAnnouncement | null>(null);
  const saving = createMutation.isPending || updateMutation.isPending;

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getListAdminAnnouncementsQueryKey(params) });

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEdit(announcement: AdminAnnouncement) {
    const target =
      announcement.scope === 'university' ? announcement.universityId :
      announcement.scope === 'faculty' ? announcement.facultyId :
      announcement.scope === 'department' ? announcement.departmentId :
      announcement.scope === 'level' ? announcement.levelId :
      announcement.scope === 'group' ? announcement.groupId :
      announcement.scope === 'course' ? announcement.courseId :
      '';
    setEditing(announcement);
    setForm({
      title: announcement.title,
      content: announcement.content,
      priority: announcement.priority,
      scope: announcement.scope,
      scopeTargetId: target ?? '',
      expiresAt: toDateTimeLocal(announcement.expiresAt),
    });
    setDialogOpen(true);
  }

  function scopedPayload(): Pick<CreateAdminAnnouncementInput, 'universityId' | 'facultyId' | 'departmentId' | 'levelId' | 'groupId' | 'courseId'> {
    return {
      universityId: form.scope === 'university' ? form.scopeTargetId : null,
      facultyId: form.scope === 'faculty' ? form.scopeTargetId : null,
      departmentId: form.scope === 'department' ? form.scopeTargetId : null,
      levelId: form.scope === 'level' ? form.scopeTargetId : null,
      groupId: form.scope === 'group' ? form.scopeTargetId : null,
      courseId: form.scope === 'course' ? form.scopeTargetId : null,
    };
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const title = form.title.trim();
    const content = form.content.trim();
    if (!title || !content) {
      toast.error(t('announcements.required'));
      return;
    }
    if (form.scope !== 'global' && !form.scopeTargetId) {
      toast.error(t('announcements.scopeRequired'));
      return;
    }
    const payload: CreateAdminAnnouncementInput = {
      title,
      content,
      priority: form.priority,
      scope: form.scope,
      ...scopedPayload(),
      expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
    };

    const onSuccess = () => {
      toast.success(t('announcements.saved'));
      setDialogOpen(false);
      invalidate();
    };
    const onError = (err: unknown) => toast.error(extractErrorMessage(err, t('announcements.saveError')));

    if (editing) updateMutation.mutate({ announcementId: editing.id, data: payload }, { onSuccess, onError });
    else createMutation.mutate({ data: payload }, { onSuccess, onError });
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    deleteMutation.mutate(
      { announcementId: deleteTarget.id },
      {
        onSuccess: () => {
          toast.success(t('announcements.deleted'));
          setDeleteTarget(null);
          invalidate();
        },
        onError: (err) => {
          toast.error(extractErrorMessage(err, t('announcements.deleteError')));
          setDeleteTarget(null);
        },
      },
    );
  }

  const scopeOptions =
    form.scope === 'university' ? (universitiesData?.data ?? []) :
    form.scope === 'faculty' ? (facultiesQuery.data?.data ?? []) :
    form.scope === 'department' ? (departmentsQuery.data?.data ?? []) :
    form.scope === 'level' ? (levelsQuery.data?.data ?? []) :
    form.scope === 'group' ? (groupsQuery.data?.data ?? []) :
    form.scope === 'course' ? (coursesQuery.data?.data ?? []) :
    [];

  return (
    <AdminLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <h1 className="text-3xl font-bold text-foreground">{t('announcements.title')}</h1>
          <Button onClick={openCreate}>{t('announcements.create')}</Button>
        </div>

        <Card className="p-4 mb-6">
          <div className="grid gap-3 md:grid-cols-3">
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('common.search')} />
            <Select value={scopeFilter} onValueChange={setScopeFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{t('announcements.allScopes')}</SelectItem>
                {SCOPES.map((scope) => <SelectItem key={scope} value={scope}>{t(`announcements.scopes.${scope}`)}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{t('announcements.allPriorities')}</SelectItem>
                {PRIORITIES.map((priority) => <SelectItem key={priority} value={priority}>{t(`announcements.priorities.${priority}`)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </Card>

        {announcementsQuery.isLoading ? (
          <div className="flex items-center justify-center py-20"><Spinner /></div>
        ) : announcementsQuery.isError ? (
          <Card className="p-12 text-center">
            <p className="text-destructive mb-4">{t('announcements.loadError')}</p>
            <Button variant="outline" onClick={() => announcementsQuery.refetch()}>{t('common.search')}</Button>
          </Card>
        ) : announcements.length > 0 ? (
          <div className="space-y-3">
            {announcements.map((announcement) => (
              <Card key={announcement.id} className="p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-foreground">{announcement.title}</h3>
                      <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                        {t(`announcements.priorities.${announcement.priority}`)}
                      </span>
                      <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                        {t(`announcements.scopes.${announcement.scope}`)}
                      </span>
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{announcement.content}</p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {[announcement.courseName, announcement.createdByName].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  <div className="flex gap-2 lg:shrink-0">
                    <Button variant="outline" size="sm" onClick={() => openEdit(announcement)}>{t('common.edit')}</Button>
                    <Button variant="outline" size="sm" className="text-destructive" onClick={() => setDeleteTarget(announcement)}>
                      {t('common.delete')}
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-12 text-center"><p className="text-muted-foreground">{t('announcements.empty')}</p></Card>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>{editing ? t('announcements.edit') : t('announcements.create')}</DialogTitle>
              <DialogDescription>{t('announcements.formDescription')}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="announcement-title">{t('announcements.fieldTitle')}</Label>
                <Input id="announcement-title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} disabled={saving} />
              </div>
              <div>
                <Label htmlFor="announcement-content">{t('announcements.content')}</Label>
                <Textarea id="announcement-content" rows={5} value={form.content} onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))} disabled={saving} />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>{t('announcements.priority')}</Label>
                  <Select value={form.priority} onValueChange={(v) => setForm((f) => ({ ...f, priority: v as FormState['priority'] }))} disabled={saving}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PRIORITIES.map((priority) => <SelectItem key={priority} value={priority}>{t(`announcements.priorities.${priority}`)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{t('announcements.scope')}</Label>
                  <Select value={form.scope} onValueChange={(v) => setForm((f) => ({ ...f, scope: v as FormState['scope'], scopeTargetId: '' }))} disabled={saving}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SCOPES.map((scope) => <SelectItem key={scope} value={scope}>{t(`announcements.scopes.${scope}`)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {form.scope !== 'global' && (
                <div>
                  <Label>{t('announcements.scopeTarget')}</Label>
                  <Select value={form.scopeTargetId} onValueChange={(v) => setForm((f) => ({ ...f, scopeTargetId: v }))} disabled={saving}>
                    <SelectTrigger><SelectValue placeholder={t('announcements.scopeTarget')} /></SelectTrigger>
                    <SelectContent>
                      {scopeOptions.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div>
                <Label htmlFor="announcement-expiry">{t('announcements.expiresAt')}</Label>
                <Input id="announcement-expiry" type="datetime-local" value={form.expiresAt} onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))} disabled={saving} dir="ltr" />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>{t('common.cancel')}</Button>
              <Button type="submit" disabled={saving}>{saving ? <Spinner className="me-2 h-4 w-4" /> : null}{t('common.save')}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('announcements.delete')}</AlertDialogTitle>
            <AlertDialogDescription>{deleteTarget?.title} — {t('announcements.deleteConfirm')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); confirmDelete(); }} disabled={deleteMutation.isPending} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
