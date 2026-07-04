import { Bell } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useI18n } from '@/contexts/I18nContext';
import { useListNotifications } from '@workspace/api-client-react';
import Layout from '@/components/Layout';
import {
  EmptyState,
  ErrorState,
  PageHeader,
  PageShell,
  PageSkeleton,
  formatDate,
  getResponseData,
} from '@/components/student/StudentUI';

export default function Notifications() {
  const { t, lang } = useI18n();
  const { data: notificationsData, isLoading, isError } = useListNotifications();
  const notifications = getResponseData<any>(notificationsData);

  if (isLoading) {
    return (
      <Layout>
        <PageSkeleton cards={4} />
      </Layout>
    );
  }

  return (
    <Layout>
      <PageShell className="max-w-4xl">
        <PageHeader title={t('screens.notifications')} description={t('notifications.emptyBody')} />

        {isError ? (
          <ErrorState />
        ) : notifications.length > 0 ? (
          <div className="space-y-3">
            {notifications.map((notification: any) => (
              <Card key={notification.id} className="student-card student-card-hover rounded-xl p-5 shadow-none">
                <div className="flex gap-4">
                  <div className="relative flex size-12 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
                    <Bell className="size-5" />
                    {!notification.isRead ? <span className="absolute -top-1 -end-1 size-3 rounded-full bg-accent" /> : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-foreground">{notification.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">{notification.body}</p>
                    <p className="mt-2 text-xs font-semibold text-primary">{formatDate(notification.createdAt, lang)}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState icon={Bell} title={t('notifications.emptyTitle')} body={t('notifications.emptyBody')} />
        )}
      </PageShell>
    </Layout>
  );
}
