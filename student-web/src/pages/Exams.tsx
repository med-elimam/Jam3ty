import { CalendarDays, Clock3, MapPin, ShieldCheck } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useI18n } from '@/contexts/I18nContext';
import { useListExams } from '@workspace/api-client-react';
import Layout from '@/components/Layout';
import {
  EmptyState,
  ErrorState,
  PageHeader,
  PageShell,
  PageSkeleton,
  formatDate,
  formatTime,
  getResponseData,
} from '@/components/student/StudentUI';

const examTypeKey: Record<string, string> = {
  midterm: 'midterm',
  final: 'final',
  test: 'quiz',
  makeup: 'other',
  other: 'other',
};

export default function Exams() {
  const { t, lang } = useI18n();
  const { data: examsData, isLoading, isError } = useListExams();
  const exams = getResponseData<any>(examsData);

  if (isLoading) {
    return (
      <Layout>
        <PageSkeleton cards={4} />
      </Layout>
    );
  }

  return (
    <Layout>
      <PageShell className="max-w-5xl">
        <PageHeader title={t('exams.title')} description={t('exams.emptyBody')} />

        {isError ? (
          <ErrorState />
        ) : exams.length > 0 ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {exams.map((exam: any) => (
              <Card key={exam.id} className="student-card student-card-hover rounded-xl p-5 shadow-none">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-primary">{exam.courseName}</p>
                    <h3 className="mt-1 text-lg font-bold text-foreground">{exam.title}</h3>
                  </div>
                  <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-700">
                    {t(`exams.${examTypeKey[exam.type] ?? 'other'}`)}
                  </span>
                </div>
                <div className="mt-5 grid gap-3 text-sm text-muted-foreground sm:grid-cols-3">
                  <span className="flex items-center gap-2">
                    <CalendarDays className="size-4 text-primary" />
                    {formatDate(exam.date, lang)}
                  </span>
                  <span className="flex items-center gap-2">
                    <Clock3 className="size-4 text-primary" />
                    {formatTime(exam.startTime)}
                  </span>
                  <span className="flex items-center gap-2">
                    <MapPin className="size-4 text-primary" />
                    {exam.room || '—'}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState icon={ShieldCheck} title={t('exams.noExams')} body={t('exams.emptyBody')} />
        )}
      </PageShell>
    </Layout>
  );
}
