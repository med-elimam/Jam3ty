import { useState, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import AdminLayout from '@/components/AdminLayout';
import { useAdminI18n } from '@/contexts/AdminI18nContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  getListAdminSubscriptionPlansQueryKey,
  getListAdminSubscriptionsQueryKey,
  useCreateAdminSubscriptionPlan,
  useListAdminSubscriptionPlans,
  useListAdminSubscriptions,
  useUpdateAdminSubscription,
  useUpdateAdminSubscriptionPlan,
} from '@workspace/api-client-react';
import type {
  AdminSubscription,
  AdminSubscriptionPlan,
  CreateAdminSubscriptionPlanInput,
  ListAdminSubscriptionsParams,
  UpdateAdminSubscriptionInput,
} from '@workspace/api-client-react';

const ALL = '__all__';
const STATUSES = ['active', 'expired', 'cancelled'] as const;

const EMPTY_PLAN_FORM = {
  name: '',
  nameAr: '',
  nameFr: '',
  priceMru: '',
  durationDays: '',
  features: '',
  isActive: true,
};

const copy = {
  ar: {
    allStatuses: 'كل الحالات',
    allPlans: 'كل الخطط',
    source: 'المصدر',
    expiresAt: 'ينتهي في',
    daysRemaining: 'ايام متبقية',
    activePlan: 'خطة نشطة',
    inactivePlan: 'خطة غير نشطة',
    features: 'المزايا',
    createPlan: 'انشاء خطة',
    editPlan: 'تعديل خطة',
    editSubscription: 'تعديل اشتراك',
    emptySubscriptions: 'لا توجد اشتراكات مطابقة.',
    emptyPlans: 'لا توجد خطط اشتراك.',
    formDescription: 'يمكن تعديل الحالة والخطة وتاريخ الانتهاء فقط حسب الحقول الموجودة.',
    planDescription: 'انشئ او عدل خطة اشتراك حقيقية. المزايا تكتب كسطر لكل ميزة.',
    requiredPlan: 'اسم الخطة والسعر والمدة مطلوبة.',
    invalidPlan: 'السعر والمدة يجب ان يكونا ارقاما صحيحة.',
    saved: 'تم الحفظ.',
    loadError: 'تعذر تحميل الاشتراكات.',
    planLoadError: 'تعذر تحميل الخطط.',
    saveError: 'تعذر الحفظ.',
    statuses: { active: 'نشط', expired: 'منتهي', cancelled: 'ملغى' },
  },
  fr: {
    allStatuses: 'Tous les statuts',
    allPlans: 'Tous les plans',
    source: 'Source',
    expiresAt: 'Expire le',
    daysRemaining: 'jours restants',
    activePlan: 'Plan actif',
    inactivePlan: 'Plan inactif',
    features: 'Fonctionnalites',
    createPlan: 'Creer un plan',
    editPlan: 'Modifier le plan',
    editSubscription: 'Modifier l abonnement',
    emptySubscriptions: 'Aucun abonnement ne correspond.',
    emptyPlans: 'Aucun plan d abonnement.',
    formDescription: 'Seuls le statut, le plan et la date d expiration sont modifiables selon le schema.',
    planDescription: 'Creez ou modifiez un vrai plan. Une fonctionnalite par ligne.',
    requiredPlan: 'Le nom, le prix et la duree sont obligatoires.',
    invalidPlan: 'Le prix et la duree doivent etre des nombres entiers.',
    saved: 'Enregistre.',
    loadError: 'Impossible de charger les abonnements.',
    planLoadError: 'Impossible de charger les plans.',
    saveError: 'Impossible d enregistrer.',
    statuses: { active: 'Actif', expired: 'Expire', cancelled: 'Annule' },
  },
} as const;

