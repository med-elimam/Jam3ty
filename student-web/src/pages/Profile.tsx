import { Card } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { useI18n } from '@/contexts/I18nContext';
import { useGetProfile, useGetMe } from '@workspace/api-client-react';
import Layout from '@/components/Layout';

export default function Profile() {
  const { t } = useI18n();
  const { data: profileData, isLoading: loadingProfile } = useGetProfile();
  const { data: meData, isLoading: loadingMe } = useGetMe();

  const loading = loadingProfile || loadingMe;
  // Prefer full profile; fall back to /me data
  const userData = (profileData as any) ?? (meData as any);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <Spinner />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6 max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">{t('profile.title')}</h1>

        <Card className="p-6">
          <div className="mb-6">
            <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center text-3xl mb-4">
              👤
            </div>
            <h2 className="text-2xl font-bold text-gray-900">{userData?.fullName}</h2>
            <p className="text-gray-600">{userData?.email}</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('profile.myUniversity')}
              </label>
              <p className="text-gray-900">{userData?.university || '—'}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('profile.myFaculty')}
              </label>
              <p className="text-gray-900">{userData?.faculty || '—'}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('profile.myDepartment')}
              </label>
              <p className="text-gray-900">{userData?.department || '—'}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('profile.myLevel')}
              </label>
              <p className="text-gray-900">{userData?.level || '—'}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('profile.phone')}
              </label>
              <p className="text-gray-900">{userData?.phone || '—'}</p>
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              {t('profile.editProfile')}
            </button>
          </div>
        </Card>
      </div>
    </Layout>
  );
}
