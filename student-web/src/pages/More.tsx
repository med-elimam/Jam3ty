import { useLocation } from 'wouter';
import {
  Bell,
  Bot,
  BriefcaseBusiness,
  CalendarDays,
  FileText,
  Megaphone,
  Rocket,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useI18n } from '@/contexts/I18nContext';
import Layout from '@/components/Layout';
import { PageHeader, PageShell } from '@/components/student/StudentUI';

const modules = [
  { path: '/files', label: 'screens.files', icon: FileText },
  { path: '/announcements', label: 'screens.announcements', icon: Megaphone },
  { path: '/assignments', label: 'screens.assignments', icon: Rocket },
  { path: '/exams', label: 'screens.exams', icon: ShieldCheck },
  { path: '/events', label: 'screens.events', icon: CalendarDays },
  { path: '/clubs', label: 'screens.clubs', icon: Users },
  { path: '/opportunities', label: 'screens.opportunities', icon: BriefcaseBusiness },
  { path: '/ai', label: 'screens.ai', icon: Bot },
  { path: '/subscription', label: 'screens.subscription', icon: Sparkles },
  { path: '/notifications', label: 'screens.notifications', icon: Bell },
];

export default function More() {
  const [, navigate] = useLocation();
  const { t } = useI18n();

  return (
    <Layout>
      <PageShell>
        <PageHeader title={t('screens.more')} description={t('home.allModules')} />

        <div className="student-module-grid">
          {modules.map((module) => {
            const Icon = module.icon;
            return (
              <Card
                key={module.path}
                className="student-module-card student-card student-card-hover"
                onClick={() => navigate(module.path)}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') navigate(module.path);
                }}
              >
                <div className="mb-5 flex size-12 items-center justify-center rounded-xl bg-secondary text-primary">
                  <Icon className="size-6" />
                </div>
                <h3 className="font-bold text-foreground">{t(module.label)}</h3>
              </Card>
            );
          })}
        </div>
      </PageShell>
    </Layout>
  );
}
