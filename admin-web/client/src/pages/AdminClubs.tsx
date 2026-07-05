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
  getListAdminClubsQueryKey,
  useCreateAdminClub,
  useDeleteAdminClub,
  useListAdminClubs,
  useListAdminUniversities,
  useListAdminUsers,
  useUpdateAdminClub,
} from '@workspace/api-client-react';
import type { AdminClub, CreateAdminClubInput, ListAdminClubsParams } from '@workspace/api-client-react';

const ALL = '__all__';
const NONE = '__none__';
const STATUSES = ['active', 'inactive'] as const;

const EMPTY_FORM = {
  name: '',
  description: '',
  universityId: NONE,
  logoUrl: '',
  presidentId: NONE,
  status: 'active',
};

const copy = {
  ar: {
    allStatuses: 'كل الحالات',
    allUniversities: 'كل الجامعات',
    noUniversity: 'بدون جامعة',
    noPresident: 'بدون رئيس',
    president: 'الرئيس',
    logoUrl: 'رابط الشعار',
    empty: 'لا توجد نواد مطابقة.',
    formDescription: 'انشئ او عدل ناديا بالحقول الموجودة في قاعدة البيانات فقط.',
    required: 'اسم النادي مطلوب.',
    saved: 'تم حفظ النادي.',
    deleted: 'تم حذف النادي.',
    loadError: 'تعذر تحميل النوادي.',
    saveError: 'تعذر حفظ النادي.',
    deleteError: 'تعذر حذف النادي. اذا كان له اعضاء او طلبات انضمام او فعاليات، قم بتعطيله بدلا من الحذف.',
    deleteConfirm: 'سيتم حذف النادي فقط اذا لم يكن مرتبطا باعضاء او طلبات او فعاليات.',
    statuses: { active: 'نشط', inactive: 'غير نشط' },
  },
  fr: {
    allStatuses: 'Tous les statuts',
    allUniversities: 'Toutes les universites',
    noUniversity: 'Sans universite',
    noPresident: 'Sans president',
    president: 'President',
    logoUrl: 'URL du logo',
    empty: 'Aucun club ne correspond.',
    formDescription: 'Creez ou modifiez un club avec les champs presents en base.',
    required: 'Le nom du club est obligatoire.',
    saved: 'Club enregistre.',
    deleted: 'Club supprime.',
    loadError: 'Impossible de charger les clubs.',
    saveError: 'Impossible d enregistrer le club.',
    deleteError: 'Impossible de supprimer le club. S il a des membres, demandes ou evenements, desactivez-le plutot.',
    deleteConfirm: 'Ce club sera supprime uniquement s il n a aucun membre, demande ou evenement.',
    statuses: { active: 'Actif', inactive: 'Inactif' },
  },
} as const;

function errorMessage(err: unknown, fallback: string) {
  return (err as { data?: { error?: { message?: string } } })?.data?.error?.message ?? fallback;
}

