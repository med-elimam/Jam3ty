import { Building2, GraduationCap, Mail, Phone, UserRound } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useI18n } from '@/contexts/I18nContext';
import { useGetProfile, useGetMe } from '@workspace/api-client-react';
import Layout from '@/components/Layout';
import {
  EmptyState,
  ErrorState,
  PageHeader,
  PageShell,
  PageSkeleton,
  chooseLocalized,
} from '@/components/student/StudentUI';

function valueOrDash(value?: string | null) {
  return value && value.trim() ? value : '—';
}

export default function Profile() {
  const { t, lang } = useI18n();
  const { data: profileData, isLoading: loadingProfile, isError: profileError } = useGetProfile();
  const { data: meData, isLoading: loadingMe, isError: meError } = useGetMe();

  if (loadingProfile || loadingMe) {
    return (
      <Layout>
        <PageSkeleton cards={3} />
      </Layout>
    );
  }

  const profile = (profileData as any)?.data ?? (meData as any)?.data?.profile;
  const user = (meData as any)?.data;

  return (
    <Layout>
      <PageShell className="max-w-5xl">
        <PageHeader title={t('profile.title')} description={t('profile.emptyBody')} />

        {profileError && meError ? (
          <ErrorState />
        ) : user || profile ? (
          <div className="grid gap-5 lg:grid-cols-[20rem_1fr]">
            <Card className="student-card gap-5 rounded-xl p-6 text-center shadow-none">
              <div className="mx-auto flex size-20 items-center justify-center rounded-2xl bg-primary text-2xl font-black text-primary-foreground">
                {(user?.fullName || t('home.studentFallback')).slice(0, 1)}
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">{valueOrDash(user?.fullName)}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{valueOrDash(user?.email)}</p>
              </div>
              <div className="grid gap-2 text-start text-sm">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="size-4 text-primary" />
                  {valueOrDash(user?.email)}
                </span>
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="size-4 text-primary" />
                  {valueOrDash(user?.phone)}
                </span>
              </div>
            </Card>

            <Card className="student-card rounded-xl p-6 shadow-none">
              <div className="grid gap-4 sm:grid-cols-2">
                <Info label={t('profile.myUniversity')} value={chooseLocalized(profile?.university, lang, '—')} icon={Building2} />
                <Info label={t('profile.myFaculty')} value={chooseLocalized(profile?.faculty, lang, '—')} icon={Building2} />
                <Info label={t('profile.myDepartment')} value={chooseLocalized(profile?.department, lang, '—')} icon={GraduationCap} />
                <Info label={t('profile.myLevel')} value={chooseLocalized(profile?.level, lang, '—')} icon={GraduationCap} />
                <Info label={t('profile.myGroup')} value={chooseLocalized(profile?.group, lang, '—')} icon={UserRound} />
                <Info label={t('common.language')} value={(profile?.language ?? lang).toUpperCase()} icon={UserRound} />
              </div>
              {profile?.bio ? (
                <div className="mt-6 rounded-xl bg-secondary p-4">
                  <p className="text-sm font-bold text-foreground">{t('profile.bio')}</p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{profile.bio}</p>
                </div>
              ) : null}
            </Card>
          </div>
        ) : (
          <EmptyState icon={UserRound} title={t('profile.title')} body={t('profile.emptyBody')} />
        )}
      </PageShell>
    </Layout>
  );
}

function Info({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof Building2;
}) {
  return (
    <div className="rounded-xl bg-secondary/70 p-4">
      <div className="mb-3 flex size-9 items-center justify-center rounded-lg bg-card text-primary">
        <Icon className="size-5" />
      </div>
      <p className="text-xs font-semibold text-muted-foreground">{label}</p>
      <p className="mt-1 font-bold text-foreground">{value}</p>
    </div>
  );
}
