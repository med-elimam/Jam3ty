import { Card } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { useI18n } from '@/contexts/I18nContext';
import { useListEvents } from '@workspace/api-client-react';
import Layout from '@/components/Layout';

export default function Events() {
  const { t } = useI18n();
  const { data: eventsData, isLoading: loading } = useListEvents();
  const events = Array.isArray(eventsData) ? eventsData : (eventsData as any)?.data ?? [];

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
        <h1 className="text-3xl font-bold text-gray-900 mb-6">{t('events.title')}</h1>

        {events.length > 0 ? (
          <div className="space-y-4">
            {events.map((event: any) => (
              <Card key={event.id} className="p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-3">{event.name}</h3>
                <p className="text-gray-600 mb-4">{event.description}</p>
                <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                  <div>
                    <p className="text-gray-600">{t('events.date')}</p>
                    <p className="font-medium">{event.date}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">{t('events.time')}</p>
                    <p className="font-medium">{event.time}</p>
                  </div>
                </div>
                <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  {t('events.interested')}
                </button>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-500">{t('events.noEvents')}</p>
        )}
      </div>
    </Layout>
  );
}