export default function AdminClubs() {
  const { t, lang } = useAdminI18n();
  const c = copy[lang];
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(ALL);
  const [universityFilter, setUniversityFilter] = useState(ALL);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AdminClub | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminClub | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const params: ListAdminClubsParams = {
    status: statusFilter === ALL ? undefined : statusFilter as ListAdminClubsParams['status'],
    universityId: universityFilter === ALL ? undefined : universityFilter,
    search: search.trim() || undefined,
  };
  const clubsQuery = useListAdminClubs(params);
  const universitiesQuery = useListAdminUniversities();
  const usersQuery = useListAdminUsers();
  const clubs = clubsQuery.data?.data ?? [];
  const universities = universitiesQuery.data?.data ?? [];
  const users = usersQuery.data?.data ?? [];
  const createMutation = useCreateAdminClub();
  const updateMutation = useUpdateAdminClub();
  const deleteMutation = useDeleteAdminClub();
  const saving = createMutation.isPending || updateMutation.isPending;
  const invalidate = () => queryClient.invalidateQueries({ queryKey: getListAdminClubsQueryKey(params) });

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEdit(club: AdminClub) {
    setEditing(club);
    setForm({
      name: club.name,
      description: club.description ?? '',
      universityId: club.universityId ?? NONE,
      logoUrl: club.logoUrl ?? '',
      presidentId: club.presidentId ?? NONE,
      status: club.status,
    });
    setDialogOpen(true);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!form.name.trim()) {
      toast.error(c.required);
      return;
    }
    const payload: CreateAdminClubInput = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      universityId: form.universityId === NONE ? null : form.universityId,
      logoUrl: form.logoUrl.trim() || null,
      presidentId: form.presidentId === NONE ? null : form.presidentId,
      status: form.status as CreateAdminClubInput['status'],
    };
    const onSuccess = () => {
      toast.success(c.saved);
      setDialogOpen(false);
      invalidate();
    };
    const onError = (err: unknown) => toast.error(errorMessage(err, c.saveError));
    if (editing) {
      updateMutation.mutate({ clubId: editing.id, data: payload }, { onSuccess, onError });
    } else {
      createMutation.mutate({ data: payload }, { onSuccess, onError });
    }
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    deleteMutation.mutate(
      { clubId: deleteTarget.id },
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
          <h1 className="text-3xl font-bold text-foreground">{t('clubs.title')}</h1>
          <Button onClick={openCreate}>{t('clubs.create')}</Button>
        </div>

        <Card className="mb-6 p-4">
          <div className="grid gap-3 md:grid-cols-3">
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t('common.search')} />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{c.allStatuses}</SelectItem>
                {STATUSES.map((item) => <SelectItem key={item} value={item}>{c.statuses[item]}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={universityFilter} onValueChange={setUniversityFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{c.allUniversities}</SelectItem>
                {universities.map((university) => <SelectItem key={university.id} value={university.id}>{university.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </Card>

        {clubsQuery.isLoading ? (
          <div className="flex justify-center py-20"><Spinner /></div>
        ) : clubsQuery.isError ? (
          <Card className="p-12 text-center"><p className="text-destructive">{c.loadError}</p></Card>
        ) : clubs.length > 0 ? (
          <div className="space-y-3">
            {clubs.map((club) => (
              <Card key={club.id} className="p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex min-w-0 gap-4">
                    {club.logoUrl ? <img src={club.logoUrl} alt="" className="h-12 w-12 rounded-md object-cover" /> : <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-muted text-sm font-semibold text-muted-foreground">{club.name.slice(0, 2).toUpperCase()}</div>}
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-foreground">{club.name}</h3>
                        <span className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">{c.statuses[club.status]}</span>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{club.universityName || club.presidentName || '-'}</p>
                      <p className="mt-2 text-xs text-muted-foreground">{club.memberCount} {t('clubs.members')}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => openEdit(club)}>{t('common.edit')}</Button>
                    <Button variant="destructive" size="sm" onClick={() => setDeleteTarget(club)}>{t('common.delete')}</Button>
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
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? t('clubs.edit') : t('clubs.create')}</DialogTitle>
            <DialogDescription>{c.formDescription}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="grid gap-2">
                <Label>{t('clubs.name')}</Label>
                <Input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
              </div>
              <div className="grid gap-2">
                <Label>{t('subscriptions.status')}</Label>
                <Select value={form.status} onValueChange={(value) => setForm((current) => ({ ...current, status: value }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((item) => <SelectItem key={item} value={item}>{c.statuses[item]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="grid gap-2">
                <Label>{t('nav.universities')}</Label>
                <Select value={form.universityId} onValueChange={(value) => setForm((current) => ({ ...current, universityId: value }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>{c.noUniversity}</SelectItem>
                    {universities.map((university) => <SelectItem key={university.id} value={university.id}>{university.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>{c.president}</Label>
                <Select value={form.presidentId} onValueChange={(value) => setForm((current) => ({ ...current, presidentId: value }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>{c.noPresident}</SelectItem>
                    {users.map((user) => <SelectItem key={user.id} value={user.id}>{user.fullName || user.email}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>{c.logoUrl}</Label>
                <Input value={form.logoUrl} onChange={(event) => setForm((current) => ({ ...current, logoUrl: event.target.value }))} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>{t('clubs.description')}</Label>
              <Textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} />
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
