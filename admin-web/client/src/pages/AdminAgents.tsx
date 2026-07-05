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
  getListAdminAgentsQueryKey,
  useCreateAdminAgent,
  useDeleteAdminAgent,
  useListAdminAgents,
  useListAdminUniversities,
  useUpdateAdminAgent,
} from '@workspace/api-client-react';
import type { AdminAgent, CreateAdminAgentInput, ListAdminAgentsParams } from '@workspace/api-client-react';

const ALL = '__all__';
const NO_UNIVERSITY = '__none__';
const STATUSES = ['active', 'suspended', 'inactive'] as const;

const EMPTY_FORM = {
  name: '',
  phone: '',
  email: '',
  universityId: NO_UNIVERSITY,
  city: 'Nouakchott',
  commissionRate: '20',
  status: 'active',
};

const copy = {
  ar: {
    allStatuses: 'كل الحالات',
    allUniversities: 'كل الجامعات',
    noUniversity: 'بدون جامعة',
    city: 'المدينة',
    commissionRate: 'نسبة العمولة',
    activationCodes: 'رموز التفعيل',
    commissions: 'العمولات',
    empty: 'لا يوجد وكلاء مطابقون.',
    formDescription: 'أنشئ أو عدّل وكيل تفعيل حقيقي مرتبطًا بالجداول الحالية.',
    required: 'الاسم والهاتف مطلوبان.',
    invalidCommission: 'نسبة العمولة يجب أن تكون بين 0 و 100.',
    saved: 'تم حفظ الوكيل.',
    deleted: 'تم حذف الوكيل.',
    loadError: 'تعذر تحميل الوكلاء.',
    saveError: 'تعذر حفظ الوكيل.',
    deleteError: 'تعذر حذف الوكيل. إذا كان مرتبطًا برموز أو عمولات، قم بتعليقه بدلًا من الحذف.',
    statuses: { active: 'نشط', suspended: 'معلّق', inactive: 'غير نشط' },
  },
  fr: {
    allStatuses: 'Tous les statuts',
    allUniversities: 'Toutes les universités',
    noUniversity: 'Sans université',
    city: 'Ville',
    commissionRate: 'Commission',
    activationCodes: 'codes d’activation',
    commissions: 'commissions',
    empty: 'Aucun agent ne correspond.',
    formDescription: 'Créez ou modifiez un vrai agent d’activation selon les tables existantes.',
    required: 'Le nom et le téléphone sont obligatoires.',
    invalidCommission: 'La commission doit être entre 0 et 100.',
    saved: 'Agent enregistré.',
    deleted: 'Agent supprimé.',
    loadError: 'Impossible de charger les agents.',
    saveError: 'Impossible d’enregistrer l’agent.',
    deleteError: 'Impossible de supprimer l’agent. S’il a des codes ou commissions, suspendez-le plutôt.',
    statuses: { active: 'Actif', suspended: 'Suspendu', inactive: 'Inactif' },
  },
} as const;

function errorMessage(err: unknown, fallback: string) {
  return (err as { data?: { error?: { message?: string } } })?.data?.error?.message ?? fallback;
}

