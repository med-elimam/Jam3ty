import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAdminI18n } from '@/contexts/AdminI18nContext';
import AdminLayout from '@/components/AdminLayout';
import { toast } from 'sonner';
import {
  useListUniversities,
  useListAdminFaculties,
  getListAdminFacultiesQueryKey,
  useListAdminDepartments,
  getListAdminDepartmentsQueryKey,
  useListAdminLevels,
  getListAdminLevelsQueryKey,
  useListAdminUsers,
  getListAdminUsersQueryKey,
  useListAdminCourses,
  useCreateAdminCourse,
  useUpdateAdminCourse,
  useDeleteAdminCourse,
  getListAdminCoursesQueryKey,
} from '@workspace/api-client-react';
import type { AdminCourse, CreateAdminCourseInput } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';

const SEMESTERS = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8'] as const;
const NO_PROFESSOR = '__none__';

interface FormState {
  name: string;
  nameAr: string;
  nameFr: string;
  code: string;
  description: string;
  semester: string;
  professorId: string;
  isActive: boolean;
}

const EMPTY_FORM: FormState = {
  name: '',
  nameAr: '',
  nameFr: '',
  code: '',
  description: '',
  semester: 'S1',
  professorId: NO_PROFESSOR,
  isActive: true,
};

function extractErrorMessage(err: unknown, fallback: string): string {
  const data = (err as { data?: { error?: { message?: string } } })?.data;
  return data?.error?.message ?? fallback;
}

