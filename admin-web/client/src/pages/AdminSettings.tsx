import { useLocation } from 'wouter';
import { Check, LogOut } from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { useAdminI18n } from '@/contexts/AdminI18nContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import type { Lang } from '@/i18n/admin-translations';

const LANGUAGES: { code: Lang; label: string; direction: string }[] = [
  { code: 'ar', label: 'العربية', direction: 'RTL' },
  { code: 'fr', label: 'Français', direction: 'LTR' },
];

const copy = {
  ar: {
    session: 'الجلسة والحساب',
    localPreferences: 'تفضيلات الواجهة المحلية',
    systemSettings: 'إعدادات النظام المتقدمة',
    systemBlocked: 'لا يوجد جدول settings أو system_config في قاعدة البيانات الحالية، لذلك لا توجد إعدادات نظام متقدمة يمكن تعديلها بأمان الآن.',
    languageDescription: 'يتم حفظ اللغة محليًا لهذا المتصفح وتنعكس فورًا على اتجاه الواجهة.',
    accountDescription: 'بيانات الحساب الحالية من جلسة المسؤول النشطة.',
    name: 'الاسم',
    role: 'الدور',
    email: 'البريد الإلكتروني',
    direction: 'الاتجاه',
    activeLanguage: 'اللغة الحالية',
    logoutNow: 'تسجيل الخروج الآن',
    languageSaved: 'تم تحديث اللغة.',
  },
  fr: {
    session: 'Session et compte',
    localPreferences: 'Préférences locales',
    systemSettings: 'Paramètres système avancés',
    systemBlocked: 'Aucune table settings ou system_config n’existe dans la base actuelle, donc aucun paramètre système avancé ne peut être modifié en sécurité maintenant.',
    languageDescription: 'La langue est enregistrée localement pour ce navigateur et change immédiatement la direction de l’interface.',
    accountDescription: 'Informations du compte courant depuis la session administrateur active.',
    name: 'Nom',
    role: 'Rôle',
    email: 'E-mail',
    direction: 'Direction',
    activeLanguage: 'Langue active',
    logoutNow: 'Se déconnecter maintenant',
    languageSaved: 'Langue mise à jour.',
  },
} as const;

export default function AdminSettings() {
  const { t, lang, setLang } = useAdminI18n();
  const { user, signOut } = useAdminAuth();
  const [, navigate] = useLocation();
  const c = copy[lang];

  function changeLanguage(nextLang: Lang) {
    setLang(nextLang);
    toast.success(copy[nextLang].languageSaved);
  }

  function logout() {
    signOut();
    navigate('/admin/login');
    toast.success(t('common.logout'));
  }

  return (
    <AdminLayout>
      <div className="mx-auto max-w-5xl p-6">
        <h1 className="mb-6 text-3xl font-bold text-foreground">{t('settings.title')}</h1>

        <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          <Card className="p-6">
            <div className="mb-5">
              <h2 className="text-xl font-semibold text-foreground">{c.localPreferences}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{c.languageDescription}</p>
            </div>
            <div className="space-y-3">
              {LANGUAGES.map((item) => (
                <button
                  key={item.code}
                  type="button"
                  onClick={() => changeLanguage(item.code)}
                  className={`flex w-full items-center justify-between rounded-md border px-4 py-3 text-start transition-colors ${
                    lang === item.code ? 'border-primary bg-primary/10 text-primary' : 'border-border text-foreground hover:bg-muted'
                  }`}
                >
                  <span>
                    <span className="block font-medium">{item.label}</span>
                    <span className="block text-xs text-muted-foreground">{c.direction}: {item.direction}</span>
                  </span>
                  {lang === item.code ? <Check className="h-4 w-4" /> : null}
                </button>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <div className="mb-5">
              <h2 className="text-xl font-semibold text-foreground">{c.session}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{c.accountDescription}</p>
            </div>
            <dl className="space-y-4 text-sm">
              <div className="flex items-center justify-between gap-4 border-b border-border pb-3">
                <dt className="text-muted-foreground">{c.name}</dt>
                <dd className="font-medium text-foreground">{user?.fullName ?? '-'}</dd>
              </div>
              <div className="flex items-center justify-between gap-4 border-b border-border pb-3">
                <dt className="text-muted-foreground">{c.email}</dt>
                <dd className="font-medium text-foreground" dir="ltr">{user?.email ?? '-'}</dd>
              </div>
              <div className="flex items-center justify-between gap-4 border-b border-border pb-3">
                <dt className="text-muted-foreground">{c.role}</dt>
                <dd className="font-medium text-foreground">{user?.role ?? '-'}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-muted-foreground">{c.activeLanguage}</dt>
                <dd className="font-medium text-foreground">{LANGUAGES.find((item) => item.code === lang)?.label}</dd>
              </div>
            </dl>
            <Button className="mt-6 w-full" variant="outline" onClick={logout}>
              <LogOut className="me-2 h-4 w-4" />
              {c.logoutNow}
            </Button>
          </Card>

          <Card className="p-6 lg:col-span-2">
            <h2 className="text-xl font-semibold text-foreground">{c.systemSettings}</h2>
            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">{c.systemBlocked}</p>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
