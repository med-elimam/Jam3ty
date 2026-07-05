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
  getListAdminEventsQueryKey,
  useCreateAdminEvent,
  useDeleteAdminEvent,
  useListAdminClubs,
  useListAdminEvents,
  useListAdminUniversities,
  useUpdateAdminEvent,
} from '@workspace/api-client-react';
import type { AdminEvent, CreateAdminEventInput, ListAdminEventsParams } from '@workspace/api-client-react';

const ALL = '__all__';
const NONE = '__none__';
const EVENT_TYPES = ['university', 'club', 'training', 'competition', 'workshop', 'conference', 'other'] as const;

const EMPTY_FORM = {
  title: '',
  description: '',
  type: 'university',
  location: '',
  startDate: '',
  endDate: '',
  universityId: NONE,
  clubId: NONE,
};

const copy = {
  ar: {
    allTypes: 'كل الانواع',
    allUniversities: 'كل الجامعات',
    noUniversity: 'بدون جامعة',
    noClub: 'بدون ناد',
    club: 'النادي',
    startsAt: 'البداية',
    endsAt: 'النهاية',
    registrations: 'تسجيلات',
    empty: 'لا توجد فعاليات مطابقة.',
    formDescription: 'انشئ فعالية باستخدام الحقول الموجودة في قاعدة البيانات فقط.',
    required: 'الاسم وتاريخ البداية مطلوبان.',
    saved: 'تم حفظ الفعالية.',
    deleted: 'تم حذف الفعالية.',
    loadError: 'تعذر تحميل الفعاليات.',
    saveError: 'تعذر حفظ الفعالية.',
    deleteError: 'تعذر حذف الفعالية. اذا كان لها تسجيلات، يجب ابقاؤها محفوظة.',
    deleteConfirm: 'سيتم حذف الفعالية فقط اذا لم تكن لها تسجيلات.',
    types: { university: 'جامعة', club: 'ناد', training: 'تدريب', competition: 'مسابقة', workshop: 'ورشة', conference: 'مؤتمر', other: 'اخرى' },
  },
  fr: {
    allTypes: 'Tous les types',
    allUniversities: 'Toutes les universites',
    noUniversity: 'Sans universite',
    noClub: 'Sans club',
    club: 'Club',
    startsAt: 'Debut',
    endsAt: 'Fin',
    registrations: 'inscriptions',
    empty: 'Aucun evenement ne correspond.',
    formDescription: 'Creez un evenement avec les champs presents dans la base.',
    required: 'Le nom et la date de debut sont obligatoires.',
    saved: 'Evenement enregistre.',
    deleted: 'Evenement supprime.',
    loadError: 'Impossible de charger les evenements.',
    saveError: 'Impossible d enregistrer l evenement.',
    deleteError: 'Impossible de supprimer l evenement. S il a des inscriptions, il doit rester conserve.',
    deleteConfirm: 'Cet evenement sera supprime uniquement s il n a aucune inscription.',
    types: { university: 'Universite', club: 'Club', training: 'Formation', competition: 'Concours', workshop: 'Atelier', conference: 'Conference', other: 'Autre' },
  },
} as const;

