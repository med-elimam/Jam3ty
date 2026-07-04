import { Card } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { useI18n } from '@/contexts/I18nContext';
import { useGetTimetable } from '@workspace/api-client-react';
import Layout from '@/components/Layout';

export default function Timetable() {
  const { t } = useI18n();
  const { data: timetableData, isLoading: loading } = useGetTimetable();
  const sessions = Array.isArray(timetableData) ? timetableData : (timetableData as any)?.data ?? [];

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
      <div className="p-6 max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">{t('timetable.title')}</h1>
        <p className="text-gray-600 mb-6">{t('timetable.thisWeek')}</p>

        {sessions.length > 0 ? (
          <div className="space-y-4">
            {sessions.map((session: any) => (
              <Card key={session.id} className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{session.courseName}</h3>
                    <p className="text-gray-600 mt-1">{session.type}</p>
                  </div>
                  <span className="text-sm font-medium text-blue-600">{session.time}</span>
                </div>
                <div className="mt-4 text-sm text-gray-600">
                  <p>{t('timetable.room')}: {session.room}</p>
                  <p>{t('timetable.professor')}: {session.professor}</p>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">{t('timetable.emptyTitle')}</p>
            <p className="text-gray-400">{t('timetable.emptyBody')}</p>
          </div>
        )}
      </div>
    </Layout>
  );
}
