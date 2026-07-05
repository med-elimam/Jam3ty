import { useState } from 'react';
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
  getListAdminDepartmentsQueryKey,
  getListAdminFacultiesQueryKey,
  getListAdminGroupsQueryKey,
  getListAdminLevelsQueryKey,
  getListAdminTimetableQueryKey,
  useCreateAdminTimetableSession,
  useDeleteAdminTimetableSession,
  useListAdminCourses,
  useListAdminDepartments,
  useListAdminFaculties,
  useListAdminGroups,
  useListAdminLevels,
  useListAdminTimetable,
  useListUniversities,
  useUpdateAdminTimetableSession,
} from '@workspace/api-client-react';
import type { AdminTimetableSession, CreateAdminTimetableSessionInput } from '@workspace/api-client-react';

const SESSION_TYPES = ['lecture', 'td', 'tp'] as const;
const DAYS = [0, 1, 2, 3, 4, 5, 6] as const;
const ALL = '__all__';
const NO_GROUP = '__none__';

interface FormState {
  courseId: string;
  groupId: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  room: string;
  type: CreateAdminTimetableSessionInput['type'];
  recurrence: string;
}

const EMPTY_FORM: FormState = {
  courseId: '',
  groupId: NO_GROUP,
  dayOfWeek: '0',
  startTime: '08:00',
  endTime: '10:00',
  room: '',
  type: 'lecture',
  recurrence: 'weekly',
};

function extractErrorMessage(err: unknown, fallback: string): string {
  const data = (err as { data?: { error?: { message?: string } } })?.data;
  return data?.error?.message ?? fallback;
}

