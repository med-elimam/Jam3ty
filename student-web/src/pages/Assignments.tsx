import { CheckCircle2, Clock3 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useI18n } from '@/contexts/I18nContext';
import { useListAssignments } from '@workspace/api-client-react';
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

const statusKey: Record<string, string> = {
  not_submitted: 'notSubmitted',
  submitted: 'submitted',
  late: 'late',
  reviewed: 'reviewed',
};

export default function Assignments() {
  const { t, lang } = useI18n();
  const { data: assignmentsData, isLoading, isError } = useListAssignments();
  const assignments = getResponseData<any>(assignmentsData);

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
        <PageHeader title={t('assignments.title')} description={t('assignments.emptyBody')} />

        {isError ? (
          <ErrorState />
        ) : assignments.length > 0 ? (
          <div className="space-y-3">
            {assignments.map((assignment: any) => {
              const status = assignment.submissionStatus ?? 'not_submitted';
              return (
                <Card key={assignment.id} className="student-card student-card-hover rounded-xl p-5 shadow-none">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-primary">{assignment.courseName}</p>
                      <h3 className="mt-1 text-lg font-bold text-foreground">{assignment.title}</h3>
                      {assignment.description ? (
                        <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">{assignment.description}</p>
                      ) : null}
                    </div>
                    <span className="inline-flex w-fit items-center gap-2 rounded-full bg-secondary px-3 py-1 text-xs font-bold text-secondary-foreground">
                      <CheckCircle2 className="size-3.5" />
                      {t(`assignments.${statusKey[status] ?? 'pending'}`)}
                    </span>
                  </div>
                  <div className="mt-4 flex items-center gap-2 text-sm font-semibold text-primary">
                    <Clock3 className="size-4" />
                    {t('assignments.dueDate')}: {formatDate(assignment.deadline, lang)}
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <EmptyState icon={CheckCircle2} title={t('assignments.noAssignments')} body={t('assignments.emptyBody')} />
        )}
      </PageShell>
    </Layout>
  );
}
