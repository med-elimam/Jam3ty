import { useState, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import AdminLayout from '@/components/AdminLayout';
import { useAdminI18n } from '@/contexts/AdminI18nContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Spinner } from '@/components/ui/spinner';
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
  getListAdminAssignmentsQueryKey,
  useCreateAdminAssignment,
  useDeleteAdminAssignment,
  useListAdminAssignments,
  useListAdminCourses,
  useUpdateAdminAssignment,
} from '@workspace/api-client-react';
import type { AdminAssignment, CreateAdminAssignmentInput } from '@workspace/api-client-react';

const ALL = '__all__';
const EMPTY_FORM = {
  title: '',
  description: '',
  courseId: '',
  deadline: '',
  attachmentUrl: '',
};

const copy = {
  ar: {
    filterCourse: 'كل المواد',
    attachmentUrl: 'رابط المرفق',
    submissions: 'تسليمات',
    empty: 'لا توجد واجبات مطابقة للبحث الحالي.',
    formDescription: 'أنشئ واجبًا مرتبطًا بمادة حقيقية. الحقول المعروضة هنا موجودة في قاعدة البيانات فقط.',
    required: 'العنوان والمادة وتاريخ الاستحقاق مطلوبة.',
    saved: 'تم حفظ الواجب.',
    deleted: 'تم حذف الواجب.',
    loadError: 'تعذر تحميل الواجبات.',
    retry: 'إعادة المحاولة',
    saveError: 'تعذر حفظ الواجب.',
    deleteError: 'تعذر حذف الواجب. إذا كان له تسليمات، يجب إبقاؤه محفوظًا.',
    deleteConfirm: 'سيتم حذف هذا الواجب فقط إذا لم تكن له تسليمات.',
  },
  fr: {
    filterCourse: 'Tous les cours',
    attachmentUrl: 'URL de pièce jointe',
    submissions: 'remises',
    empty: 'Aucun devoir ne correspond à la recherche actuelle.',
    formDescription: 'Créez un devoir lié à un vrai cours. Seuls les champs existants en base sont affichés.',
    required: 'Le titre, le cours et la date limite sont obligatoires.',
    saved: 'Devoir enregistré.',
    deleted: 'Devoir supprimé.',
    loadError: 'Impossible de charger les devoirs.',
    retry: 'Réessayer',
    saveError: 'Impossible d’enregistrer le devoir.',
    deleteError: 'Impossible de supprimer le devoir. S’il a des remises, il doit rester conservé.',
    deleteConfirm: 'Ce devoir sera supprimé uniquement s’il n’a aucune remise.',
  },
} as const;