function localDateTime(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function readableDate(value: string) {
  return new Date(value).toLocaleDateString();
}

function errorMessage(err: unknown, fallback: string) {
  return (err as { data?: { error?: { message?: string } } })?.data?.error?.message ?? fallback;
}

export default function AdminSubscriptions() {
  const { t, lang } = useAdminI18n();
  const c = copy[lang];
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState(ALL);
  const [planFilter, setPlanFilter] = useState(ALL);
  const [editingSubscription, setEditingSubscription] = useState<AdminSubscription | null>(null);
  const [subscriptionForm, setSubscriptionForm] = useState({ status: 'active', planId: '', expiresAt: '' });
  const [editingPlan, setEditingPlan] = useState<AdminSubscriptionPlan | null>(null);
  const [planDialogOpen, setPlanDialogOpen] = useState(false);
  const [planForm, setPlanForm] = useState(EMPTY_PLAN_FORM);

  const params: ListAdminSubscriptionsParams = {
    status: statusFilter === ALL ? undefined : statusFilter as ListAdminSubscriptionsParams['status'],
    planId: planFilter === ALL ? undefined : planFilter,
  };
  const subscriptionsQuery = useListAdminSubscriptions(params);
  const plansQuery = useListAdminSubscriptionPlans();
  const subscriptions = subscriptionsQuery.data?.data ?? [];
  const plans = plansQuery.data?.data ?? [];
  const updateSubscriptionMutation = useUpdateAdminSubscription();
  const createPlanMutation = useCreateAdminSubscriptionPlan();
  const updatePlanMutation = useUpdateAdminSubscriptionPlan();
  const savingSubscription = updateSubscriptionMutation.isPending;
  const savingPlan = createPlanMutation.isPending || updatePlanMutation.isPending;

  const invalidateSubscriptions = () => queryClient.invalidateQueries({ queryKey: getListAdminSubscriptionsQueryKey(params) });
  const invalidatePlans = () => queryClient.invalidateQueries({ queryKey: getListAdminSubscriptionPlansQueryKey() });

  function openSubscription(sub: AdminSubscription) {
    setEditingSubscription(sub);
    setSubscriptionForm({
      status: sub.status,
      planId: sub.planId,
      expiresAt: localDateTime(sub.expiresAt),
    });
  }

  function saveSubscription(event: FormEvent) {
    event.preventDefault();
    if (!editingSubscription) return;
    const payload: UpdateAdminSubscriptionInput = {
      status: subscriptionForm.status as UpdateAdminSubscriptionInput['status'],
      planId: subscriptionForm.planId,
      expiresAt: subscriptionForm.expiresAt ? new Date(subscriptionForm.expiresAt).toISOString() : undefined,
    };
    updateSubscriptionMutation.mutate(
      { subscriptionId: editingSubscription.id, data: payload },
      {
        onSuccess: () => {
          toast.success(c.saved);
          setEditingSubscription(null);
          invalidateSubscriptions();
        },
        onError: (err) => toast.error(errorMessage(err, c.saveError)),
      },
    );
  }

  function openCreatePlan() {
    setEditingPlan(null);
    setPlanForm(EMPTY_PLAN_FORM);
    setPlanDialogOpen(true);
  }

  function openEditPlan(plan: AdminSubscriptionPlan) {
    setEditingPlan(plan);
    setPlanForm({
      name: plan.name,
      nameAr: plan.nameAr ?? '',
      nameFr: plan.nameFr ?? '',
      priceMru: String(plan.priceMru),
      durationDays: String(plan.durationDays),
      features: plan.features.join('\n'),
      isActive: plan.isActive,
    });
    setPlanDialogOpen(true);
  }

  function savePlan(event: FormEvent) {
    event.preventDefault();
    if (!planForm.name.trim() || !planForm.priceMru || !planForm.durationDays) {
      toast.error(c.requiredPlan);
      return;
    }
    const priceMru = Number(planForm.priceMru);
    const durationDays = Number(planForm.durationDays);
    if (!Number.isInteger(priceMru) || !Number.isInteger(durationDays) || priceMru < 0 || durationDays <= 0) {
      toast.error(c.invalidPlan);
      return;
    }
    const payload: CreateAdminSubscriptionPlanInput = {
      name: planForm.name.trim(),
      nameAr: planForm.nameAr.trim() || null,
      nameFr: planForm.nameFr.trim() || null,
      priceMru,
      durationDays,
      features: planForm.features.split('\n').map((item) => item.trim()).filter(Boolean),
      isActive: planForm.isActive,
    };
    const onSuccess = () => {
      toast.success(c.saved);
      setPlanDialogOpen(false);
      invalidatePlans();
      invalidateSubscriptions();
    };
    const onError = (err: unknown) => toast.error(errorMessage(err, c.saveError));
    if (editingPlan) {
      updatePlanMutation.mutate({ planId: editingPlan.id, data: payload }, { onSuccess, onError });
    } else {
      createPlanMutation.mutate({ data: payload }, { onSuccess, onError });
    }
  }

  return (
    <AdminLayout>
      <div className="mx-auto max-w-7xl p-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-3xl font-bold text-foreground">{t('subscriptions.title')}</h1>
          <Button onClick={openCreatePlan}>{c.createPlan}</Button>
        </div>

        <Tabs defaultValue="subscriptions" className="space-y-6">
          <TabsList>
            <TabsTrigger value="subscriptions">{t('subscriptions.userSubscriptions')}</TabsTrigger>
            <TabsTrigger value="plans">{t('subscriptions.plans')}</TabsTrigger>
          </TabsList>

          <TabsContent value="subscriptions" className="space-y-4">
            <Card className="p-4">
              <div className="grid gap-3 md:grid-cols-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>{c.allStatuses}</SelectItem>
                    {STATUSES.map((item) => <SelectItem key={item} value={item}>{c.statuses[item]}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={planFilter} onValueChange={setPlanFilter}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>{c.allPlans}</SelectItem>
                    {plans.map((plan) => <SelectItem key={plan.id} value={plan.id}>{plan.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </Card>

            {subscriptionsQuery.isLoading ? (
              <div className="flex justify-center py-20"><Spinner /></div>
            ) : subscriptionsQuery.isError ? (
              <Card className="p-12 text-center"><p className="text-destructive">{c.loadError}</p></Card>
            ) : subscriptions.length > 0 ? (
              <div className="space-y-3">
                {subscriptions.map((sub) => (
                  <Card key={sub.id} className="p-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold text-foreground">{sub.userFullName || sub.userEmail || sub.userId}</h3>
                          <span className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">{c.statuses[sub.status]}</span>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">{sub.planName} - {sub.source}</p>
                        <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                          <span className="rounded-md bg-muted px-2 py-1">{c.expiresAt}: {readableDate(sub.expiresAt)}</span>
                          <span className="rounded-md bg-muted px-2 py-1">{sub.daysRemaining} {c.daysRemaining}</span>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => openSubscription(sub)}>{t('common.edit')}</Button>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="p-12 text-center text-muted-foreground">{c.emptySubscriptions}</Card>
            )}
          </TabsContent>

          <TabsContent value="plans" className="space-y-3">
            {plansQuery.isLoading ? (
              <div className="flex justify-center py-20"><Spinner /></div>
            ) : plansQuery.isError ? (
              <Card className="p-12 text-center"><p className="text-destructive">{c.planLoadError}</p></Card>
            ) : plans.length > 0 ? (
              plans.map((plan) => (
                <Card key={plan.id} className="p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-foreground">{plan.name}</h3>
                        <span className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">{plan.isActive ? c.activePlan : c.inactivePlan}</span>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{plan.priceMru} MRU - {plan.durationDays} {c.daysRemaining}</p>
                      <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{plan.features.join(', ') || '-'}</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => openEditPlan(plan)}>{t('common.edit')}</Button>
                  </div>
                </Card>
              ))
            ) : (
              <Card className="p-12 text-center text-muted-foreground">{c.emptyPlans}</Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={Boolean(editingSubscription)} onOpenChange={(open) => !open && setEditingSubscription(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{c.editSubscription}</DialogTitle>
            <DialogDescription>{c.formDescription}</DialogDescription>
          </DialogHeader>
          <form onSubmit={saveSubscription} className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="grid gap-2">
                <Label>{t('subscriptions.status')}</Label>
                <Select value={subscriptionForm.status} onValueChange={(value) => setSubscriptionForm((current) => ({ ...current, status: value }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((item) => <SelectItem key={item} value={item}>{c.statuses[item]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>{t('subscriptions.plan')}</Label>
                <Select value={subscriptionForm.planId} onValueChange={(value) => setSubscriptionForm((current) => ({ ...current, planId: value }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {plans.map((plan) => <SelectItem key={plan.id} value={plan.id}>{plan.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label>{c.expiresAt}</Label>
              <Input type="datetime-local" value={subscriptionForm.expiresAt} onChange={(event) => setSubscriptionForm((current) => ({ ...current, expiresAt: event.target.value }))} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditingSubscription(null)}>{t('common.cancel')}</Button>
              <Button type="submit" disabled={savingSubscription}>{savingSubscription ? <Spinner className="mr-2 h-4 w-4" /> : null}{t('common.save')}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={planDialogOpen} onOpenChange={setPlanDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingPlan ? c.editPlan : c.createPlan}</DialogTitle>
            <DialogDescription>{c.planDescription}</DialogDescription>
          </DialogHeader>
          <form onSubmit={savePlan} className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="grid gap-2">
                <Label>{t('subscriptions.name')}</Label>
                <Input value={planForm.name} onChange={(event) => setPlanForm((current) => ({ ...current, name: event.target.value }))} />
              </div>
              <div className="grid gap-2">
                <Label>Name AR</Label>
                <Input value={planForm.nameAr} onChange={(event) => setPlanForm((current) => ({ ...current, nameAr: event.target.value }))} />
              </div>
              <div className="grid gap-2">
                <Label>Name FR</Label>
                <Input value={planForm.nameFr} onChange={(event) => setPlanForm((current) => ({ ...current, nameFr: event.target.value }))} />
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="grid gap-2">
                <Label>{t('subscriptions.price')}</Label>
                <Input type="number" min="0" value={planForm.priceMru} onChange={(event) => setPlanForm((current) => ({ ...current, priceMru: event.target.value }))} />
              </div>
              <div className="grid gap-2">
                <Label>{t('subscriptions.duration')}</Label>
                <Input type="number" min="1" value={planForm.durationDays} onChange={(event) => setPlanForm((current) => ({ ...current, durationDays: event.target.value }))} />
              </div>
              <div className="flex items-center justify-between rounded-md border p-3">
                <Label>{c.activePlan}</Label>
                <Switch checked={planForm.isActive} onCheckedChange={(checked) => setPlanForm((current) => ({ ...current, isActive: checked }))} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>{c.features}</Label>
              <Textarea value={planForm.features} onChange={(event) => setPlanForm((current) => ({ ...current, features: event.target.value }))} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setPlanDialogOpen(false)}>{t('common.cancel')}</Button>
              <Button type="submit" disabled={savingPlan}>{savingPlan ? <Spinner className="mr-2 h-4 w-4" /> : null}{t('common.save')}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
