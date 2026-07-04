import { useState } from 'react';
import { useLocation } from 'wouter';
import { Menu, X, LogOut, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAdminI18n } from '@/contexts/AdminI18nContext';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { toast } from 'sonner';
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

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [location, navigate] = useLocation();
  const { t, lang, setLang, isRTL } = useAdminI18n();
  const { signOut } = useAdminAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    signOut();
    navigate('/admin/login');
    toast.success('Logged out');
  };

  const toggleLanguage = () => {
    setLang(lang === 'ar' ? 'fr' : 'ar');
  };

  return (
    <div className={`flex h-screen ${isRTL ? 'flex-row-reverse' : ''}`}>
      {/* Sidebar */}
      <div
        className={`${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } fixed ${isRTL ? 'right-0' : 'left-0'} top-0 z-40 h-screen w-64 bg-white shadow-lg transition-transform duration-300 md:translate-x-0 md:static overflow-y-auto`}
      >
        <div className="p-6 border-b">
          <h1 className="text-2xl font-bold text-blue-600">{t('nav.dashboard')}</h1>
        </div>

        <nav className="space-y-1 px-4 py-6">
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => {
                navigate(item.path);
                setSidebarOpen(false);
              }}
              className={`w-full text-left px-4 py-2 rounded-lg transition-colors text-sm ${
                location === item.path
                  ? 'bg-blue-100 text-blue-700 font-medium'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <span className="mr-3">{item.icon}</span>
              {t(item.label)}
            </button>
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t bg-white">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-full justify-start text-sm">
                <Globe className="mr-2 h-4 w-4" />
                {lang === 'ar' ? 'Français' : 'العربية'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={isRTL ? 'end' : 'start'} className="w-56">
              <DropdownMenuItem onClick={toggleLanguage}>
                {lang === 'ar' ? 'Français' : 'العربية'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                {t('common.logout')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-4 py-4 flex items-center justify-between md:hidden">
          <h1 className="text-xl font-bold text-blue-600">{t('nav.dashboard')}</h1>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </header>

        {/* Overlay for mobile */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Page content */}
        <main className="flex-1 overflow-auto bg-gray-50">
          {children}
        </main>
      </div>
    </div>
  );
}
