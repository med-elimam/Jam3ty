import { Bell, Megaphone, UserRound } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useI18n } from '@/contexts/I18nContext';
import { useListAnnouncements } from '@workspace/api-client-react';
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
import { cn } from '@/lib/utils';

const priorityClass: Record<string, string> = {
  urgent: 'bg-red-50 text-red-700',
  important: 'bg-accent/30 text-amber-900',
  normal: 'bg-secondary text-secondary-foreground',
};

export default function Announcements() {
  const { t, lang } = useI18n();
  const { data: announcementsData, isLoading, isError } = useListAnnouncements();
  const announcements = getResponseData<any>(announcementsData);

  if (isLoading) {
    return (
      <Layout>
        <PageSkeleton cards={5} />
      </Layout>
    );
  }

  return (
    <Layout>
      <PageShell className="max-w-5xl">
        <PageHeader title={t('announcements.title')} description={t('announcements.emptyBody')} />

        {isError ? (
          <ErrorState />
        ) : announcements.length > 0 ? (
          <div className="space-y-4">
            {announcements.map((announcement: any) => (
              <Card key={announcement.id} className="student-card student-card-hover rounded-xl p-5 shadow-none">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      {!announcement.isRead ? <span className="size-2 rounded-full bg-primary" /> : null}
                      <span className={cn('rounded-full px-3 py-1 text-xs font-bold', priorityClass[announcement.priority] ?? priorityClass.normal)}>
                        {announcement.priority === 'urgent'
                          ? t('announcements.urgent')
                          : announcement.priority === 'important'
                            ? t('announcements.high')
                            : t('announcements.low')}
                      </span>
                      {announcement.courseName ? (
                        <span className="rounded-full bg-card px-3 py-1 text-xs font-semibold text-muted-foreground ring-1 ring-border">
                          {announcement.courseName}
                        </span>
                      ) : null}
                    </div>
                    <h3 className="text-lg font-bold text-foreground">{announcement.title}</h3>
                    <p className="mt-3 whitespace-pre-line text-sm leading-7 text-muted-foreground">{announcement.content}</p>
                  </div>
                  <div className="flex shrink-0 flex-row gap-4 text-sm text-muted-foreground sm:w-44 sm:flex-col">
                    <span className="flex items-center gap-2">
                      <UserRound className="size-4 text-primary" />
                      {announcement.createdByName}
                    </span>
                    <span className="flex items-center gap-2">
                      <Megaphone className="size-4 text-primary" />
                      {formatDate(announcement.createdAt, lang)}
                    </span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState icon={Bell} title={t('announcements.noAnnouncements')} body={t('announcements.emptyBody')} />
        )}
      </PageShell>
    </Layout>
  );
}
