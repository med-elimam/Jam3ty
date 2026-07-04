import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Switch } from '@/components/ui/switch';
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
import { useAdminI18n } from '@/contexts/AdminI18nContext';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import AdminLayout from '@/components/AdminLayout';
import { toast } from 'sonner';
import {
  useListAdminUsers,
  useUpdateAdminUser,
  getListAdminUsersQueryKey,
  UserRole,
} from '@workspace/api-client-react';
import type { User, ListAdminUsersParams } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';

const ALL_ROLES = Object.values(UserRole);
const ALL = '__all__';

function extractErrorMessage(err: unknown, fallback: string): string {
  const data = (err as { data?: { error?: { message?: string } } })?.data;
  return data?.error?.message ?? fallback;
}

export default function AdminUsers() {
  const { t } = useAdminI18n();
  const { user: me } = useAdminAuth();
  const queryClient = useQueryClient();

  const [roleFilter, setRoleFilter] = useState<string>(ALL);
  const params: ListAdminUsersParams =
    roleFilter === ALL ? {} : { role: roleFilter as ListAdminUsersParams['role'] };

  const { data, isLoading, isError, refetch } = useListAdminUsers(params, {
    query: { queryKey: getListAdminUsersQueryKey(params) },
  });
  const users = data?.data ?? [];

  const updateMutation = useUpdateAdminUser();

  const [editing, setEditing] = useState<User | null>(null);
  const [editRole, setEditRole] = useState<string>('student');
  const [editActive, setEditActive] = useState(true);

  const openEdit = (u: User) => {
    setEditing(u);
    setEditRole(u.role);
    setEditActive(u.isActive);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    updateMutation.mutate(
      { userId: editing.id, data: { role: editRole as User['role'], isActive: editActive } },
      {
        onSuccess: () => {
          toast.success(t('users.saved'));
          setEditing(null);
          queryClient.invalidateQueries({ queryKey: getListAdminUsersQueryKey() });
        },
        onError: (err) => toast.error(extractErrorMessage(err, t('users.saveError'))),
      },
    );
  };

  const saving = updateMutation.isPending;
  const isSelf = (u: User) => me?.id === u.id;

  return (
    <AdminLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
          <h1 className="text-3xl font-bold text-foreground">{t('users.title')}</h1>
          <div className="w-full max-w-56">
            <Label>{t('users.filterByRole')}</Label>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{t('users.allRoles')}</SelectItem>
                {ALL_ROLES.map((r) => (
                  <SelectItem key={r} value={r}>{t(`users.roles.${r}`)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Spinner />
          </div>
        ) : isError ? (
          <Card className="p-12 text-center">
            <p className="text-destructive mb-4">{t('users.loadError')}</p>
            <Button variant="outline" onClick={() => refetch()}>{t('common.search')}</Button>
          </Card>
        ) : users.length > 0 ? (
          <Card className="p-0 overflow-x-auto">
            <table className="w-full text-start">
              <thead className="bg-muted">
                <tr>
                  <th className="px-6 py-3 text-start text-sm font-medium text-muted-foreground">{t('users.name')}</th>
                  <th className="px-6 py-3 text-start text-sm font-medium text-muted-foreground">{t('users.email')}</th>
                  <th className="px-6 py-3 text-start text-sm font-medium text-muted-foreground">{t('users.role')}</th>
                  <th className="px-6 py-3 text-start text-sm font-medium text-muted-foreground">{t('users.status')}</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-muted/50">
                    <td className="px-6 py-4 text-sm font-medium text-foreground">{u.fullName}</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground" dir="ltr">{u.email}</td>
                    <td className="px-6 py-4 text-sm text-foreground">{t(`users.roles.${u.role}`)}</td>
                    <td className="px-6 py-4 text-sm">
                      {u.isActive ? (
                        <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                          {t('users.active')}
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                          {t('users.inactive')}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-end">
                      <Button variant="outline" size="sm" onClick={() => openEdit(u)}>
                        {t('common.edit')}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        ) : (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground">{t('common.noData')}</p>
          </Card>
        )}
      </div>

      {/* Edit dialog */}
      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <form onSubmit={handleSave}>
            <DialogHeader>
              <DialogTitle>{t('users.editUser')}</DialogTitle>
              <DialogDescription dir="ltr">{editing?.email}</DialogDescription>
            </DialogHeader>

            <div className="space-y-5 py-4">
              <div>
                <Label>{t('users.role')}</Label>
                <Select
                  value={editRole}
                  onValueChange={setEditRole}
                  disabled={saving || (editing !== null && isSelf(editing))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ALL_ROLES.map((r) => (
                      <SelectItem key={r} value={r}>{t(`users.roles.${r}`)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between rounded-md border p-4">
                <Label htmlFor="user-active" className="cursor-pointer">{t('users.accountActive')}</Label>
                <Switch
                  id="user-active"
                  checked={editActive}
                  onCheckedChange={setEditActive}
                  disabled={saving || (editing !== null && isSelf(editing))}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditing(null)} disabled={saving}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={saving || (editing !== null && isSelf(editing))}>
                {saving ? <Spinner className="me-2 h-4 w-4" /> : null}
                {t('common.save')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
