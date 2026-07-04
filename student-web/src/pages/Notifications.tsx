import { Card } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { useI18n } from '@/contexts/I18nContext';
import { useListNotifications } from '@workspace/api-client-react';
import Layout from '@/components/Layout';

export default function Notifications() {
  const { t } = useI18n();
  const { data: notificationsData, isLoading: loading } = useListNotifications();
  const notifications = Array.isArray(notificationsData) ? notificationsData : (notificationsData as any)?.data ?? [];

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
        <h1 className="text-3xl font-bold text-gray-900 mb-6">{t('screens.notifications')}</h1>

        {notifications.length > 0 ? (
          <div className="space-y-3">
            {notifications.map((notif: any) => (
              <Card key={notif.id} className="p-4 hover:bg-gray-50 cursor-pointer">
                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    {notif.icon || '🔔'}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{notif.title}</h3>
                    <p className="text-sm text-gray-600">{notif.message}</p>
                    <p className="text-xs text-gray-500 mt-1">{notif.timestamp}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500">{t('common.comingSoonTitle')}</p>
          </div>
        )}
      </div>
    </Layout>
  );
}
