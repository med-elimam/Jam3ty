import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
  useListAdminUniversities,
  useCreateAdminUniversity,
  useUpdateAdminUniversity,
  useDeleteAdminUniversity,
  getListAdminUniversitiesQueryKey,
} from '@workspace/api-client-react';
import type { University, CreateUniversityInput } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';

type UniversityStatus = 'community_created' | 'verified' | 'official_partner';

const STATUS_KEYS: Record<UniversityStatus, string> = {
  community_created: 'universities.communityCreated',
  verified: 'universities.verified',
  official_partner: 'universities.officialPartner',
};

interface FormState {
  name: string;
  nameAr: string;
  nameFr: string;
  city: string;
  logoUrl: string;
  status: UniversityStatus;
}

const EMPTY_FORM: FormState = {
  name: '',
  nameAr: '',
  nameFr: '',
  city: '',
  logoUrl: '',
  status: 'community_created',
};

function extractErrorMessage(err: unknown, fallback: string): string {
  const data = (err as { data?: { error?: { message?: string } } })?.data;
  return data?.error?.message ?? fallback;
}

export default function AdminUniversities() {
  const { t } = useAdminI18n();
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch } = useListAdminUniversities();
  const universities = data?.data ?? [];

  const createMutation = useCreateAdminUniversity();
  const updateMutation = useUpdateAdminUniversity();
  const deleteMutation = useDeleteAdminUniversity();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<University | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<University | null>(null);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: getListAdminUniversitiesQueryKey() });

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (uni: University) => {
    setEditing(uni);
    setForm({
      name: uni.name ?? '',
      nameAr: uni.nameAr ?? '',
      nameFr: uni.nameFr ?? '',
      city: uni.city ?? '',
      logoUrl: uni.logoUrl ?? '',
      status: (uni.status as UniversityStatus) ?? 'community_created',
    });
    setDialogOpen(true);
  };

  const saving = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error(t('universities.nameRequired'));
      return;
    }
    const payload: CreateUniversityInput = {
      name: form.name.trim(),
      nameAr: form.nameAr.trim() || null,
      nameFr: form.nameFr.trim() || null,
      city: form.city.trim() || null,
      logoUrl: form.logoUrl.trim() || null,
      status: form.status,
    };

    if (editing) {
      updateMutation.mutate(
        { universityId: editing.id, data: payload },
        {
          onSuccess: () => {
            toast.success(t('universities.updated'));
            setDialogOpen(false);
            invalidate();
          },
          onError: (err) => toast.error(extractErrorMessage(err, t('universities.saveError'))),
        },
      );
    } else {
      createMutation.mutate(
        { data: payload },
        {
          onSuccess: () => {
            toast.success(t('universities.created'));
            setDialogOpen(false);
            invalidate();
          },
          onError: (err) => toast.error(extractErrorMessage(err, t('universities.saveError'))),
        },
      );
    }
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate(
      { universityId: deleteTarget.id },
      {
        onSuccess: () => {
          toast.success(t('universities.deleted'));
          setDeleteTarget(null);
          invalidate();
        },
        onError: (err) => {
          toast.error(extractErrorMessage(err, t('universities.deleteError')));
          setDeleteTarget(null);
        },
      },
    );
  };

  return (
    <AdminLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">{t('universities.title')}</h1>
          <Button onClick={openCreate}>{t('universities.create')}</Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Spinner />
          </div>
        ) : isError ? (
          <Card className="p-12 text-center">
            <p className="text-red-600 mb-4">{t('universities.loadError')}</p>
            <Button variant="outline" onClick={() => refetch()}>
              {t('common.search')}
            </Button>
          </Card>
        ) : universities.length > 0 ? (
          <div className="space-y-4">
            {universities.map((uni) => (
              <Card key={uni.id} className="p-6 flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-gray-900">{uni.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {t('universities.status')}: {t(STATUS_KEYS[uni.status as UniversityStatus] ?? '')} · {uni.city}
                    {typeof uni.facultyCount === 'number'
                      ? ` · ${t('universities.faculties')}: ${uni.facultyCount}`
                      : ''}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => openEdit(uni)}>
                    {t('common.edit')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600"
                    onClick={() => setDeleteTarget(uni)}
                  >
                    {t('common.delete')}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-12 text-center">
            <p className="text-gray-500">{t('common.noData')}</p>
          </Card>
        )}
      </div>

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>
                {editing ? t('universities.edit') : t('universities.create')}
              </DialogTitle>
              <DialogDescription>{t('universities.title')}</DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="uni-name">{t('universities.name')}</Label>
                <Input
                  id="uni-name"
                  value={form.name}
                  placeholder={t('universities.namePlaceholder')}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  disabled={saving}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="uni-nameAr">{t('universities.nameAr')}</Label>
                  <Input
                    id="uni-nameAr"
                    value={form.nameAr}
                    onChange={(e) => setForm((f) => ({ ...f, nameAr: e.target.value }))}
                    disabled={saving}
                  />
                </div>
                <div>
                  <Label htmlFor="uni-nameFr">{t('universities.nameFr')}</Label>
                  <Input
                    id="uni-nameFr"
                    value={form.nameFr}
                    onChange={(e) => setForm((f) => ({ ...f, nameFr: e.target.value }))}
                    disabled={saving}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="uni-city">{t('universities.city')}</Label>
                <Input
                  id="uni-city"
                  value={form.city}
                  onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                  disabled={saving}
                />
              </div>
              <div>
                <Label htmlFor="uni-logo">{t('universities.logoUrl')}</Label>
                <Input
                  id="uni-logo"
                  value={form.logoUrl}
                  onChange={(e) => setForm((f) => ({ ...f, logoUrl: e.target.value }))}
                  disabled={saving}
                />
              </div>
              <div>
                <Label>{t('universities.status')}</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => setForm((f) => ({ ...f, status: v as UniversityStatus }))}
                  disabled={saving}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(STATUS_KEYS) as UniversityStatus[]).map((s) => (
                      <SelectItem key={s} value={s}>
                        {t(STATUS_KEYS[s])}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={saving}
              >
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? <Spinner className="mr-2 h-4 w-4" /> : null}
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
            <AlertDialogTitle>{t('universities.delete')}</AlertDialogTitle>
            <AlertDialogDescription>{t('universities.deleteConfirm')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              {t('common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                confirmDelete();
              }}
              disabled={deleteMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
