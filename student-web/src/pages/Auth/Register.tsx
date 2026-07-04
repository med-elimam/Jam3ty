import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { ArrowLeft, Loader2, Lock, Mail, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { useI18n } from '@/contexts/I18nContext';
import { useAuth } from '@/contexts/AuthContext';
import { useRegister } from '@workspace/api-client-react';
import { toast } from 'sonner';

export default function Register() {
  const [, navigate] = useLocation();
  const { t } = useI18n();
  const { signIn } = useAuth();
  const { mutateAsync: registerMutate, isPending } = useRegister();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !password) {
      toast.error(t('auth.allFieldsRequired'));
      return;
    }

    if (password.length < 8) {
      toast.error(t('auth.passwordTooShort'));
      return;
    }

    try {
      const result = await registerMutate({ data: { fullName, email, password } });
      const { accessToken, refreshToken } = result.data.tokens;
      signIn(accessToken, refreshToken);
      toast.success(t('auth.welcomeBack'));
      navigate('/');
    } catch (err: any) {
      toast.error(err?.data?.error?.message ?? err?.message ?? t('auth.registerFailed'));
    }
  };

  return (
    <div className="student-surface grid min-h-screen place-items-center px-4 py-8">
      <Card className="w-full max-w-md gap-0 rounded-2xl p-0 shadow-none">
        <div className="p-6 sm:p-8">
          <div className="mb-8 text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-primary text-xl font-black text-primary-foreground">ج</div>
            <h1 className="mt-5 text-3xl font-bold text-foreground">{t('auth.registerTitle')}</h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">{t('auth.registerIntro')}</p>
          </div>

          <form onSubmit={handleRegister} className="space-y-5">
            <Field icon={UserRound} id="fullName" label={t('auth.fullName')}>
              <Input
                id="fullName"
                type="text"
                className="h-11 ltr:pl-10 rtl:pr-10"
                placeholder={t('auth.fullNamePlaceholder')}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                disabled={isPending}
              />
            </Field>

            <Field icon={Mail} id="email" label={t('auth.email')}>
              <Input
                id="email"
                type="email"
                className="h-11 ltr:pl-10 rtl:pr-10"
                placeholder="student@university.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isPending}
              />
            </Field>

            <Field icon={Lock} id="password" label={t('auth.password')}>
              <Input
                id="password"
                type="password"
                className="h-11 ltr:pl-10 rtl:pr-10"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isPending}
              />
              <p className="mt-1 text-xs text-muted-foreground">{t('auth.passwordMin')}</p>
            </Field>

            <Button type="submit" className="h-11 w-full" disabled={isPending}>
              {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              {t('auth.createAccountBtn')}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {t('auth.haveAccount')}{' '}
            <Link href="/login" className="font-bold text-primary hover:text-primary/80">
              {t('auth.login')} <ArrowLeft className="inline size-4" />
            </Link>
          </p>
        </div>
      </Card>
    </div>
  );
}

function Field({
  icon: Icon,
  id,
  label,
  children,
}: {
  icon: typeof UserRound;
  id: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Icon className="pointer-events-none absolute top-5 size-4 -translate-y-1/2 text-muted-foreground ltr:left-3 rtl:right-3" />
        {children}
      </div>
    </div>
  );
}
