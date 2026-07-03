import { Card } from '@/components/ui/card';
import { useAdminI18n } from '@/contexts/AdminI18nContext';
import AdminLayout from '@/components/AdminLayout';

interface AdminPlaceholderProps {
  title: string;
  icon: string;
}

export function AdminPlaceholder({ title, icon }: AdminPlaceholderProps) {
  const { t } = useAdminI18n();

  return (
    <AdminLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">{title}</h1>
        <Card className="p-12 text-center">
          <div className="text-6xl mb-4">{icon}</div>
          <p className="text-gray-500 text-lg">{t('common.notImplemented')}</p>
        </Card>
      </div>
    </AdminLayout>
  );
}
