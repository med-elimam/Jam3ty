import { useLocation } from 'wouter';
import { Card } from '@/components/ui/card';
import { useI18n } from '@/contexts/I18nContext';
import Layout from '@/components/Layout';

const modules = [
  { path: '/files', label: 'screens.files', icon: '📄' },
  { path: '/announcements', label: 'screens.announcements', icon: '📢' },
  { path: '/assignments', label: 'screens.assignments', icon: '✏️' },
  { path: '/exams', label: 'screens.exams', icon: '📝' },
  { path: '/events', label: 'screens.events', icon: '🎉' },
  { path: '/clubs', label: 'screens.clubs', icon: '🎯' },
  { path: '/opportunities', label: 'screens.opportunities', icon: '🚀' },
  { path: '/ai', label: 'screens.ai', icon: '🤖' },
  { path: '/subscription', label: 'screens.subscription', icon: '⭐' },
  { path: '/notifications', label: 'screens.notifications', icon: '🔔' },
];

export default function More() {
  const [, navigate] = useLocation();
  const { t } = useI18n();

  return (
    <Layout>
      <div className="p-6 max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">{t('screens.more')}</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {modules.map((module) => (
            <Card
              key={module.path}
              className="p-6 cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => navigate(module.path)}
            >
              <div className="text-4xl mb-3">{module.icon}</div>
              <h3 className="font-bold text-gray-900">{t(module.label)}</h3>
            </Card>
          ))}
        </div>
      </div>
    </Layout>
  );
}