function localDateTime(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function readableDateTime(value: string) {
  return new Date(value).toLocaleString();
}

function errorMessage(err: unknown, fallback: string) {
  return (err as { data?: { error?: { message?: string } } })?.data?.error?.message ?? fallback;
}

export default function AdminEvents() {
  const { t, lang } = useAdminI18n();
  const c = copy[lang];
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState(ALL);
  const [universityFilter, setUniversityFilter] = useState(ALL);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AdminEvent | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminEvent | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const params: ListAdminEventsParams = {
    type: typeFilter === ALL ? undefined : typeFilter as ListAdminEventsParams['type'],
    universityId: universityFilter === ALL ? undefined : universityFilter,
    search: search.trim() || undefined,
  };
  const eventsQuery = useListAdminEvents(params);
  const universitiesQuery = useListAdminUniversities();
  const clubsQuery = useListAdminClubs();
  const events = eventsQuery.data?.data ?? [];
  const universities = universitiesQuery.data?.data ?? [];
  const clubs = clubsQuery.data?.data ?? [];
  const createMutation = useCreateAdminEvent();
  const updateMutation = useUpdateAdminEvent();
  const deleteMutation = useDeleteAdminEvent();
  const saving = createMutation.isPending || updateMutation.isPending;
  const invalidate = () => queryClient.invalidateQueries({ queryKey: getListAdminEventsQueryKey(params) });

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEdit(event: AdminEvent) {
    setEditing(event);
    setForm({
      title: event.title,
      description: event.description ?? '',
      type: event.type,
      location: event.location ?? '',
      startDate: localDateTime(event.startDate),
      endDate: localDateTime(event.endDate),
      universityId: event.universityId ?? NONE,
      clubId: event.clubId ?? NONE,
    });
    setDialogOpen(true);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!form.title.trim() || !form.startDate) {
      toast.error(c.required);
      return;
    }
    const payload: CreateAdminEventInput = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      type: form.type as CreateAdminEventInput['type'],
      location: form.location.trim() || null,
      startDate: new Date(form.startDate).toISOString(),
      endDate: form.endDate ? new Date(form.endDate).toISOString() : null,
      universityId: form.universityId === NONE ? null : form.universityId,
      clubId: form.clubId === NONE ? null : form.clubId,
    };
    const onSuccess = () => {
      toast.success(c.saved);
      setDialogOpen(false);
      invalidate();
    };
    const onError = (err: unknown) => toast.error(errorMessage(err, c.saveError));
    if (editing) {
      updateMutation.mutate({ eventId: editing.id, data: payload }, { onSuccess, onError });
    } else {
      createMutation.mutate({ data: payload }, { onSuccess, onError });
    }
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    deleteMutation.mutate(
      { eventId: deleteTarget.id },
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
          <h1 className="text-3xl font-bold text-foreground">{t('events.title')}</h1>
          <Button onClick={openCreate}>{t('events.create')}</Button>
        </div>

        <Card className="mb-6 p-4">
          <div className="grid gap-3 md:grid-cols-3">
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t('common.search')} />
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{c.allTypes}</SelectItem>
                {EVENT_TYPES.map((item) => <SelectItem key={item} value={item}>{c.types[item]}</SelectItem>)}
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

        {eventsQuery.isLoading ? (
          <div className="flex justify-center py-20"><Spinner /></div>
        ) : eventsQuery.isError ? (
          <Card className="p-12 text-center"><p className="text-destructive">{c.loadError}</p></Card>
        ) : events.length > 0 ? (
          <div className="space-y-3">
            {events.map((item) => (
              <Card key={item.id} className="p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-foreground">{item.title}</h3>
                      <span className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">{c.types[item.type]}</span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{item.location || item.universityName || item.clubName || '-'}</p>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <span className="rounded-md bg-muted px-2 py-1">{readableDateTime(item.startDate)}</span>
                      {item.endDate ? <span className="rounded-md bg-muted px-2 py-1">{readableDateTime(item.endDate)}</span> : null}
                      <span className="rounded-md bg-muted px-2 py-1">{item.registrationCount} {c.registrations}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => openEdit(item)}>{t('common.edit')}</Button>
                    <Button variant="destructive" size="sm" onClick={() => setDeleteTarget(item)}>{t('common.delete')}</Button>
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
            <DialogTitle>{editing ? t('events.edit') : t('events.create')}</DialogTitle>
            <DialogDescription>{c.formDescription}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="grid gap-2">
                <Label>{t('events.name')}</Label>
                <Input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} />
              </div>
              <div className="grid gap-2">
                <Label>{t('opportunities.type')}</Label>
                <Select value={form.type} onValueChange={(value) => setForm((current) => ({ ...current, type: value }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {EVENT_TYPES.map((item) => <SelectItem key={item} value={item}>{c.types[item]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="grid gap-2">
                <Label>{c.startsAt}</Label>
                <Input type="datetime-local" value={form.startDate} onChange={(event) => setForm((current) => ({ ...current, startDate: event.target.value }))} />
              </div>
              <div className="grid gap-2">
                <Label>{c.endsAt}</Label>
                <Input type="datetime-local" value={form.endDate} onChange={(event) => setForm((current) => ({ ...current, endDate: event.target.value }))} />
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="grid gap-2">
                <Label>{t('events.location')}</Label>
                <Input value={form.location} onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))} />
              </div>
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
                <Label>{c.club}</Label>
                <Select value={form.clubId} onValueChange={(value) => setForm((current) => ({ ...current, clubId: value }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>{c.noClub}</SelectItem>
                    {clubs.map((club) => <SelectItem key={club.id} value={club.id}>{club.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label>{t('events.description')}</Label>
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
