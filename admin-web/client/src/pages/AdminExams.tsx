import { useState, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import AdminLayout from '@/components/AdminLayout';
import { useAdminI18n } from '@/contexts/AdminI18nContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  getListAdminExamsQueryKey,
  useCreateAdminExam,
  useDeleteAdminExam,
  useListAdminCourses,
  useListAdminExams,
  useUpdateAdminExam,
} from '@workspace/api-client-react';
import type { AdminExam, CreateAdminExamInput, ListAdminExamsParams } from '@workspace/api-client-react';

const ALL = '__all__';
const EXAM_TYPES = ['midterm', 'final', 'makeup', 'test', 'other'] as const;

const EMPTY_FORM = {
  title: '',
  courseId: '',
  date: '',
  startTime: '',
  room: '',
  type: 'midterm',
};

const copy = {
  ar: {
    allCourses: 'كل المواد',
    allTypes: 'كل الانواع',
    room: 'القاعة',
    empty: 'لا توجد امتحانات مطابقة.',
    formDescription: 'انشئ امتحانا مرتبطا بمادة حقيقية. الحقول هنا هي الحقول الموجودة في قاعدة البيانات فقط.',
    required: 'العنوان والمادة والتاريخ مطلوبة.',
    saved: 'تم حفظ الامتحان.',
    deleted: 'تم حذف الامتحان.',
    loadError: 'تعذر تحميل الامتحانات.',
    saveError: 'تعذر حفظ الامتحان.',
    deleteError: 'تعذر حذف الامتحان.',
    deleteConfirm: 'سيتم حذف هذا الامتحان من جدول الامتحانات.',
    types: { midterm: 'نصفي', final: 'نهائي', makeup: 'تعويضي', test: 'اختبار', other: 'اخرى' },
  },
  fr: {
    allCourses: 'Tous les cours',
    allTypes: 'Tous les types',
    room: 'Salle',
    empty: 'Aucun examen ne correspond.',
    formDescription: 'Creez un examen lie a un vrai cours. Seuls les champs presents en base sont affiches.',
    required: 'Le titre, le cours et la date sont obligatoires.',
    saved: 'Examen enregistre.',
    deleted: 'Examen supprime.',
    loadError: 'Impossible de charger les examens.',
    saveError: 'Impossible d enregistrer l examen.',
    deleteError: 'Impossible de supprimer l examen.',
    deleteConfirm: 'Cet examen sera supprime de la table des examens.',
    types: { midterm: 'Partiel', final: 'Final', makeup: 'Rattrapage', test: 'Test', other: 'Autre' },
  },
} as const;

function errorMessage(err: unknown, fallback: string) {
  return (err as { data?: { error?: { message?: string } } })?.data?.error?.message ?? fallback;
}

