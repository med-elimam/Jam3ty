import { Card } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { useAdminI18n } from '@/contexts/AdminI18nContext';
import { useGetAdminDashboardStats } from '@workspace/api-client-react';
import AdminLayout from '@/components/AdminLayout';

export default function AdminDashboard() {
  const { t } = useAdminI18n();
  const { data, isLoading: loading } = useGetAdminDashboardStats();
  const stats = data?.data;

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-full">
          <Spinner />
        </div>
      </AdminLayout>
    );
  }

  const statCards = [
    { label: 'overview.totalUsers', value: stats?.totalUsers || 0, icon: '👥' },
    { label: 'overview.totalStudents', value: stats?.totalStudents || 0, icon: '🎓' },
    { label: 'overview.totalUniversities', value: stats?.totalUniversities || 0, icon: '🏫' },
    { label: 'overview.totalCourses', value: stats?.totalCourses || 0, icon: '📚' },
    { label: 'overview.totalFiles', value: stats?.totalFiles || 0, icon: '📄' },
    { label: 'overview.activeSubscriptions', value: stats?.activeSubscriptions || 0, icon: '⭐' },
  ];

  return (
    <AdminLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">{t('overview.title')}</h1>

        {/* Stats grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {statCards.map((stat, idx) => (
            <Card key={idx} className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">{t(stat.label)}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
                </div>
                <div className="text-4xl">{stat.icon}</div>
              </div>
            </Card>
          ))}
        </div>

        {/* Recent activity placeholder */}
        <Card className="p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">{t('overview.latestActivity')}</h2>
          <p className="text-gray-500">{t('common.noData')}</p>
        </Card>
      </div>
    </AdminLayout>
  );
}
