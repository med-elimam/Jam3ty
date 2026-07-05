import { useState, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ExternalLink } from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import { useAdminI18n } from '@/contexts/AdminI18nContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Spinner } from '@/components/ui/spinner';
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
  getListAdminOpportunitiesQueryKey,
  useCreateAdminOpportunity,
  useDeleteAdminOpportunity,
  useListAdminOpportunities,
  useUpdateAdminOpportunity,
} from '@workspace/api-client-react';
import type { AdminOpportunity, CreateAdminOpportunityInput, ListAdminOpportunitiesParams } from '@workspace/api-client-react';

const ALL = '__all__';
const TYPES = ['internship', 'job', 'training', 'scholarship', 'competition', 'hackathon', 'freelance', 'volunteering'] as const;
const STATUSES = ['active', 'closed'] as const;

const EMPTY_FORM = {
  title: '',
  organization: '',
  type: 'training',
  description: '',
  location: '',
  deadline: '',
  link: '',
  targetInfo: '',
  isFeatured: false,
  status: 'active',
};

const copy = {
  ar: {
    organization: 'الجهة',
    location: 'المكان',
    link: 'الرابط',
    targetInfo: 'الفئة المستهدفة',
    allTypes: 'كل الأنواع',
    allStatuses: 'كل الحالات',
    empty: 'لا توجد فرص مطابقة.',
    formDescription: 'أضف فرصة حقيقية للطلاب باستخدام الحقول الموجودة في قاعدة البيانات.',
    required: 'العنوان والجهة والنوع والوصف مطلوبة.',
    saved: 'تم حفظ الفرصة.',
    deleted: 'تم حذف الفرصة.',
    loadError: 'تعذر تحميل الفرص.',
    saveError: 'تعذر حفظ الفرصة.',
    deleteError: 'تعذر حذف الفرصة.',
    open: 'فتح',
    statuses: { active: 'نشطة', closed: 'مغلقة' },
    types: {
      internship: 'تدريب',
      job: 'وظيفة',
      training: 'تكوين',
      scholarship: 'منحة',
      competition: 'مسابقة',
      hackathon: 'هاكاثون',
      freelance: 'عمل حر',
      volunteering: 'تطوع',
    },
  },
  fr: {
    organization: 'Organisation',
    location: 'Lieu',
    link: 'Lien',
    targetInfo: 'Public cible',
    allTypes: 'Tous les types',
    allStatuses: 'Tous les statuts',
    empty: 'Aucune opportunité ne correspond.',
    formDescription: 'Ajoutez une vraie opportunité étudiante avec les champs existants en base.',
    required: 'Le titre, l’organisation, le type et la description sont obligatoires.',
    saved: 'Opportunité enregistrée.',
    deleted: 'Opportunité supprimée.',
    loadError: 'Impossible de charger les opportunités.',
    saveError: 'Impossible d’enregistrer l’opportunité.',
    deleteError: 'Impossible de supprimer l’opportunité.',
    open: 'Ouvrir',
    statuses: { active: 'Active', closed: 'Fermée' },
    types: {
      internship: 'Stage',
      job: 'Emploi',
      training: 'Formation',
      scholarship: 'Bourse',
      competition: 'Concours',
      hackathon: 'Hackathon',
      freelance: 'Freelance',
      volunteering: 'Volontariat',
    },
  },
} as const;

function errorMessage(err: unknown, fallback: string) {
  return (err as { data?: { error?: { message?: string } } })?.data?.error?.message ?? fallback;
}

