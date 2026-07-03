import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { useI18n } from '@/contexts/I18nContext';
import { useApi } from '@/hooks/useApi';
import Layout from '@/components/Layout';

export default function Clubs() {
  const { t } = useI18n();
  const { getClubs } = useApi();
  const [clubs, setClubs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const result = await getClubs();
      if (result.success) setClubs(result.clubs || []);
      setLoading(false);
    };
    load();
  }, []);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <Spinner />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6 max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">{t('clubs.title')}</h1>

        {clubs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {clubs.map((club: any) => (
              <Card key={club.id} className="p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-2">{club.name}</h3>
                <p className="text-gray-600 mb-4">{club.description}</p>
                <p className="text-sm text-gray-600 mb-4">
                  {t('clubs.members')}: {club.memberCount}
                </p>
                <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  {t('clubs.join')}
                </button>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-500">{t('clubs.noClubs')}</p>
        )}
      </div>
    </Layout>
  );
}
