import { useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
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
      // AuthResponse shape: { success, data: { user, tokens: { accessToken, refreshToken, expiresIn } } }
      const result = await loginMutate({ data: { email, password } });
      const { accessToken, refreshToken } = result.data.tokens;
      signIn(accessToken, refreshToken);
      toast.success('Login successful');
      navigate('/');
    } catch (err: any) {
      toast.error(err?.data?.error?.message ?? err?.message ?? 'Login failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <div className="p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('brand.appName')}</h1>
            <p className="text-gray-600">{t('auth.appTagline')}</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
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
            </div>

            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? <Spinner className="mr-2 h-4 w-4" /> : null}
              {t('auth.login')}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-600 text-sm">
              {t('auth.noAccount')}{' '}
              <button
                onClick={() => navigate('/register')}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                {t('auth.createAccount')}
              </button>
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
