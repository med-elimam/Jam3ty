import { Download, FileText, Heart, UserRound } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/contexts/I18nContext';
import { useListFiles } from '@workspace/api-client-react';
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

function formatBytes(bytes?: number) {
  if (!bytes) return '—';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let index = 0;
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }
  return `${value.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

export default function Files() {
  const { t, lang } = useI18n();
  const { data: filesData, isLoading, isError } = useListFiles();
  const files = getResponseData<any>(filesData);

  if (isLoading) {
    return (
      <Layout>
        <PageSkeleton cards={5} />
      </Layout>
    );
  }

  return (
    <Layout>
      <PageShell>
        <PageHeader title={t('files.title')} description={t('files.emptyBody')} />

        {isError ? (
          <ErrorState />
        ) : files.length > 0 ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {files.map((file: any) => (
              <Card key={file.id} className="student-card student-card-hover rounded-xl p-5 shadow-none">
                <div className="flex items-start gap-4">
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
                    <FileText className="size-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="line-clamp-2 font-bold text-foreground">{file.title}</h3>
                        <p className="mt-1 text-sm text-muted-foreground">{file.courseName || t('courses.title')}</p>
                      </div>
                      <a href={file.fileUrl} target="_blank" rel="noreferrer" aria-label={t('files.download')}>
                        <Button size="icon" variant="outline" className="bg-card">
                          <Download className="size-4" />
                        </Button>
                      </a>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
                      <span className="rounded-full bg-secondary px-3 py-1 text-secondary-foreground">
                        {t(`files.${file.fileType ?? 'other'}`)}
                      </span>
                      <span className="rounded-full bg-accent/30 px-3 py-1 text-amber-900">
                        {formatBytes(file.fileSize)}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-card px-3 py-1 text-muted-foreground ring-1 ring-border">
                        <Heart className="size-3.5" />
                        {file.downloadCount ?? 0}
                      </span>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-2">
                        <UserRound className="size-4 text-primary" />
                        {file.uploaderName}
                      </span>
                      <span>{formatDate(file.createdAt, lang)}</span>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState icon={FileText} title={t('files.noFiles')} body={t('files.emptyBody')} />
        )}
      </PageShell>
    </Layout>
  );
}