export default function AdminTimetable() {
  const { t } = useAdminI18n();
  const queryClient = useQueryClient();

  const [universityId, setUniversityId] = useState('');
  const [facultyId, setFacultyId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [levelId, setLevelId] = useState('');
  const [groupFilter, setGroupFilter] = useState(ALL);
  const [courseFilter, setCourseFilter] = useState(ALL);

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

  const groupsQuery = useListAdminGroups(
    { levelId },
    { query: { queryKey: getListAdminGroupsQueryKey({ levelId }), enabled: levelId !== '' } },
  );
  const groups = groupsQuery.data?.data ?? [];

  const coursesParams = departmentId && levelId ? { departmentId, levelId } : undefined;
  const coursesQuery = useListAdminCourses(coursesParams);
  const courses = coursesQuery.data?.data ?? [];

  const timetableParams = {
    groupId: groupFilter === ALL ? undefined : groupFilter,
    courseId: courseFilter === ALL ? undefined : courseFilter,
  };
  const timetableQuery = useListAdminTimetable(timetableParams);
  const sessions = timetableQuery.data?.data ?? [];

  const createMutation = useCreateAdminTimetableSession();
  const updateMutation = useUpdateAdminTimetableSession();
  const deleteMutation = useDeleteAdminTimetableSession();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AdminTimetableSession | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<AdminTimetableSession | null>(null);
  const saving = createMutation.isPending || updateMutation.isPending;

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getListAdminTimetableQueryKey(timetableParams) });

  function onUniversityChange(value: string) {
    setUniversityId(value);
    setFacultyId('');
    setDepartmentId('');
    setLevelId('');
    setGroupFilter(ALL);
  }
  function onFacultyChange(value: string) {
    setFacultyId(value);
    setDepartmentId('');
    setLevelId('');
    setGroupFilter(ALL);
  }
  function onDepartmentChange(value: string) {
    setDepartmentId(value);
    setLevelId('');
    setGroupFilter(ALL);
  }
  function onLevelChange(value: string) {
    setLevelId(value);
    setGroupFilter(ALL);
  }

  function openCreate() {
    setEditing(null);
    setForm({ ...EMPTY_FORM, groupId: groupFilter === ALL ? NO_GROUP : groupFilter, courseId: courseFilter === ALL ? '' : courseFilter });
    setDialogOpen(true);
  }

  function openEdit(session: AdminTimetableSession) {
    setEditing(session);
    setForm({
      courseId: session.courseId,
      groupId: session.groupId ?? NO_GROUP,
      dayOfWeek: String(session.dayOfWeek),
      startTime: session.startTime,
      endTime: session.endTime,
      room: session.room ?? '',
      type: session.type,
      recurrence: session.recurrence,
    });
    setDialogOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.courseId || !form.startTime || !form.endTime) {
      toast.error(t('timetable.required'));
      return;
    }
    const dayOfWeek = Number(form.dayOfWeek);
    const payload: CreateAdminTimetableSessionInput = {
      courseId: form.courseId,
      groupId: form.groupId === NO_GROUP ? null : form.groupId,
      dayOfWeek,
      startTime: form.startTime,
      endTime: form.endTime,
      room: form.room.trim() || null,
      type: form.type,
      recurrence: form.recurrence.trim() || 'weekly',
    };
    const onSuccess = () => {
      toast.success(t('timetable.saved'));
      setDialogOpen(false);
      invalidate();
    };
    const onError = (err: unknown) => toast.error(extractErrorMessage(err, t('timetable.saveError')));

    if (editing) updateMutation.mutate({ sessionId: editing.id, data: payload }, { onSuccess, onError });
    else createMutation.mutate({ data: payload }, { onSuccess, onError });
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    deleteMutation.mutate(
      { sessionId: deleteTarget.id },
      {
        onSuccess: () => {
          toast.success(t('timetable.deleted'));
          setDeleteTarget(null);
          invalidate();
        },
        onError: (err) => {
          toast.error(extractErrorMessage(err, t('timetable.deleteError')));
          setDeleteTarget(null);
        },
      },
    );
  }

  return (
    <AdminLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <h1 className="text-3xl font-bold text-foreground">{t('timetable.title')}</h1>
          <Button onClick={openCreate}>{t('timetable.create')}</Button>
        </div>

        <Card className="p-4 mb-6">
          <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
            <Select value={universityId} onValueChange={onUniversityChange}>
              <SelectTrigger><SelectValue placeholder={t('academicStructure.selectUniversity')} /></SelectTrigger>
              <SelectContent>{universities.map((u) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={facultyId} onValueChange={onFacultyChange} disabled={!universityId}>
              <SelectTrigger><SelectValue placeholder={t('academicStructure.selectFaculty')} /></SelectTrigger>
              <SelectContent>{faculties.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={departmentId} onValueChange={onDepartmentChange} disabled={!facultyId}>
              <SelectTrigger><SelectValue placeholder={t('academicStructure.selectDepartment')} /></SelectTrigger>
              <SelectContent>{departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={levelId} onValueChange={onLevelChange} disabled={!departmentId}>
              <SelectTrigger><SelectValue placeholder={t('academicStructure.selectLevel')} /></SelectTrigger>
              <SelectContent>{levels.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={groupFilter} onValueChange={setGroupFilter} disabled={!levelId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{t('timetable.allGroups')}</SelectItem>
                {groups.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={courseFilter} onValueChange={setCourseFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{t('timetable.allCourses')}</SelectItem>
                {courses.map((course) => <SelectItem key={course.id} value={course.id}>{course.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </Card>

        {timetableQuery.isLoading ? (
          <div className="flex items-center justify-center py-20"><Spinner /></div>
        ) : timetableQuery.isError ? (
          <Card className="p-12 text-center">
            <p className="text-destructive mb-4">{t('timetable.loadError')}</p>
            <Button variant="outline" onClick={() => timetableQuery.refetch()}>{t('common.search')}</Button>
          </Card>
        ) : sessions.length > 0 ? (
          <div className="grid gap-4 lg:grid-cols-7">
            {DAYS.map((day) => {
              const daySessions = sessions.filter((session) => session.dayOfWeek === day);
              return (
                <Card key={day} className="p-4 min-h-40">
                  <h2 className="font-semibold text-foreground mb-3">{t(`timetable.days.${day}`)}</h2>
                  <div className="space-y-3">
                    {daySessions.length > 0 ? daySessions.map((session) => (
                      <div key={session.id} className="rounded-md border bg-muted/30 p-3">
                        <p className="font-medium text-sm text-foreground">{session.courseName}</p>
                        <p className="text-xs text-muted-foreground mt-1" dir="ltr">{session.startTime} - {session.endTime}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {[t(`timetable.types.${session.type}`), session.groupName, session.room].filter(Boolean).join(' · ')}
                        </p>
                        <div className="mt-3 flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => openEdit(session)}>{t('common.edit')}</Button>
                          <Button variant="outline" size="sm" className="text-destructive" onClick={() => setDeleteTarget(session)}>{t('common.delete')}</Button>
                        </div>
                      </div>
                    )) : <p className="text-sm text-muted-foreground">{t('common.noData')}</p>}
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="p-12 text-center"><p className="text-muted-foreground">{t('timetable.empty')}</p></Card>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>{editing ? t('timetable.edit') : t('timetable.create')}</DialogTitle>
              <DialogDescription>{t('timetable.formDescription')}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>{t('timetable.course')}</Label>
                <Select value={form.courseId} onValueChange={(v) => setForm((f) => ({ ...f, courseId: v }))} disabled={saving}>
                  <SelectTrigger><SelectValue placeholder={t('timetable.course')} /></SelectTrigger>
                  <SelectContent>{courses.map((course) => <SelectItem key={course.id} value={course.id}>{course.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t('timetable.group')}</Label>
                <Select value={form.groupId} onValueChange={(v) => setForm((f) => ({ ...f, groupId: v }))} disabled={saving}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_GROUP}>{t('timetable.noGroup')}</SelectItem>
                    {groups.map((group) => <SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <Label>{t('timetable.day')}</Label>
                  <Select value={form.dayOfWeek} onValueChange={(v) => setForm((f) => ({ ...f, dayOfWeek: v }))} disabled={saving}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{DAYS.map((day) => <SelectItem key={day} value={String(day)}>{t(`timetable.days.${day}`)}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="session-start">{t('timetable.startTime')}</Label>
                  <Input id="session-start" type="time" value={form.startTime} onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))} disabled={saving} dir="ltr" />
                </div>
                <div>
                  <Label htmlFor="session-end">{t('timetable.endTime')}</Label>
                  <Input id="session-end" type="time" value={form.endTime} onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))} disabled={saving} dir="ltr" />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <Label>{t('timetable.type')}</Label>
                  <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v as FormState['type'] }))} disabled={saving}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{SESSION_TYPES.map((type) => <SelectItem key={type} value={type}>{t(`timetable.types.${type}`)}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="session-room">{t('timetable.room')}</Label>
                  <Input id="session-room" value={form.room} onChange={(e) => setForm((f) => ({ ...f, room: e.target.value }))} disabled={saving} />
                </div>
                <div>
                  <Label htmlFor="session-recurrence">{t('timetable.recurrence')}</Label>
                  <Input id="session-recurrence" value={form.recurrence} onChange={(e) => setForm((f) => ({ ...f, recurrence: e.target.value }))} disabled={saving} dir="ltr" />
                </div>
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
            <AlertDialogTitle>{t('timetable.delete')}</AlertDialogTitle>
            <AlertDialogDescription>{deleteTarget?.courseName} — {t('timetable.deleteConfirm')}</AlertDialogDescription>
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
