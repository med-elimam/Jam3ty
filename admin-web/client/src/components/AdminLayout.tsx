import { useState } from 'react';
import { useLocation } from 'wouter';
import { Menu, X, LogOut, Globe, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAdminI18n } from '@/contexts/AdminI18nContext';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { toast } from 'sonner';
import type { Lang } from '@/i18n/admin-translations';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface AdminLayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { path: '/admin/dashboard', label: 'nav.overview', icon: '📊' },
  { path: '/admin/universities', label: 'nav.universities', icon: '🏫' },
  { path: '/admin/academic-structure', label: 'nav.academicStructure', icon: '📚' },
  { path: '/admin/users', label: 'nav.users', icon: '👥' },
  { path: '/admin/courses', label: 'nav.courses', icon: '📖' },
  { path: '/admin/files', label: 'nav.files', icon: '📄' },
  { path: '/admin/announcements', label: 'nav.announcements', icon: '📢' },
  { path: '/admin/timetable', label: 'nav.timetable', icon: '📅' },
  { path: '/admin/assignments', label: 'nav.assignments', icon: '✏️' },
  { path: '/admin/exams', label: 'nav.exams', icon: '📝' },
  { path: '/admin/community', label: 'nav.community', icon: '💬' },
  { path: '/admin/opportunities', label: 'nav.opportunities', icon: '🚀' },
  { path: '/admin/events', label: 'nav.events', icon: '🎉' },
  { path: '/admin/clubs', label: 'nav.clubs', icon: '🎯' },
  { path: '/admin/subscriptions', label: 'nav.subscriptions', icon: '⭐' },
  { path: '/admin/payments', label: 'nav.payments', icon: '💳' },
  { path: '/admin/agents', label: 'nav.agents', icon: '🤝' },
  { path: '/admin/settings', label: 'nav.settings', icon: '⚙️' },
];

const LANGUAGES: { code: Lang; label: string }[] = [
  { code: 'ar', label: 'العربية' },
  { code: 'fr', label: 'Français' },
];

function Brand({ t }: { t: (key: string) => string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
        ج
      </span>
      <div className="min-w-0">
        <p className="truncate text-base font-bold leading-tight text-foreground">{t('nav.brand')}</p>
        <p className="truncate text-xs text-muted-foreground">{t('nav.brandSubtitle')}</p>
      </div>
    </div>
  );
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [location, navigate] = useLocation();
  const { t, lang, setLang, isRTL } = useAdminI18n();
  const { signOut } = useAdminAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    signOut();
    navigate('/admin/login');
    toast.success(t('common.logout'));
  };

  const currentLabel = LANGUAGES.find((l) => l.code === lang)?.label ?? '';

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? 'translate-x-0' : (isRTL ? 'translate-x-full' : '-translate-x-full')
        } fixed ${isRTL ? 'right-0 border-s' : 'left-0 border-e'} top-0 z-40 flex h-screen w-64 flex-col border-border bg-card transition-transform duration-300 md:static md:translate-x-0`}
      >
        <div className="border-b border-border p-5">
          <Brand t={t} />
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {navItems.map((item) => {
            const active = location === item.path;
            return (
              <button
                key={item.path}
                onClick={() => {
                  navigate(item.path);
                  setSidebarOpen(false);
                }}
                className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-start text-sm font-medium transition-colors ${
                  active
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <span className="text-base leading-none">{item.icon}</span>
                <span className="truncate">{t(item.label)}</span>
              </button>
            );
          })}
        </nav>

        <div className="space-y-2 border-t border-border p-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-full justify-start">
                <Globe className="h-4 w-4" />
                <span className="truncate">{currentLabel}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={isRTL ? 'end' : 'start'} className="w-[13.5rem]">
              {LANGUAGES.map((l) => (
                <DropdownMenuItem
                  key={l.code}
                  onClick={() => setLang(l.code)}
                  className="justify-between"
                >
                  <span>{l.label}</span>
                  {lang === l.code ? <Check className="h-4 w-4 text-primary" /> : null}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="outline"
            className="w-full justify-start text-destructive hover:text-destructive"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
            <span className="truncate">{t('common.logout')}</span>
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Mobile header */}
        <header className="flex items-center justify-between border-b border-border bg-card px-4 py-3 md:hidden">
          <Brand t={t} />
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="rounded-md p-2 text-foreground hover:bg-muted"
            aria-label="Menu"
          >
            {sidebarOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </header>

        {/* Overlay for mobile */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/50 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Page content */}
        <main className="flex-1 overflow-auto bg-background">{children}</main>
      </div>
    </div>
  );
}
