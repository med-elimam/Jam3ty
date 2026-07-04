import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { ArrowLeft, BookOpen, CalendarDays, FileText, Loader2, Lock, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { useI18n } from '@/contexts/I18nContext';
import { useAuth } from '@/contexts/AuthContext';
import { useLogin } from '@workspace/api-client-react';
import { toast } from 'sonner';

export default function Login() {
  const [, navigate] = useLocation();
  const { t } = useI18n();
  const { signIn } = useAuth();
  const { mutateAsync: loginMutate, isPending } = useLogin();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error(t('auth.fillCredentials'));
      return;
    }

    try {
      const result = await loginMutate({ data: { email, password } });
      const { accessToken, refreshToken } = result.data.tokens;
      signIn(accessToken, refreshToken);
      toast.success(t('auth.welcomeBack'));
      navigate('/');
    } catch (err: any) {
      toast.error(err?.data?.error?.message ?? err?.message ?? t('auth.loginFailed'));
    }
  };

  return (
    <div className="student-surface grid min-h-screen place-items-center px-4 py-8">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-2xl border bg-card lg:grid-cols-[1fr_26rem]">
        <section className="hidden bg-primary p-8 text-primary-foreground lg:flex lg:flex-col lg:justify-between">
          <div>
            <div className="flex size-12 items-center justify-center rounded-xl bg-white text-xl font-black text-primary">ج</div>
            <h1 className="mt-8 text-4xl font-bold tracking-normal">{t('brand.appName')}</h1>
            <p className="mt-4 max-w-md text-base leading-7 text-white/76">{t('auth.loginIntro')}</p>
          </div>
          <div className="grid gap-3">
            {[
              [BookOpen, t('nav.courses')],
              [CalendarDays, t('nav.timetable')],
              [FileText, t('screens.files')],
            ].map(([Icon, label]) => {
              const FeatureIcon = Icon as typeof BookOpen;
              return (
                <div key={label as string} className="flex items-center gap-3 rounded-xl bg-white/10 p-3 ring-1 ring-white/15">
                  <FeatureIcon className="size-5 text-accent" />
                  <span className="font-semibold">{label as string}</span>
                </div>
              );
            })}
          </div>
        </section>

        <Card className="gap-0 rounded-none border-0 p-0 shadow-none">
          <div className="p-6 sm:p-8">
            <div className="mb-8">
              <p className="text-sm font-semibold text-primary">{t('auth.welcomeBack')}</p>
              <h2 className="mt-2 text-3xl font-bold text-foreground">{t('auth.login')}</h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{t('auth.loginIntro')}</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email">{t('auth.email')}</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute top-1/2 size-4 -translate-y-1/2 text-muted-foreground ltr:left-3 rtl:right-3" />
                  <Input
                    id="email"
                    type="email"
                    className="h-11 ltr:pl-10 rtl:pr-10"
                    placeholder="student@university.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isPending}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">{t('auth.password')}</Label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute top-1/2 size-4 -translate-y-1/2 text-muted-foreground ltr:left-3 rtl:right-3" />
                  <Input
                    id="password"
                    type="password"
                    className="h-11 ltr:pl-10 rtl:pr-10"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isPending}
                  />
                </div>
              </div>

              <Button type="submit" className="h-11 w-full" disabled={isPending}>
                {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                {t('auth.login')}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              {t('auth.noAccount')}{' '}
              <Link href="/register" className="font-bold text-primary hover:text-primary/80">
                {t('auth.createAccount')} <ArrowLeft className="inline size-4" />
              </Link>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
