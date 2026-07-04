import { useMemo, useState } from 'react';
import { CalendarDays, Clock3, MapPin, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useI18n } from '@/contexts/I18nContext';
import { useGetTimetable } from '@workspace/api-client-react';
import Layout from '@/components/Layout';
import {
  EmptyState,
  ErrorState,
  PageHeader,
  PageShell,
  PageSkeleton,
  formatTime,
  getResponseData,
} from '@/components/student/StudentUI';
import { cn } from '@/lib/utils';

const dayKeys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const dayNames = {
  ar: ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'],
  fr: ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'],
};

export default function Timetable() {
  const { t, lang } = useI18n();
  const today = new Date().getDay();
  const [selectedDay, setSelectedDay] = useState(today);
  const { data: timetableData, isLoading, isError } = useGetTimetable();
  const sessions = getResponseData<any>(timetableData);

  const sessionsByDay = useMemo(() => {
    return dayKeys.map((_, index) =>
      sessions
        .filter((session) => session.dayOfWeek === index)
        .sort((a, b) => String(a.startTime).localeCompare(String(b.startTime))),
    );
  }, [sessions]);

  const daySessions = sessionsByDay[selectedDay] ?? [];

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
        <PageHeader title={t('timetable.title')} description={t('timetable.weekEmptyBody')} />

        <div className="flex gap-2 overflow-x-auto pb-1">
          {dayKeys.map((key, index) => {
            const active = selectedDay === index;
            const count = sessionsByDay[index]?.length ?? 0;
            return (
              <Button
                key={key}
                variant={active ? 'default' : 'outline'}
                className={cn('h-auto min-w-20 flex-col gap-1 rounded-xl py-3', !active && 'bg-card')}
                onClick={() => setSelectedDay(index)}
              >
                <span>{dayNames[lang][index]}</span>
                <span className={cn('text-xs', active ? 'text-primary-foreground/75' : 'text-muted-foreground')}>
                  {t('timetable.sessionsCount', { n: count })}
                </span>
              </Button>
            );
          })}
        </div>

        {isError ? (
          <ErrorState />
        ) : daySessions.length > 0 ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {daySessions.map((session: any) => (
              <Card key={session.id} className="student-card student-card-hover overflow-hidden rounded-xl p-0 shadow-none">
                <div className="flex">
                  <div className="flex w-24 shrink-0 flex-col items-center justify-center bg-primary/10 p-4 text-primary">
                    <Clock3 className="mb-2 size-5" />
                    <span className="text-sm font-bold">{formatTime(session.startTime)}</span>
                    <span className="text-xs text-muted-foreground">{formatTime(session.endTime)}</span>
                  </div>
                  <div className="min-w-0 flex-1 p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-primary">{session.courseCode || t(`timetable.${session.type}`)}</p>
                        <h3 className="mt-1 line-clamp-2 text-lg font-bold text-foreground">{session.courseName}</h3>
                      </div>
                      <span className="rounded-full bg-accent/30 px-3 py-1 text-xs font-bold text-amber-900">
                        {t(`timetable.${session.type}`)}
                      </span>
                    </div>
                    <div className="mt-4 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                      {session.room ? (
                        <span className="flex items-center gap-2">
                          <MapPin className="size-4 text-primary" />
                          {t('timetable.room')} {session.room}
                        </span>
                      ) : null}
                      {session.professorName ? (
                        <span className="flex items-center gap-2">
                          <UserRound className="size-4 text-primary" />
                          {session.professorName}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState icon={CalendarDays} title={t('timetable.emptyTitle')} body={t('timetable.emptyBody')} />
        )}
      </PageShell>
    </Layout>
  );
}