export default function AdminAgents() {
  const { t, lang } = useAdminI18n();
  const c = copy[lang];
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState(ALL);
  const [universityFilter, setUniversityFilter] = useState(ALL);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AdminAgent | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const params: ListAdminAgentsParams = {
    status: status === ALL ? undefined : status as ListAdminAgentsParams['status'],
    universityId: universityFilter === ALL ? undefined : universityFilter,
    search: search.trim() || undefined,
  };
  const agentsQuery = useListAdminAgents(params);
  const universitiesQuery = useListAdminUniversities();
  const agents = agentsQuery.data?.data ?? [];
  const universities = universitiesQuery.data?.data ?? [];
  const createMutation = useCreateAdminAgent();
  const updateMutation = useUpdateAdminAgent();
  const deleteMutation = useDeleteAdminAgent();
  const saving = createMutation.isPending || updateMutation.isPending;
  const invalidate = () => queryClient.invalidateQueries({ queryKey: getListAdminAgentsQueryKey(params) });

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEdit(agent: AdminAgent) {
    setEditing(agent);
    setForm({
      name: agent.name,
      phone: agent.phone,
      email: agent.email ?? '',
      universityId: agent.universityId ?? NO_UNIVERSITY,
      city: agent.city,
      commissionRate: String(agent.commissionRate),
      status: agent.status,
    });
    setDialogOpen(true);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) {
      toast.error(c.required);
      return;
    }
    const commissionRate = Number(form.commissionRate);
    if (!Number.isInteger(commissionRate) || commissionRate < 0 || commissionRate > 100) {
      toast.error(c.invalidCommission);
      return;
    }
    const payload: CreateAdminAgentInput = {
      name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim() || null,
      universityId: form.universityId === NO_UNIVERSITY ? null : form.universityId,
      city: form.city.trim() || 'Nouakchott',
      commissionRate,
      status: form.status as CreateAdminAgentInput['status'],
    };
    const onSuccess = () => {
      toast.success(c.saved);
      setDialogOpen(false);
      invalidate();
    };
    const onError = (err: unknown) => toast.error(errorMessage(err, c.saveError));
    if (editing) {
      updateMutation.mutate({ agentId: editing.id, data: payload }, { onSuccess, onError });
    } else {
      createMutation.mutate({ data: payload }, { onSuccess, onError });
    }
  }

  function deleteAgent(agent: AdminAgent) {
    deleteMutation.mutate(
      { agentId: agent.id },
      { onSuccess: () => { toast.success(c.deleted); invalidate(); }, onError: (err) => toast.error(errorMessage(err, c.deleteError)) },
    );
  }

  return (
    <AdminLayout>
      <div className="mx-auto max-w-7xl p-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-3xl font-bold text-foreground">{t('agents.title')}</h1>
          <Button onClick={openCreate}>{t('agents.create')}</Button>
        </div>

        <Card className="mb-6 p-4">
          <div className="grid gap-3 md:grid-cols-3">
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t('common.search')} />
            <Select value={status} onValueChange={setStatus}>
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

        {agentsQuery.isLoading ? (
          <div className="flex justify-center py-20"><Spinner /></div>
        ) : agentsQuery.isError ? (
          <Card className="p-12 text-center"><p className="text-destructive">{c.loadError}</p></Card>
        ) : agents.length > 0 ? (
          <div className="space-y-3">
            {agents.map((agent) => (
              <Card key={agent.id} className="p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-foreground">{agent.name}</h3>
                      <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">{c.statuses[agent.status]}</span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {[agent.phone, agent.email, agent.city, agent.universityName].filter(Boolean).join(' · ')}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {agent.commissionRate}% · {agent.activationCodeCount} {c.activationCodes} · {agent.commissionCount} {c.commissions}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 lg:shrink-0">
                    <Button variant="outline" size="sm" onClick={() => openEdit(agent)}>{t('common.edit')}</Button>
                    <Button variant="outline" size="sm" className="text-destructive" onClick={() => deleteAgent(agent)}>{t('common.delete')}</Button>
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
        <DialogContent>
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>{editing ? t('agents.edit') : t('agents.create')}</DialogTitle>
              <DialogDescription>{c.formDescription}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>{t('agents.name')}</Label>
                  <Input value={form.name} onChange={(event) => setForm((f) => ({ ...f, name: event.target.value }))} disabled={saving} />
                </div>
                <div>
                  <Label>{t('agents.phone')}</Label>
                  <Input value={form.phone} onChange={(event) => setForm((f) => ({ ...f, phone: event.target.value }))} disabled={saving} dir="ltr" />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>{t('agents.email')}</Label>
                  <Input value={form.email} onChange={(event) => setForm((f) => ({ ...f, email: event.target.value }))} disabled={saving} dir="ltr" />
                </div>
                <div>
                  <Label>{c.city}</Label>
                  <Input value={form.city} onChange={(event) => setForm((f) => ({ ...f, city: event.target.value }))} disabled={saving} />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>{c.commissionRate}</Label>
                  <Input type="number" min="0" max="100" value={form.commissionRate} onChange={(event) => setForm((f) => ({ ...f, commissionRate: event.target.value }))} disabled={saving} dir="ltr" />
                </div>
                <div>
                  <Label>{t('subscriptions.status')}</Label>
                  <Select value={form.status} onValueChange={(value) => setForm((f) => ({ ...f, status: value }))} disabled={saving}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{STATUSES.map((item) => <SelectItem key={item} value={item}>{c.statuses[item]}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>{t('nav.universities')}</Label>
                <Select value={form.universityId} onValueChange={(value) => setForm((f) => ({ ...f, universityId: value }))} disabled={saving}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_UNIVERSITY}>{c.noUniversity}</SelectItem>
                    {universities.map((university) => <SelectItem key={university.id} value={university.id}>{university.name}</SelectItem>)}
                  </SelectContent>
                </Select>
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
