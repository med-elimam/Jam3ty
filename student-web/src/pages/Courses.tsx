import { useMemo, useState } from 'react';
import { BookOpen, FileText, ClipboardList, Search, X } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/contexts/I18nContext';
import { useListCourses } from '@workspace/api-client-react';
import Layout from '@/components/Layout';
import {
  EmptyState,
  ErrorState,
  PageHeader,
  PageShell,
  PageSkeleton,
  chooseLocalized,
  getResponseData,
} from '@/components/student/StudentUI';

export default function Courses() {
  const { t, lang } = useI18n();
  const [search, setSearch] = useState('');
  const params = useMemo(() => ({ search: search.trim() || undefined }), [search]);
  const { data: coursesData, isLoading, isError } = useListCourses(params);
  const courses = getResponseData<any>(coursesData);

  if (isLoading) {
    return (
      <Layout>
        <PageSkeleton cards={6} />
      </Layout>
    );
  }

  return (
    <Layout>
      <PageShell>
        <PageHeader title={t('courses.title')} description={t('courses.emptyBody')} />

        <div className="flex max-w-2xl items-center gap-2 rounded-xl border bg-card px-3 py-2">
          <Search className="size-5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t('courses.searchPlaceholder')}
            className="h-9 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
          />
          {search ? (
            <Button variant="ghost" size="icon-sm" onClick={() => setSearch('')} aria-label={t('common.close')}>
              <X className="size-4" />
            </Button>
          ) : null}
        </div>

        {isError ? (
          <ErrorState />
        ) : courses.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {courses.map((course: any) => {
              const name = chooseLocalized(course, lang, course.name);
              return (
                <Card key={course.id} className="student-card student-card-hover gap-5 rounded-xl p-5 shadow-none">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-primary">{course.code || course.semester}</p>
                      <h3 className="mt-2 line-clamp-2 text-lg font-bold text-foreground">{name}</h3>
                    </div>
                    <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary text-sm font-black text-primary-foreground">
                      {(course.code || name || '?').slice(0, 3)}
                    </div>
                  </div>

                  {course.description ? (
                    <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">{course.description}</p>
                  ) : null}

                  <div className="space-y-2 text-sm">
                    {course.professorName ? (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <BookOpen className="size-4 text-primary" />
                        <span>{t('courses.professorPrefix')}{course.professorName}</span>
                      </div>
                    ) : null}
                    <div className="flex flex-wrap gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">
                        <FileText className="size-3.5" />
                        {t('courses.fileCount', { n: course.fileCount ?? 0 })}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-accent/30 px-3 py-1 text-xs font-semibold text-amber-900">
                        <ClipboardList className="size-3.5" />
                        {t('courses.assignmentCount', { n: course.assignmentCount ?? 0 })}
                      </span>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <EmptyState icon={BookOpen} title={t('courses.empty')} body={t('courses.emptyBody')} />
        )}
      </PageShell>
    </Layout>
  );
}