function localDateTime(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function errorMessage(err: unknown, fallback: string) {
  return (err as { data?: { error?: { message?: string } } })?.data?.error?.message ?? fallback;
}

export default function AdminAssignments() {
  const { t, lang } = useAdminI18n();
  const c = copy[lang];
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [courseFilter, setCourseFilter] = useState(ALL);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AdminAssignment | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<AdminAssignment | null>(null);

  const params = {
    courseId: courseFilter === ALL ? undefined : courseFilter,
    search: search.trim() || undefined,
  };
  const assignmentsQuery = useListAdminAssignments(params);
  const coursesQuery = useListAdminCourses();
  const assignments = assignmentsQuery.data?.data ?? [];
  const courses = coursesQuery.data?.data ?? [];

  const createMutation = useCreateAdminAssignment();
  const updateMutation = useUpdateAdminAssignment();
  const deleteMutation = useDeleteAdminAssignment();
  const saving = createMutation.isPending || updateMutation.isPending;
  const invalidate = () => queryClient.invalidateQueries({ queryKey: getListAdminAssignmentsQueryKey(params) });

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEdit(item: AdminAssignment) {
    setEditing(item);
    setForm({
      title: item.title,
      description: item.description ?? '',
      courseId: item.courseId,
      deadline: localDateTime(item.deadline),
      attachmentUrl: item.attachmentUrl ?? '',
    });
    setDialogOpen(true);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!form.title.trim() || !form.courseId || !form.deadline) {
      toast.error(c.required);
      return;
    }
    const payload: CreateAdminAssignmentInput = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      courseId: form.courseId,
      deadline: new Date(form.deadline).toISOString(),
      attachmentUrl: form.attachmentUrl.trim() || null,
    };
    const onSuccess = () => {
      toast.success(c.saved);
      setDialogOpen(false);
      invalidate();
    };
    const onError = (err: unknown) => toast.error(errorMessage(err, c.saveError));
    if (editing) {
      updateMutation.mutate({ assignmentId: editing.id, data: payload }, { onSuccess, onError });
    } else {
      createMutation.mutate({ data: payload }, { onSuccess, onError });
    }
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    deleteMutation.mutate(
      { assignmentId: deleteTarget.id },
      {
        onSuccess: () => {
          toast.success(c.deleted);
          setDeleteTarget(null);
          invalidate();
        },
        onError: (err) => {
          toast.error(errorMessage(err, c.deleteError));
          setDeleteTarget(null);
        },
      },
    );
  }

  return (
    <AdminLayout>
      <div className="mx-auto max-w-7xl p-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-3xl font-bold text-foreground">{t('assignments.title')}</h1>
          <Button onClick={openCreate}>{t('assignments.create')}</Button>
        </div>

        <Card className="mb-6 p-4">
          <div className="grid gap-3 md:grid-cols-[1fr_260px]">
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t('common.search')} />
            <Select value={courseFilter} onValueChange={setCourseFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{c.filterCourse}</SelectItem>
                {courses.map((course) => <SelectItem key={course.id} value={course.id}>{course.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </Card>

        {assignmentsQuery.isLoading ? (
          <div className="flex items-center justify-center py-20"><Spinner /></div>
        ) : assignmentsQuery.isError ? (
          <Card className="p-12 text-center">
            <p className="mb-4 text-destructive">{c.loadError}</p>
            <Button variant="outline" onClick={() => assignmentsQuery.refetch()}>{c.retry}</Button>
          </Card>
        ) : assignments.length > 0 ? (
          <div className="space-y-3">
            {assignments.map((item) => (
              <Card key={item.id} className="p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-foreground">{item.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {[item.courseName, new Date(item.deadline).toLocaleString(lang), `${item.submissionCount} ${c.submissions}`].join(' · ')}
                    </p>
                    {item.description ? <p className="mt-2 line-clamp-2 text-sm text-foreground">{item.description}</p> : null}
                  </div>
                  <div className="flex flex-wrap gap-2 lg:shrink-0">
                    <Button variant="outline" size="sm" onClick={() => openEdit(item)}>{t('common.edit')}</Button>
                    <Button variant="outline" size="sm" className="text-destructive" onClick={() => setDeleteTarget(item)}>{t('common.delete')}</Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-12 text-center"><p className="text-muted-foreground">{c.empty}</p></Card>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>{editing ? t('assignments.edit') : t('assignments.create')}</DialogTitle>
              <DialogDescription>{c.formDescription}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="assignment-title">{t('assignments.fieldTitle')}</Label>
                <Input id="assignment-title" value={form.title} onChange={(event) => setForm((f) => ({ ...f, title: event.target.value }))} disabled={saving} />
              </div>
              <div>
                <Label>{t('assignments.course')}</Label>
                <Select value={form.courseId} onValueChange={(value) => setForm((f) => ({ ...f, courseId: value }))} disabled={saving}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {courses.map((course) => <SelectItem key={course.id} value={course.id}>{course.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="assignment-deadline">{t('assignments.dueDate')}</Label>
                <Input id="assignment-deadline" type="datetime-local" value={form.deadline} onChange={(event) => setForm((f) => ({ ...f, deadline: event.target.value }))} disabled={saving} dir="ltr" />
              </div>
              <div>
                <Label htmlFor="assignment-url">{c.attachmentUrl}</Label>
                <Input id="assignment-url" value={form.attachmentUrl} onChange={(event) => setForm((f) => ({ ...f, attachmentUrl: event.target.value }))} disabled={saving} dir="ltr" />
              </div>
              <div>
                <Label htmlFor="assignment-description">{t('assignments.description')}</Label>
                <Textarea id="assignment-description" value={form.description} onChange={(event) => setForm((f) => ({ ...f, description: event.target.value }))} disabled={saving} />
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
            <AlertDialogTitle>{t('common.delete')}</AlertDialogTitle>
            <AlertDialogDescription>{deleteTarget?.title} — {c.deleteConfirm}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={(event) => { event.preventDefault(); confirmDelete(); }} disabled={deleteMutation.isPending} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
