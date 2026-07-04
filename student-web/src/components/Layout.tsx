import { useState } from 'react';
import { useLocation } from 'wouter';
import { Menu, X, LogOut, Settings, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/contexts/I18nContext';
import { useLogout } from '@workspace/api-client-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface LayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { path: '/', label: 'nav.home', icon: '🏠' },
  { path: '/courses', label: 'nav.courses', icon: '📚' },
  { path: '/timetable', label: 'nav.timetable', icon: '📅' },
  { path: '/community', label: 'nav.community', icon: '👥' },
  { path: '/profile', label: 'nav.profile', icon: '👤' },
  { path: '/more', label: 'nav.more', icon: '⋯' },
];

export default function Layout({ children }: LayoutProps) {
  const [location, navigate] = useLocation();
  const { t, lang, setLang, isRTL } = useI18n();
  const { mutate: logoutMutate } = useLogout();
  const { signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    signOut();
    logoutMutate({});
    navigate('/login');
    toast.success('Logged out successfully');
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
        } fixed ${isRTL ? 'right-0' : 'left-0'} top-0 z-40 h-screen w-64 bg-white shadow-lg transition-transform duration-300 md:translate-x-0 md:static`}
      >
        <div className="p-6">
          <h1 className="text-2xl font-bold text-blue-600">{t('brand.appName')}</h1>
        </div>

        <nav className="space-y-2 px-4">
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => {
                navigate(item.path);
                setSidebarOpen(false);
              }}
              className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
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

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-full justify-start">
                <Settings className="mr-2 h-4 w-4" />
                {t('common.settings')}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={isRTL ? 'end' : 'start'} className="w-56">
              <DropdownMenuItem onClick={toggleLanguage}>
                <Globe className="mr-2 h-4 w-4" />
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
          <h1 className="text-xl font-bold text-blue-600">{t('brand.appName')}</h1>
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
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
