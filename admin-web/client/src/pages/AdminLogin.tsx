import { useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { useAdminI18n } from '@/contexts/AdminI18nContext';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { useLogin } from '@workspace/api-client-react';
import { toast } from 'sonner';

export default function AdminLogin() {
  const [, navigate] = useLocation();
  const { t } = useAdminI18n();
  const { signIn } = useAdminAuth();
  const loginMutation = useLogin();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const loading = loginMutation.isPending;

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error(t('common.error'));
      return;
    }

    loginMutation.mutate(
      { data: { email, password } },
      {
        onSuccess: (result) => {
          if (result.data.user.role !== 'super_admin') {
            toast.error(t('auth.adminOnly'));
            return;
          }
          signIn(result.data.tokens.accessToken, result.data.tokens.refreshToken);
          toast.success(t('common.success'));
          navigate('/admin/dashboard');
        },
        onError: () => toast.error(t('auth.loginFailed')),
      },
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <div className="p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('nav.dashboard')}</h1>
            <p className="text-gray-600">{t('auth.adminOnly')}</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <Label htmlFor="email">{t('auth.email')}</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@university.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
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
                disabled={loading}
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? <Spinner className="mr-2 h-4 w-4" /> : null}
              {t('auth.login')}
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
}
