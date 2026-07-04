import { Link } from 'wouter';
import { ArrowLeft, Bell, BookOpen, CalendarDays, CheckCircle2, Crown, ShieldCheck } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useI18n } from '@/contexts/I18nContext';
import { useAuth } from '@/contexts/AuthContext';
import { useGetDashboardHome } from '@workspace/api-client-react';
import Layout from '@/components/Layout';
import {
  EmptyState,
  ErrorState,
  PageShell,
  PageSkeleton,
  SectionCard,
  StatCard,
  formatDate,
  formatTime,
  studentIcons,
} from '@/components/student/StudentUI';

export default function Home() {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const { data, isLoading, isError } = useGetDashboardHome();

  if (isLoading) {
    return (
      <Layout>
        <PageSkeleton cards={6} />
      </Layout>
    );
  }

  if (isError) {
    return (
      <Layout>
        <PageShell>
          <ErrorState />
        </PageShell>
      </Layout>
    );
  }

  const dashboard = (data as any)?.data ?? {};
  const firstName = (user?.fullName ?? dashboard?.student?.fullName ?? t('home.studentFallback')).split(' ')[0];
  const todaysSessions = dashboard?.todaysSessions ?? [];
  const announcements = dashboard?.latestAnnouncements ?? [];
  const assignments = dashboard?.upcomingAssignments ?? [];
  const exams = dashboard?.upcomingExams ?? [];

  return (
    <Layout>
      <PageShell>
        <section className="overflow-hidden rounded-2xl bg-primary text-primary-foreground">
          <div className="grid gap-6 p-6 lg:grid-cols-[1fr_18rem] lg:p-8">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold text-white/70">{t('home.greeting')}</p>
              <h1 className="mt-2 text-3xl font-bold tracking-normal sm:text-4xl">
                {firstName}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/78 sm:text-base">
                {t('home.dashboardHint')}
              </p>
            </div>
            <Link
              href="/subscription"
              className="student-focus flex items-center justify-between gap-3 rounded-xl bg-white/10 p-4 text-sm font-semibold text-white ring-1 ring-white/15 transition-colors hover:bg-white/15"
            >
              <span className="flex items-center gap-3">
                <Crown className="size-5 text-accent" />
                {dashboard?.subscription
                  ? `${dashboard.subscription.planName} · ${t('home.daysRemaining', { n: dashboard.subscription.daysRemaining })}`
                  : t('home.upgradeFull')}
              </span>
              <ArrowLeft className="size-4" />
            </Link>
          </div>
        </section>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard icon={CalendarDays} label={t('home.todayLectures')} value={todaysSessions.length} />
          <StatCard icon={Bell} label={t('home.announcements')} value={announcements.length} tone="gold" />
          <StatCard icon={CheckCircle2} label={t('home.upcomingAssignments')} value={assignments.length} tone="green" />
          <StatCard icon={ShieldCheck} label={t('home.upcomingExams')} value={exams.length} tone="red" />
        </div>

        <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
          <SectionCard title={t('home.todayLectures')} icon={studentIcons.timetable} to="/timetable" viewLabel={t('common.viewAll')}>
            {todaysSessions.length === 0 ? (
              <EmptyState icon={CalendarDays} title={t('home.noLecturesToday')} body={t('home.noLecturesTodayBody')} />
            ) : (
              <div className="space-y-3">
                {todaysSessions.slice(0, 4).map((session: any) => (
                  <Card key={session.id} className="student-card-hover rounded-xl border bg-card p-4 shadow-none">
                    <div className="flex items-center gap-4">
                      <div className="flex w-20 shrink-0 flex-col items-center rounded-lg bg-primary/10 px-3 py-2 text-primary">
                        <span className="text-sm font-bold">{formatTime(session.startTime)}</span>
                        <span className="text-xs text-muted-foreground">{formatTime(session.endTime)}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate font-bold text-foreground">{session.courseName}</h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {session.room ? `${t('timetable.room')} ${session.room}` : t(`timetable.${session.type ?? 'other'}`)}
                        </p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard title={t('home.announcements')} icon={studentIcons.announcements} to="/announcements" viewLabel={t('common.viewAll')}>
            {announcements.length === 0 ? (
              <EmptyState icon={Bell} title={t('home.noAnnouncements')} body={t('home.noAnnouncementsBody')} />
            ) : (
              <div className="space-y-3">
                {announcements.slice(0, 3).map((announcement: any) => (
                  <Link key={announcement.id} href="/announcements" className="student-card-hover block rounded-xl border bg-card p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="line-clamp-2 font-bold text-foreground">{announcement.title}</h3>
                        <p className="mt-2 text-sm text-muted-foreground">{announcement.createdByName}</p>
                      </div>
                      {announcement.priority !== 'normal' ? (
                        <span className="rounded-full bg-accent/30 px-2.5 py-1 text-xs font-bold text-amber-900">
                          {t(`announcements.${announcement.priority === 'urgent' ? 'urgent' : 'high'}`)}
                        </span>
                      ) : null}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </SectionCard>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <SectionCard title={t('home.upcomingAssignments')} icon={CheckCircle2} to="/assignments" viewLabel={t('common.viewAll')}>
            {assignments.length === 0 ? (
              <EmptyState icon={CheckCircle2} title={t('assignments.noAssignments')} body={t('home.noAssignmentsBody')} />
            ) : (
              <div className="space-y-3">
                {assignments.slice(0, 3).map((assignment: any) => (
                  <Link key={assignment.id} href="/assignments" className="student-card-hover block rounded-xl border bg-card p-4">
                    <h3 className="font-bold text-foreground">{assignment.titleAr || assignment.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{assignment.courseName}</p>
                    <p className="mt-3 text-xs font-semibold text-primary">{formatDate(assignment.deadline, lang)}</p>
                  </Link>
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard title={t('home.upcomingExams')} icon={BookOpen} to="/exams" viewLabel={t('common.viewAll')}>
            {exams.length === 0 ? (
              <EmptyState icon={ShieldCheck} title={t('exams.noExams')} body={t('home.noExamsBody')} />
            ) : (
              <div className="space-y-3">
                {exams.slice(0, 3).map((exam: any) => (
                  <Link key={exam.id} href="/exams" className="student-card-hover block rounded-xl border bg-card p-4">
                    <h3 className="font-bold text-foreground">{exam.titleAr || exam.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{exam.courseName}</p>
                    <p className="mt-3 text-xs font-semibold text-primary">
                      {formatDate(exam.date, lang)} · {formatTime(exam.startTime)}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </SectionCard>
        </div>
      </PageShell>
    </Layout>
  );
}
