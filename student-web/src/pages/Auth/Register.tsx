import { useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { useI18n } from '@/contexts/I18nContext';
import { useApi } from '@/hooks/useApi';
import { toast } from 'sonner';

export default function Register() {
  const [, navigate] = useLocation();
  const { t } = useI18n();
  const { register } = useApi();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

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

    setLoading(true);
    const result = await register(email, password, fullName);
    setLoading(false);

    if (result.success) {
      toast.success('Registration successful');
      navigate('/');
    } else {
      toast.error(result.error);
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
                disabled={loading}
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
              <p className="text-xs text-gray-500 mt-1">{t('auth.passwordMin')}</p>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? <Spinner className="mr-2 h-4 w-4" /> : null}
              {t('auth.createAccountBtn')}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-600 text-sm">
              {t('auth.haveAccount')}{' '}
              <button
                onClick={() => navigate('/auth/login')}
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
