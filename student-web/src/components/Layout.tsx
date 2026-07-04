import { useState } from 'react';
import { useLocation } from 'wouter';
import {
  Bell,
  BookOpen,
  CalendarDays,
  Files,
  Grid3X3,
  Home,
  LogOut,
  Menu,
  Settings,
  UserRound,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useI18n } from '@/contexts/I18nContext';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { useLogout } from '@workspace/api-client-react';
import { toast } from 'sonner';

interface LayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { path: '/', label: 'nav.home', icon: Home },
  { path: '/courses', label: 'nav.courses', icon: BookOpen },
  { path: '/timetable', label: 'nav.timetable', icon: CalendarDays },
  { path: '/files', label: 'screens.files', icon: Files },
  { path: '/announcements', label: 'screens.announcements', icon: Bell },
  { path: '/profile', label: 'nav.profile', icon: UserRound },
  { path: '/more', label: 'nav.more', icon: Grid3X3 },
];

export default function Layout({ children }: LayoutProps) {
  const [location, navigate] = useLocation();
  const { t, lang, setLang, isRTL } = useI18n();
  const { mutate: logoutMutate } = useLogout();
  const { signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    const refreshToken =
      typeof window !== 'undefined' ? localStorage.getItem('auth_refresh_token') : null;
    signOut();
    if (refreshToken) {
      logoutMutate({ data: { refreshToken } });
    }
    navigate('/login');
    toast.success(t('auth.loggedOut'));
  };

  const toggleLanguage = () => setLang(lang === 'ar' ? 'fr' : 'ar');

  return (
    <div className="student-surface student-layout" dir={isRTL ? 'rtl' : 'ltr'}>
      <aside
        data-open={sidebarOpen ? 'true' : 'false'}
        data-side={isRTL ? 'right' : 'left'}
        className="student-sidebar"
      >
        <div className="border-b border-sidebar-border p-5">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-xl bg-primary text-lg font-black text-primary-foreground">
              ج
            </div>
            <div>
              <h1 className="text-xl font-bold text-sidebar-foreground">{t('brand.appName')}</h1>
              <p className="text-xs text-muted-foreground">{t('brand.tagline')}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = location === item.path;
            return (
              <button
                key={item.path}
                onClick={() => {
                  navigate(item.path);
                  setSidebarOpen(false);
                }}
                className={cn('student-nav-item student-focus', active && 'student-nav-item-active')}
              >
                <Icon className="size-5 shrink-0" />
                <span className="min-w-0 truncate">{t(item.label)}</span>
              </button>
            );
          })}
        </nav>

        <div className="student-sidebar-actions">
          <Button variant="outline" className="student-language-button" onClick={toggleLanguage}>
            <span>{t('common.language')}</span>
            <span className="text-xs font-bold">{lang === 'ar' ? 'FR' : 'AR'}</span>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="student-settings-button">
                <Settings className="size-4" />
                {t('common.settings')}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={isRTL ? 'end' : 'start'} className="w-56">
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="size-4" />
                {t('common.logout')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      <div className="student-main">
        <header className="student-mobile-header" data-side={isRTL ? 'right' : 'left'}>
          <h1 className="text-lg font-bold text-primary">{t('brand.appName')}</h1>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="student-focus rounded-lg p-2 hover:bg-secondary"
            aria-label={t('nav.more')}
          >
            {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </header>

        {sidebarOpen && (
          <div
            className="fixed inset-0 z-30 bg-slate-950/40 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
