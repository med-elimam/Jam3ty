import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
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
  useCreateAdminFaculty,
  useUpdateAdminFaculty,
  useDeleteAdminFaculty,
  getListAdminFacultiesQueryKey,
  useListAdminDepartments,
  useCreateAdminDepartment,
  useUpdateAdminDepartment,
  useDeleteAdminDepartment,
  getListAdminDepartmentsQueryKey,
  useListAdminLevels,
  useCreateAdminLevel,
  useUpdateAdminLevel,
  useDeleteAdminLevel,
  getListAdminLevelsQueryKey,
  useListAdminGroups,
  useCreateAdminGroup,
  useUpdateAdminGroup,
  useDeleteAdminGroup,
  getListAdminGroupsQueryKey,
} from '@workspace/api-client-react';
import type { Faculty, Department, Level, Group } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';

type TabKey = 'faculties' | 'departments' | 'levels' | 'groups';
type DialogKind = 'faculty' | 'department' | 'level' | 'group';
type DeleteTarget = { kind: DialogKind; id: string; label: string };

interface FormState {
  name: string;
  nameAr: string;
  nameFr: string;
  yearNumber: string;
}

const EMPTY_FORM: FormState = { name: '', nameAr: '', nameFr: '', yearNumber: '' };

function extractErrorMessage(err: unknown, fallback: string): string {
  const data = (err as { data?: { error?: { message?: string } } })?.data;
  return data?.error?.message ?? fallback;
}