export default function AdminCourses() {
  const { t } = useAdminI18n();
  const queryClient = useQueryClient();

  // Cascading scope: university → faculty → department → level.
  const [universityId, setUniversityId] = useState('');
  const [facultyId, setFacultyId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [levelId, setLevelId] = useState('');

  const { data: universitiesData } = useListUniversities();
  const universities = universitiesData?.data ?? [];

  const facultiesQuery = useListAdminFaculties(
    { universityId },
    { query: { queryKey: getListAdminFacultiesQueryKey({ universityId }), enabled: universityId !== '' } },
  );
  const faculties = facultiesQuery.data?.data ?? [];

  const departmentsQuery = useListAdminDepartments(
    { facultyId },
    { query: { queryKey: getListAdminDepartmentsQueryKey({ facultyId }), enabled: facultyId !== '' } },
  );
  const departments = departmentsQuery.data?.data ?? [];

  const levelsQuery = useListAdminLevels(
    { departmentId },
    { query: { queryKey: getListAdminLevelsQueryKey({ departmentId }), enabled: departmentId !== '' } },
  );
  const levels = levelsQuery.data?.data ?? [];

  const scopeReady = departmentId !== '' && levelId !== '';
  const coursesParams = { departmentId, levelId };
  const coursesQuery = useListAdminCourses(coursesParams, {
    query: { queryKey: getListAdminCoursesQueryKey(coursesParams), enabled: scopeReady },
  });
  const courses = coursesQuery.data?.data ?? [];

  const professorsQuery = useListAdminUsers(
    { role: 'professor' },
    { query: { queryKey: getListAdminUsersQueryKey({ role: 'professor' }) } },
  );
  const professors = professorsQuery.data?.data ?? [];

  const createMutation = useCreateAdminCourse();
  const updateMutation = useUpdateAdminCourse();
  const deleteMutation = useDeleteAdminCourse();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AdminCourse | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<AdminCourse | null>(null);

  const saving = createMutation.isPending || updateMutation.isPending;

  function onUniversityChange(v: string) {
    setUniversityId(v);
    setFacultyId('');
    setDepartmentId('');
    setLevelId('');
  }
  function onFacultyChange(v: string) {
    setFacultyId(v);
    setDepartmentId('');
    setLevelId('');
  }
  function onDepartmentChange(v: string) {
    setDepartmentId(v);
    setLevelId('');
  }

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: getListAdminCoursesQueryKey(coursesParams) });

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEdit(course: AdminCourse) {
    setEditing(course);
    setForm({
      name: course.name ?? '',
      nameAr: course.nameAr ?? '',
      nameFr: course.nameFr ?? '',
      code: course.code ?? '',
      description: course.description ?? '',
      semester: course.semester ?? 'S1',
      professorId: course.professorId ?? NO_PROFESSOR,
      isActive: course.isActive,
    });
    setDialogOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const name = form.name.trim();
    if (!name) {
      toast.error(t('courses.nameRequired'));
      return;
    }

    const shared = {
      name,
      nameAr: form.nameAr.trim() || null,
      nameFr: form.nameFr.trim() || null,
      code: form.code.trim() || null,
      description: form.description.trim() || null,
      semester: form.semester as CreateAdminCourseInput['semester'],
      professorId: form.professorId === NO_PROFESSOR ? null : form.professorId,
      isActive: form.isActive,
    };

    const onSuccess = () => {
      toast.success(t('courses.saved'));
      setDialogOpen(false);
      invalidate();
    };
    const onError = (err: unknown) => toast.error(extractErrorMessage(err, t('courses.saveError')));

    if (editing) {
      updateMutation.mutate({ courseId: editing.id, data: shared }, { onSuccess, onError });
    } else {
      createMutation.mutate({ data: { ...shared, departmentId, levelId } }, { onSuccess, onError });
    }
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    deleteMutation.mutate(
      { courseId: deleteTarget.id },
      {
        onSuccess: () => {
          toast.success(t('courses.deleted'));
          setDeleteTarget(null);
          invalidate();
        },
        onError: (err) => {
          toast.error(extractErrorMessage(err, t('courses.deleteError')));
          setDeleteTarget(null);
        },
      },
    );
  }

  return (
    <AdminLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-foreground mb-6">{t('courses.title')}</h1>

        {/* Scope selectors */}
        <div className="flex flex-wrap items-end gap-4 mb-6">
          <div className="w-full max-w-56">
            <Label>{t('academicStructure.university')}</Label>
            <Select value={universityId} onValueChange={onUniversityChange}>
              <SelectTrigger><SelectValue placeholder={t('academicStructure.selectUniversity')} /></SelectTrigger>
              <SelectContent>
                {universities.map((u) => (<SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-full max-w-56">
            <Label>{t('academicStructure.faculty')}</Label>
            <Select value={facultyId} onValueChange={onFacultyChange} disabled={universityId === ''}>
              <SelectTrigger><SelectValue placeholder={t('academicStructure.selectFaculty')} /></SelectTrigger>
              <SelectContent>
                {faculties.map((f) => (<SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-full max-w-56">
            <Label>{t('academicStructure.department')}</Label>
            <Select value={departmentId} onValueChange={onDepartmentChange} disabled={facultyId === ''}>
              <SelectTrigger><SelectValue placeholder={t('academicStructure.selectDepartment')} /></SelectTrigger>
              <SelectContent>
                {departments.map((d) => (<SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-full max-w-56">
            <Label>{t('academicStructure.level')}</Label>
            <Select value={levelId} onValueChange={setLevelId} disabled={departmentId === ''}>
              <SelectTrigger><SelectValue placeholder={t('academicStructure.selectLevel')} /></SelectTrigger>
              <SelectContent>
                {levels.map((l) => (<SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={openCreate} disabled={!scopeReady} className="ms-auto">
            {t('courses.create')}
          </Button>
        </div>

        {!scopeReady ? (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground">{t('courses.pickLevelFirst')}</p>
          </Card>
        ) : coursesQuery.isLoading ? (
          <div className="flex items-center justify-center py-20"><Spinner /></div>
        ) : coursesQuery.isError ? (
          <Card className="p-12 text-center">
            <p className="text-destructive mb-4">{t('courses.loadError')}</p>
            <Button variant="outline" onClick={() => coursesQuery.refetch()}>{t('common.search')}</Button>
          </Card>
        ) : courses.length > 0 ? (
          <div className="space-y-3">
            {courses.map((c) => (
              <Card key={c.id} className="p-5 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="font-semibold text-foreground">{c.name}</h3>
                    {c.code && (
                      <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground" dir="ltr">
                        {c.code}
                      </span>
                    )}
                    <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary" dir="ltr">
                      {c.semester}
                    </span>
                    {!c.isActive && (
                      <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                        {t('courses.inactive')}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1 truncate">
                    {[
                      c.nameAr,
                      c.nameFr,
                      c.professorName ? `${t('courses.professor')}: ${c.professorName}` : null,
                    ].filter(Boolean).join(' · ') || t('courses.noProfessor')}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button variant="outline" size="sm" onClick={() => openEdit(c)}>{t('common.edit')}</Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive"
                    onClick={() => setDeleteTarget(c)}
                  >
                    {t('common.delete')}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-12 text-center"><p className="text-muted-foreground">{t('common.noData')}</p></Card>
        )}
      </div>

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>{editing ? t('courses.edit') : t('courses.create')}</DialogTitle>
              <DialogDescription>{t('courses.title')}</DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="course-name">{t('courses.name')}</Label>
                <Input
                  id="course-name"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  disabled={saving}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="course-nameAr">{t('courses.nameAr')}</Label>
                  <Input
                    id="course-nameAr"
                    value={form.nameAr}
                    onChange={(e) => setForm((f) => ({ ...f, nameAr: e.target.value }))}
                    disabled={saving}
                  />
                </div>
                <div>
                  <Label htmlFor="course-nameFr">{t('courses.nameFr')}</Label>
                  <Input
                    id="course-nameFr"
                    value={form.nameFr}
                    onChange={(e) => setForm((f) => ({ ...f, nameFr: e.target.value }))}
                    disabled={saving}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="course-code">{t('courses.code')}</Label>
                  <Input
                    id="course-code"
                    value={form.code}
                    onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                    disabled={saving}
                    dir="ltr"
                  />
                </div>
                <div>
                  <Label>{t('courses.semester')}</Label>
                  <Select
                    value={form.semester}
                    onValueChange={(v) => setForm((f) => ({ ...f, semester: v }))}
                    disabled={saving}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SEMESTERS.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>{t('courses.professor')}</Label>
                <Select
                  value={form.professorId}
                  onValueChange={(v) => setForm((f) => ({ ...f, professorId: v }))}
                  disabled={saving}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_PROFESSOR}>{t('courses.noProfessor')}</SelectItem>
                    {professors.map((p) => (<SelectItem key={p.id} value={p.id}>{p.fullName}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="course-description">{t('courses.description')}</Label>
                <Textarea
                  id="course-description"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  disabled={saving}
                  rows={3}
                />
              </div>
              <div className="flex items-center justify-between rounded-md border p-4">
                <Label htmlFor="course-active" className="cursor-pointer">{t('courses.courseActive')}</Label>
                <Switch
                  id="course-active"
                  checked={form.isActive}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, isActive: v }))}
                  disabled={saving}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? <Spinner className="me-2 h-4 w-4" /> : null}
                {t('common.save')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('courses.delete')}</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.name} — {t('courses.deleteConfirm')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                confirmDelete();
              }}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