export default function AdminOpportunities() {
  const { t, lang } = useAdminI18n();
  const c = copy[lang];
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState(ALL);
  const [statusFilter, setStatusFilter] = useState(ALL);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AdminOpportunity | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const params: ListAdminOpportunitiesParams = {
    type: typeFilter === ALL ? undefined : typeFilter as ListAdminOpportunitiesParams['type'],
    status: statusFilter === ALL ? undefined : statusFilter,
    search: search.trim() || undefined,
  };
  const opportunitiesQuery = useListAdminOpportunities(params);
  const opportunities = opportunitiesQuery.data?.data ?? [];
  const createMutation = useCreateAdminOpportunity();
  const updateMutation = useUpdateAdminOpportunity();
  const deleteMutation = useDeleteAdminOpportunity();
  const saving = createMutation.isPending || updateMutation.isPending;
  const invalidate = () => queryClient.invalidateQueries({ queryKey: getListAdminOpportunitiesQueryKey(params) });

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEdit(item: AdminOpportunity) {
    setEditing(item);
    setForm({
      title: item.title,
      organization: item.organization,
      type: item.type,
      description: item.description,
      location: item.location ?? '',
      deadline: item.deadline ?? '',
      link: item.link ?? '',
      targetInfo: item.targetInfo ?? '',
      isFeatured: item.isFeatured,
      status: item.status || 'active',
    });
    setDialogOpen(true);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!form.title.trim() || !form.organization.trim() || !form.type || !form.description.trim()) {
      toast.error(c.required);
      return;
    }
    const payload: CreateAdminOpportunityInput = {
      title: form.title.trim(),
      organization: form.organization.trim(),
      type: form.type as CreateAdminOpportunityInput['type'],
      description: form.description.trim(),
      location: form.location.trim() || null,
      deadline: form.deadline.trim() || null,
      link: form.link.trim() || null,
      targetInfo: form.targetInfo.trim() || null,
      isFeatured: form.isFeatured,
      status: form.status,
    };
    const onSuccess = () => {
      toast.success(c.saved);
      setDialogOpen(false);
      invalidate();
    };
    const onError = (err: unknown) => toast.error(errorMessage(err, c.saveError));
    if (editing) {
      updateMutation.mutate({ opportunityId: editing.id, data: payload }, { onSuccess, onError });
    } else {
      createMutation.mutate({ data: payload }, { onSuccess, onError });
    }
  }

  function deleteOpportunity(item: AdminOpportunity) {
    deleteMutation.mutate(
      { opportunityId: item.id },
      { onSuccess: () => { toast.success(c.deleted); invalidate(); }, onError: (err) => toast.error(errorMessage(err, c.deleteError)) },
    );
  }

  return (
    <AdminLayout>
      <div className="mx-auto max-w-7xl p-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-3xl font-bold text-foreground">{t('opportunities.title')}</h1>
          <Button onClick={openCreate}>{t('opportunities.create')}</Button>
        </div>

        <Card className="mb-6 p-4">
          <div className="grid gap-3 md:grid-cols-3">
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t('common.search')} />
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{c.allTypes}</SelectItem>
                {TYPES.map((item) => <SelectItem key={item} value={item}>{c.types[item]}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{c.allStatuses}</SelectItem>
                {STATUSES.map((item) => <SelectItem key={item} value={item}>{c.statuses[item]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </Card>

        {opportunitiesQuery.isLoading ? (
          <div className="flex justify-center py-20"><Spinner /></div>
        ) : opportunitiesQuery.isError ? (
          <Card className="p-12 text-center"><p className="text-destructive">{c.loadError}</p></Card>
        ) : opportunities.length > 0 ? (
          <div className="space-y-3">
            {opportunities.map((item) => (
              <Card key={item.id} className="p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-foreground">{item.title}</h3>
                      <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">{c.types[item.type]}</span>
                      <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">{item.status}</span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{[item.organization, item.location, item.deadline].filter(Boolean).join(' · ')}</p>
                    <p className="mt-2 line-clamp-2 text-sm text-foreground">{item.description}</p>
                  </div>
                  <div className="flex flex-wrap gap-2 lg:shrink-0">
                    {item.link ? (
                      <Button variant="outline" size="sm" asChild>
                        <a href={item.link} target="_blank" rel="noreferrer"><ExternalLink className="me-2 h-4 w-4" />{c.open}</a>
                      </Button>
                    ) : null}
                    <Button variant="outline" size="sm" onClick={() => openEdit(item)}>{t('common.edit')}</Button>
                    <Button variant="outline" size="sm" className="text-destructive" onClick={() => deleteOpportunity(item)}>{t('common.delete')}</Button>
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
              <DialogTitle>{editing ? t('opportunities.edit') : t('opportunities.create')}</DialogTitle>
              <DialogDescription>{c.formDescription}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>{t('opportunities.fieldTitle')}</Label>
                  <Input value={form.title} onChange={(event) => setForm((f) => ({ ...f, title: event.target.value }))} disabled={saving} />
                </div>
                <div>
                  <Label>{c.organization}</Label>
                  <Input value={form.organization} onChange={(event) => setForm((f) => ({ ...f, organization: event.target.value }))} disabled={saving} />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>{t('opportunities.type')}</Label>
                  <Select value={form.type} onValueChange={(value) => setForm((f) => ({ ...f, type: value }))} disabled={saving}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{TYPES.map((item) => <SelectItem key={item} value={item}>{c.types[item]}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{t('subscriptions.status')}</Label>
                  <Select value={form.status} onValueChange={(value) => setForm((f) => ({ ...f, status: value }))} disabled={saving}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{STATUSES.map((item) => <SelectItem key={item} value={item}>{c.statuses[item]}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>{c.location}</Label>
                  <Input value={form.location} onChange={(event) => setForm((f) => ({ ...f, location: event.target.value }))} disabled={saving} />
                </div>
                <div>
                  <Label>{t('opportunities.deadline')}</Label>
                  <Input value={form.deadline} onChange={(event) => setForm((f) => ({ ...f, deadline: event.target.value }))} disabled={saving} />
                </div>
              </div>
              <div>
                <Label>{c.link}</Label>
                <Input value={form.link} onChange={(event) => setForm((f) => ({ ...f, link: event.target.value }))} disabled={saving} dir="ltr" />
              </div>
              <div>
                <Label>{c.targetInfo}</Label>
                <Input value={form.targetInfo} onChange={(event) => setForm((f) => ({ ...f, targetInfo: event.target.value }))} disabled={saving} />
              </div>
              <div>
                <Label>{t('opportunities.description')}</Label>
                <Textarea value={form.description} onChange={(event) => setForm((f) => ({ ...f, description: event.target.value }))} disabled={saving} />
              </div>
              <div className="flex items-center justify-between rounded-md border border-border px-4 py-3">
                <Label>{t('opportunities.featured')}</Label>
                <Switch checked={form.isFeatured} onCheckedChange={(checked) => setForm((f) => ({ ...f, isFeatured: checked }))} disabled={saving} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>{t('common.cancel')}</Button>
              <Button type="submit" disabled={saving}>{saving ? <Spinner className="me-2 h-4 w-4" /> : null}{t('common.save')}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
