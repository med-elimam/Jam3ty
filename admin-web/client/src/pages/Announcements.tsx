import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { useI18n } from '@/contexts/I18nContext';
import { useApi } from '@/hooks/useApi';
import Layout from '@/components/Layout';

export default function Announcements() {
  const { t } = useI18n();
  const { getAnnouncements } = useApi();
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const result = await getAnnouncements();
      if (result.success) setAnnouncements(result.announcements || []);
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
      <div className="p-6 max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">{t('announcements.title')}</h1>

        {announcements.length > 0 ? (
          <div className="space-y-4">
            {announcements.map((ann: any) => (
              <Card key={ann.id} className="p-6 border-l-4 border-amber-400">
                <h3 className="text-lg font-bold text-gray-900 mb-2">{ann.title}</h3>
                <p className="text-gray-700 mb-3">{ann.content}</p>
                <div className="flex justify-between items-center text-sm text-gray-600">
                  <span>{ann.date}</span>
                  <button className="text-blue-600 hover:text-blue-700">{t('announcements.readMore')}</button>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-500">{t('announcements.noAnnouncements')}</p>
        )}
      </div>
    </Layout>
  );
}