export default function AdminExams() {
  const { t, lang } = useAdminI18n();
  const c = copy[lang];
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [courseFilter, setCourseFilter] = useState(ALL);
  const [typeFilter, setTypeFilter] = useState(ALL);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AdminExam | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminExam | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const params: ListAdminExamsParams = {
    courseId: courseFilter === ALL ? undefined : courseFilter,
    type: typeFilter === ALL ? undefined : typeFilter as ListAdminExamsParams['type'],
    search: search.trim() || undefined,
  };
  const examsQuery = useListAdminExams(params);
  const coursesQuery = useListAdminCourses();
  const exams = examsQuery.data?.data ?? [];
  const courses = coursesQuery.data?.data ?? [];
  const createMutation = useCreateAdminExam();
  const updateMutation = useUpdateAdminExam();
  const deleteMutation = useDeleteAdminExam();
  const saving = createMutation.isPending || updateMutation.isPending;
  const invalidate = () => queryClient.invalidateQueries({ queryKey: getListAdminExamsQueryKey(params) });

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEdit(exam: AdminExam) {
    setEditing(exam);
    setForm({
      title: exam.title,
      courseId: exam.courseId,
      date: exam.date,
      startTime: exam.startTime ?? '',
      room: exam.room ?? '',
      type: exam.type,
    });
    setDialogOpen(true);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!form.title.trim() || !form.courseId || !form.date) {
      toast.error(c.required);
      return;
    }
    const payload: CreateAdminExamInput = {
      title: form.title.trim(),
      courseId: form.courseId,
      date: form.date,
      startTime: form.startTime.trim() || null,
      room: form.room.trim() || null,
      type: form.type as CreateAdminExamInput['type'],
    };
    const onSuccess = () => {
      toast.success(c.saved);
      setDialogOpen(false);
      invalidate();
    };
    const onError = (err: unknown) => toast.error(errorMessage(err, c.saveError));
    if (editing) {
      updateMutation.mutate({ examId: editing.id, data: payload }, { onSuccess, onError });
    } else {
      createMutation.mutate({ data: payload }, { onSuccess, onError });
    }
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    deleteMutation.mutate(
      { examId: deleteTarget.id },
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
          <h1 className="text-3xl font-bold text-foreground">{t('exams.title')}</h1>
          <Button onClick={openCreate}>{t('exams.create')}</Button>
        </div>

        <Card className="mb-6 p-4">
          <div className="grid gap-3 md:grid-cols-3">
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t('common.search')} />
            <Select value={courseFilter} onValueChange={setCourseFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{c.allCourses}</SelectItem>
                {courses.map((course) => <SelectItem key={course.id} value={course.id}>{course.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{c.allTypes}</SelectItem>
                {EXAM_TYPES.map((item) => <SelectItem key={item} value={item}>{c.types[item]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </Card>

        {examsQuery.isLoading ? (
          <div className="flex justify-center py-20"><Spinner /></div>
        ) : examsQuery.isError ? (
          <Card className="p-12 text-center"><p className="text-destructive">{c.loadError}</p></Card>
        ) : exams.length > 0 ? (
          <div className="space-y-3">
            {exams.map((exam) => (
              <Card key={exam.id} className="p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-foreground">{exam.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{exam.courseCode ? `${exam.courseCode} - ` : ''}{exam.courseName}</p>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <span className="rounded-md bg-muted px-2 py-1">{c.types[exam.type]}</span>
                      <span className="rounded-md bg-muted px-2 py-1">{exam.date}</span>
                      {exam.startTime ? <span className="rounded-md bg-muted px-2 py-1">{exam.startTime}</span> : null}
                      {exam.room ? <span className="rounded-md bg-muted px-2 py-1">{exam.room}</span> : null}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => openEdit(exam)}>{t('common.edit')}</Button>
                    <Button variant="destructive" size="sm" onClick={() => setDeleteTarget(exam)}>{t('common.delete')}</Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-12 text-center text-muted-foreground">{c.empty}</Card>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editing ? t('exams.edit') : t('exams.create')}</DialogTitle>
            <DialogDescription>{c.formDescription}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-2">
              <Label>{t('exams.type')}</Label>
              <Select value={form.type} onValueChange={(value) => setForm((current) => ({ ...current, type: value }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EXAM_TYPES.map((item) => <SelectItem key={item} value={item}>{c.types[item]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="exam-title">{t('exams.title')}</Label>
              <Input id="exam-title" value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} />
            </div>
            <div className="grid gap-2">
              <Label>{t('exams.course')}</Label>
              <Select value={form.courseId} onValueChange={(value) => setForm((current) => ({ ...current, courseId: value }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {courses.map((course) => <SelectItem key={course.id} value={course.id}>{course.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="grid gap-2">
                <Label htmlFor="exam-date">{t('exams.date')}</Label>
                <Input id="exam-date" type="date" value={form.date} onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="exam-time">{t('exams.time')}</Label>
                <Input id="exam-time" type="time" value={form.startTime} onChange={(event) => setForm((current) => ({ ...current, startTime: event.target.value }))} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="exam-room">{c.room}</Label>
                <Input id="exam-room" value={form.room} onChange={(event) => setForm((current) => ({ ...current, room: event.target.value }))} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>{t('common.cancel')}</Button>
              <Button type="submit" disabled={saving}>{saving ? <Spinner className="mr-2 h-4 w-4" /> : null}{t('common.save')}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('common.delete')}</AlertDialogTitle>
            <AlertDialogDescription>{c.deleteConfirm}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>{t('common.delete')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
