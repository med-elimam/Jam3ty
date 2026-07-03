import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { useAdminI18n } from '@/contexts/AdminI18nContext';
import { useAdminApi } from '@/hooks/useAdminApi';
import AdminLayout from '@/components/AdminLayout';

export default function AdminUsers() {
  const { t } = useAdminI18n();
  const { getUsers } = useAdminApi();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const result = await getUsers();
      if (result.success) {
        setUsers(result.data || []);
      }
      setLoading(false);
    };
    load();
  }, []);

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-full">
          <Spinner />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">{t('users.title')}</h1>

        {users.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">{t('users.name')}</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">{t('users.email')}</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">{t('users.role')}</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">{t('users.status')}</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {users.map((user: any) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">{user.fullName}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{user.email}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{user.role || 'Student'}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                        {t('users.active')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Card className="p-12 text-center">
            <p className="text-gray-500">{t('common.noData')}</p>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
