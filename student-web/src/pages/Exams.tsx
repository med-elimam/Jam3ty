import { Card } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { useI18n } from '@/contexts/I18nContext';
import { useListExams } from '@workspace/api-client-react';
import Layout from '@/components/Layout';

export default function Exams() {
  const { t } = useI18n();
  const { data: examsData, isLoading: loading } = useListExams();
  const exams = Array.isArray(examsData) ? examsData : (examsData as any)?.data ?? [];

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
      <div className="p-6 max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">{t('exams.title')}</h1>

        {exams.length > 0 ? (
          <div className="space-y-4">
            {exams.map((exam: any) => (
              <Card key={exam.id} className="p-6 border-l-4 border-red-400">
                <h3 className="text-lg font-bold text-gray-900 mb-3">{exam.courseName}</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">{t('exams.date')}</p>
                    <p className="font-medium text-gray-900">{exam.date}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">{t('exams.time')}</p>
                    <p className="font-medium text-gray-900">{exam.time}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">{t('exams.location')}</p>
                    <p className="font-medium text-gray-900">{exam.location}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">{t('exams.type')}</p>
                    <p className="font-medium text-gray-900">{exam.type}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-500">{t('exams.noExams')}</p>
        )}
      </div>
    </Layout>
  );
}
