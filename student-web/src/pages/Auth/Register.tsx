import { useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
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
      // AuthResponse shape: { success, data: { user, tokens: { accessToken, refreshToken, expiresIn } } }
      const result = await registerMutate({ data: { fullName, email, password } });
      const { accessToken, refreshToken } = result.data.tokens;
      signIn(accessToken, refreshToken);
      toast.success('Registration successful');
      navigate('/');
    } catch (err: any) {
      toast.error(err?.data?.error?.message ?? err?.message ?? 'Registration failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <div className="p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('auth.registerTitle')}</h1>
            <p className="text-gray-600">{t('auth.joinJamiati')}</p>
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <Label htmlFor="fullName">{t('auth.fullName')}</Label>
              <Input
                id="fullName"
                type="text"
                placeholder={t('auth.fullNamePlaceholder')}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                disabled={isPending}
              />
            </div>

            <div>
              <Label htmlFor="email">{t('auth.email')}</Label>
              <Input
                id="email"
                type="email"
                placeholder="student@university.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isPending}
              />
            </div>

            <div>
              <Label htmlFor="password">{t('auth.password')}</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isPending}
              />
              <p className="text-xs text-gray-500 mt-1">{t('auth.passwordMin')}</p>
            </div>

            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? <Spinner className="mr-2 h-4 w-4" /> : null}
              {t('auth.createAccountBtn')}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-600 text-sm">
              {t('auth.haveAccount')}{' '}
              <button
                onClick={() => navigate('/login')}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                {t('auth.login')}
              </button>
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
