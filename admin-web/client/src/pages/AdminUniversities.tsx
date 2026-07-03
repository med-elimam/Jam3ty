import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { useAdminI18n } from '@/contexts/AdminI18nContext';
import { useAdminApi } from '@/hooks/useAdminApi';
import AdminLayout from '@/components/AdminLayout';

export default function AdminUniversities() {
  const { t } = useAdminI18n();
  const { getUniversities } = useAdminApi();
  const [universities, setUniversities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const result = await getUniversities();
      if (result.success) {
        setUniversities(result.data || []);
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
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">{t('universities.title')}</h1>
          <Button>{t('universities.create')}</Button>
        </div>

        {universities.length > 0 ? (
          <div className="space-y-4">
            {universities.map((uni: any) => (
              <Card key={uni.id} className="p-6 flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-gray-900">{uni.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">{t('universities.status')}: {uni.status}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">{t('common.edit')}</Button>
                  <Button variant="outline" size="sm" className="text-red-600">{t('common.delete')}</Button>
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
    </AdminLayout>
  );
}