export default function AdminAcademicStructure() {
  const { t } = useAdminI18n();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<TabKey>('faculties');

  // Cascading selection, shared across tabs.
  const [universityId, setUniversityId] = useState<string>('');
  const [facultyId, setFacultyId] = useState<string>('');
  const [departmentId, setDepartmentId] = useState<string>('');
  const [levelId, setLevelId] = useState<string>('');

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

  const createFaculty = useCreateAdminFaculty();
  const updateFaculty = useUpdateAdminFaculty();
  const deleteFaculty = useDeleteAdminFaculty();

  const createDepartment = useCreateAdminDepartment();
  const updateDepartment = useUpdateAdminDepartment();
  const deleteDepartment = useDeleteAdminDepartment();

  const createLevel = useCreateAdminLevel();
  const updateLevel = useUpdateAdminLevel();
  const deleteLevel = useDeleteAdminLevel();

  const createGroup = useCreateAdminGroup();
  const updateGroup = useUpdateAdminGroup();
  const deleteGroup = useDeleteAdminGroup();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogKind, setDialogKind] = useState<DialogKind>('faculty');
  const [editingItem, setEditingItem] = useState<Faculty | Department | Level | Group | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  const saving =
    createFaculty.isPending || updateFaculty.isPending ||
    createDepartment.isPending || updateDepartment.isPending ||
    createLevel.isPending || updateLevel.isPending ||
    createGroup.isPending || updateGroup.isPending;

  const deleting =
    deleteFaculty.isPending || deleteDepartment.isPending ||
    deleteLevel.isPending || deleteGroup.isPending;

  function onUniversityChange(value: string) {
    setUniversityId(value);
    setFacultyId('');
    setDepartmentId('');
    setLevelId('');
  }
  function onFacultyChange(value: string) {
    setFacultyId(value);
    setDepartmentId('');
    setLevelId('');
  }
  function onDepartmentChange(value: string) {
    setDepartmentId(value);
    setLevelId('');
  }

  function openCreate(kind: DialogKind) {
    setDialogKind(kind);
    setEditingItem(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEdit(kind: DialogKind, item: Faculty | Department | Level | Group) {
    setDialogKind(kind);
    setEditingItem(item);
    setForm({
      name: item.name ?? '',
      nameAr: 'nameAr' in item ? item.nameAr ?? '' : '',
      nameFr: 'nameFr' in item ? item.nameFr ?? '' : '',
      yearNumber: 'yearNumber' in item ? String(item.yearNumber ?? '') : '',
    });
    setDialogOpen(true);
  }

  function invalidateFor(kind: DialogKind) {
    if (kind === 'faculty') queryClient.invalidateQueries({ queryKey: getListAdminFacultiesQueryKey({ universityId }) });
    if (kind === 'department') queryClient.invalidateQueries({ queryKey: getListAdminDepartmentsQueryKey({ facultyId }) });
    if (kind === 'level') queryClient.invalidateQueries({ queryKey: getListAdminLevelsQueryKey({ departmentId }) });
    if (kind === 'group') queryClient.invalidateQueries({ queryKey: getListAdminGroupsQueryKey({ levelId }) });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const name = form.name.trim();
    if (!name) {
      toast.error(t('academicStructure.nameRequired'));
      return;
    }

    const onSuccess = () => {
      toast.success(t('academicStructure.saved'));
      setDialogOpen(false);
      invalidateFor(dialogKind);
    };
    const onError = (err: unknown) => toast.error(extractErrorMessage(err, t('academicStructure.saveError')));

    if (dialogKind === 'faculty') {
      const payload = { name, nameAr: form.nameAr.trim() || null, nameFr: form.nameFr.trim() || null };
      if (editingItem) {
        updateFaculty.mutate({ facultyId: editingItem.id, data: payload }, { onSuccess, onError });
      } else {
        createFaculty.mutate({ data: { ...payload, universityId } }, { onSuccess, onError });
      }
      return;
    }

    if (dialogKind === 'department') {
      const payload = { name, nameAr: form.nameAr.trim() || null, nameFr: form.nameFr.trim() || null };
      if (editingItem) {
        updateDepartment.mutate({ departmentId: editingItem.id, data: payload }, { onSuccess, onError });
      } else {
        createDepartment.mutate({ data: { ...payload, facultyId } }, { onSuccess, onError });
      }
      return;
    }

    if (dialogKind === 'level') {
      const yearNumber = Number(form.yearNumber);
      if (!Number.isFinite(yearNumber)) {
        toast.error(t('academicStructure.yearNumberRequired'));
        return;
      }
      if (editingItem) {
        updateLevel.mutate({ levelId: editingItem.id, data: { name, yearNumber } }, { onSuccess, onError });
      } else {
        createLevel.mutate({ data: { name, yearNumber, departmentId } }, { onSuccess, onError });
      }
      return;
    }

    // group
    if (editingItem) {
      updateGroup.mutate({ groupId: editingItem.id, data: { name } }, { onSuccess, onError });
    } else {
      createGroup.mutate({ data: { name, levelId } }, { onSuccess, onError });
    }
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    const onSuccess = () => {
      toast.success(t('academicStructure.deleted'));
      setDeleteTarget(null);
      invalidateFor(deleteTarget.kind);
    };
    const onError = (err: unknown) => {
      toast.error(extractErrorMessage(err, t('academicStructure.deleteError')));
      setDeleteTarget(null);
    };

    if (deleteTarget.kind === 'faculty') deleteFaculty.mutate({ facultyId: deleteTarget.id }, { onSuccess, onError });
    else if (deleteTarget.kind === 'department') deleteDepartment.mutate({ departmentId: deleteTarget.id }, { onSuccess, onError });
    else if (deleteTarget.kind === 'level') deleteLevel.mutate({ levelId: deleteTarget.id }, { onSuccess, onError });
    else deleteGroup.mutate({ groupId: deleteTarget.id }, { onSuccess, onError });
  }

  const dialogTitleKey: Record<DialogKind, { create: string; edit: string }> = {
    faculty: { create: 'academicStructure.createFaculty', edit: 'academicStructure.editFaculty' },
    department: { create: 'academicStructure.createDepartment', edit: 'academicStructure.editDepartment' },
    level: { create: 'academicStructure.createLevel', edit: 'academicStructure.editLevel' },
    group: { create: 'academicStructure.createGroup', edit: 'academicStructure.editGroup' },
  };

  return (
    <AdminLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-foreground mb-6">{t('academicStructure.title')}</h1>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabKey)}>
          <TabsList>
            <TabsTrigger value="faculties">{t('academicStructure.faculties')}</TabsTrigger>
            <TabsTrigger value="departments">{t('academicStructure.departments')}</TabsTrigger>
            <TabsTrigger value="levels">{t('academicStructure.levels')}</TabsTrigger>
            <TabsTrigger value="groups">{t('academicStructure.groups')}</TabsTrigger>
          </TabsList>

          {/* ── Faculties ── */}
          <TabsContent value="faculties" className="mt-6">
            <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
              <div className="w-full max-w-xs">
                <Label>{t('academicStructure.university')}</Label>
                <Select value={universityId} onValueChange={onUniversityChange}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('academicStructure.selectUniversity')} />
                  </SelectTrigger>
                  <SelectContent>
                    {universities.map((u) => (
                      <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={() => openCreate('faculty')} disabled={universityId === ''}>
                {t('academicStructure.createFaculty')}
              </Button>
            </div>

            {universityId === '' ? (
              <Card className="p-12 text-center">
                <p className="text-muted-foreground">{t('academicStructure.pickUniversityFirst')}</p>
              </Card>
            ) : facultiesQuery.isLoading ? (
              <div className="flex items-center justify-center py-20"><Spinner /></div>
            ) : facultiesQuery.isError ? (
              <Card className="p-12 text-center">
                <p className="text-destructive mb-4">{t('academicStructure.loadError')}</p>
                <Button variant="outline" onClick={() => facultiesQuery.refetch()}>{t('common.search')}</Button>
              </Card>
            ) : faculties.length > 0 ? (
              <div className="space-y-3">
                {faculties.map((f) => (
                  <Card key={f.id} className="p-5 flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-foreground">{f.name}</h3>
                      {(f.nameAr || f.nameFr) && (
                        <p className="text-sm text-muted-foreground mt-1">{[f.nameAr, f.nameFr].filter(Boolean).join(' · ')}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEdit('faculty', f)}>{t('common.edit')}</Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive"
                        onClick={() => setDeleteTarget({ kind: 'faculty', id: f.id, label: f.name })}
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
          </TabsContent>

          {/* ── Departments ── */}
          <TabsContent value="departments" className="mt-6">
            <div className="flex flex-wrap items-end gap-4 mb-6">
              <div className="w-full max-w-xs">
                <Label>{t('academicStructure.university')}</Label>
                <Select value={universityId} onValueChange={onUniversityChange}>
                  <SelectTrigger><SelectValue placeholder={t('academicStructure.selectUniversity')} /></SelectTrigger>
                  <SelectContent>
                    {universities.map((u) => (<SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-full max-w-xs">
                <Label>{t('academicStructure.faculty')}</Label>
                <Select value={facultyId} onValueChange={onFacultyChange} disabled={universityId === ''}>
                  <SelectTrigger><SelectValue placeholder={t('academicStructure.selectFaculty')} /></SelectTrigger>
                  <SelectContent>
                    {faculties.map((f) => (<SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={() => openCreate('department')} disabled={facultyId === ''} className="ms-auto">
                {t('academicStructure.createDepartment')}
              </Button>
            </div>

            {facultyId === '' ? (
              <Card className="p-12 text-center"><p className="text-muted-foreground">{t('academicStructure.pickFacultyFirst')}</p></Card>
            ) : departmentsQuery.isLoading ? (
              <div className="flex items-center justify-center py-20"><Spinner /></div>
            ) : departmentsQuery.isError ? (
              <Card className="p-12 text-center">
                <p className="text-destructive mb-4">{t('academicStructure.loadError')}</p>
                <Button variant="outline" onClick={() => departmentsQuery.refetch()}>{t('common.search')}</Button>
              </Card>
            ) : departments.length > 0 ? (
              <div className="space-y-3">
                {departments.map((d) => (
                  <Card key={d.id} className="p-5 flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-foreground">{d.name}</h3>
                      {(d.nameAr || d.nameFr) && (
                        <p className="text-sm text-muted-foreground mt-1">{[d.nameAr, d.nameFr].filter(Boolean).join(' · ')}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEdit('department', d)}>{t('common.edit')}</Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive"
                        onClick={() => setDeleteTarget({ kind: 'department', id: d.id, label: d.name })}
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
          </TabsContent>

          {/* ── Levels ── */}
          <TabsContent value="levels" className="mt-6">
            <div className="flex flex-wrap items-end gap-4 mb-6">
              <div className="w-full max-w-xs">
                <Label>{t('academicStructure.university')}</Label>
                <Select value={universityId} onValueChange={onUniversityChange}>
                  <SelectTrigger><SelectValue placeholder={t('academicStructure.selectUniversity')} /></SelectTrigger>
                  <SelectContent>
                    {universities.map((u) => (<SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-full max-w-xs">
                <Label>{t('academicStructure.faculty')}</Label>
                <Select value={facultyId} onValueChange={onFacultyChange} disabled={universityId === ''}>
                  <SelectTrigger><SelectValue placeholder={t('academicStructure.selectFaculty')} /></SelectTrigger>
                  <SelectContent>
                    {faculties.map((f) => (<SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-full max-w-xs">
                <Label>{t('academicStructure.department')}</Label>
                <Select value={departmentId} onValueChange={onDepartmentChange} disabled={facultyId === ''}>
                  <SelectTrigger><SelectValue placeholder={t('academicStructure.selectDepartment')} /></SelectTrigger>
                  <SelectContent>
                    {departments.map((d) => (<SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={() => openCreate('level')} disabled={departmentId === ''} className="ms-auto">
                {t('academicStructure.createLevel')}
              </Button>
            </div>

            {departmentId === '' ? (
              <Card className="p-12 text-center"><p className="text-muted-foreground">{t('academicStructure.pickDepartmentFirst')}</p></Card>
            ) : levelsQuery.isLoading ? (
              <div className="flex items-center justify-center py-20"><Spinner /></div>
            ) : levelsQuery.isError ? (
              <Card className="p-12 text-center">
                <p className="text-destructive mb-4">{t('academicStructure.loadError')}</p>
                <Button variant="outline" onClick={() => levelsQuery.refetch()}>{t('common.search')}</Button>
              </Card>
            ) : levels.length > 0 ? (
              <div className="space-y-3">
                {levels.map((l) => (
                  <Card key={l.id} className="p-5 flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-foreground">{l.name}</h3>
                      <p className="text-sm text-muted-foreground mt-1">{t('academicStructure.yearNumber')}: {l.yearNumber}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEdit('level', l)}>{t('common.edit')}</Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive"
                        onClick={() => setDeleteTarget({ kind: 'level', id: l.id, label: l.name })}
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
          </TabsContent>

          {/* ── Groups ── */}
          <TabsContent value="groups" className="mt-6">
            <div className="flex flex-wrap items-end gap-4 mb-6">
              <div className="w-full max-w-xs">
                <Label>{t('academicStructure.university')}</Label>
                <Select value={universityId} onValueChange={onUniversityChange}>
                  <SelectTrigger><SelectValue placeholder={t('academicStructure.selectUniversity')} /></SelectTrigger>
                  <SelectContent>
                    {universities.map((u) => (<SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-full max-w-xs">
                <Label>{t('academicStructure.faculty')}</Label>
                <Select value={facultyId} onValueChange={onFacultyChange} disabled={universityId === ''}>
                  <SelectTrigger><SelectValue placeholder={t('academicStructure.selectFaculty')} /></SelectTrigger>
                  <SelectContent>
                    {faculties.map((f) => (<SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-full max-w-xs">
                <Label>{t('academicStructure.department')}</Label>
                <Select value={departmentId} onValueChange={onDepartmentChange} disabled={facultyId === ''}>
                  <SelectTrigger><SelectValue placeholder={t('academicStructure.selectDepartment')} /></SelectTrigger>
                  <SelectContent>
                    {departments.map((d) => (<SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-full max-w-xs">
                <Label>{t('academicStructure.level')}</Label>
                <Select value={levelId} onValueChange={setLevelId} disabled={departmentId === ''}>
                  <SelectTrigger><SelectValue placeholder={t('academicStructure.selectLevel')} /></SelectTrigger>
                  <SelectContent>
                    {levels.map((l) => (<SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={() => openCreate('group')} disabled={levelId === ''} className="ms-auto">
                {t('academicStructure.createGroup')}
              </Button>
            </div>

            {levelId === '' ? (
              <Card className="p-12 text-center"><p className="text-muted-foreground">{t('academicStructure.pickLevelFirst')}</p></Card>
            ) : groupsQuery.isLoading ? (
              <div className="flex items-center justify-center py-20"><Spinner /></div>
            ) : groupsQuery.isError ? (
              <Card className="p-12 text-center">
                <p className="text-destructive mb-4">{t('academicStructure.loadError')}</p>
                <Button variant="outline" onClick={() => groupsQuery.refetch()}>{t('common.search')}</Button>
              </Card>
            ) : groups.length > 0 ? (
              <div className="space-y-3">
                {groups.map((g) => (
                  <Card key={g.id} className="p-5 flex items-center justify-between">
                    <h3 className="font-semibold text-foreground">{g.name}</h3>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEdit('group', g)}>{t('common.edit')}</Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive"
                        onClick={() => setDeleteTarget({ kind: 'group', id: g.id, label: g.name })}
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
          </TabsContent>
        </Tabs>
      </div>

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>{t(editingItem ? dialogTitleKey[dialogKind].edit : dialogTitleKey[dialogKind].create)}</DialogTitle>
              <DialogDescription>{t(`academicStructure.${dialogKind}`)}</DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="as-name">{t('academicStructure.name')}</Label>
                <Input
                  id="as-name"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  disabled={saving}
                  autoFocus
                />
              </div>

              {(dialogKind === 'faculty' || dialogKind === 'department') && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="as-nameAr">{t('academicStructure.nameAr')}</Label>
                    <Input
                      id="as-nameAr"
                      value={form.nameAr}
                      onChange={(e) => setForm((f) => ({ ...f, nameAr: e.target.value }))}
                      disabled={saving}
                    />
                  </div>
                  <div>
                    <Label htmlFor="as-nameFr">{t('academicStructure.nameFr')}</Label>
                    <Input
                      id="as-nameFr"
                      value={form.nameFr}
                      onChange={(e) => setForm((f) => ({ ...f, nameFr: e.target.value }))}
                      disabled={saving}
                    />
                  </div>
                </div>
              )}

              {dialogKind === 'level' && (
                <div>
                  <Label htmlFor="as-year">{t('academicStructure.yearNumber')}</Label>
                  <Input
                    id="as-year"
                    type="number"
                    value={form.yearNumber}
                    onChange={(e) => setForm((f) => ({ ...f, yearNumber: e.target.value }))}
                    disabled={saving}
                  />
                </div>
              )}
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
            <AlertDialogTitle>{deleteTarget ? `${t('common.delete')} — ${deleteTarget.label}` : t('common.delete')}</AlertDialogTitle>
            <AlertDialogDescription>{t('academicStructure.deleteConfirm')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); confirmDelete(); }}
              disabled={deleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
