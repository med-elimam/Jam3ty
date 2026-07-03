import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { useI18n } from '@/contexts/I18nContext';
import { useApi } from '@/hooks/useApi';
import Layout from '@/components/Layout';

export default function Courses() {
  const { t } = useI18n();
  const { getCourses } = useApi();
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCourses = async () => {
      const result = await getCourses();
      if (result.success) {
        setCourses(result.courses || []);
      }
      setLoading(false);
    };

    loadCourses();
  }, []);

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
        <h1 className="text-3xl font-bold text-gray-900 mb-6">{t('courses.title')}</h1>

        {courses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course: any) => (
              <Card key={course.id} className="p-6 hover:shadow-lg transition-shadow">
                <h3 className="text-xl font-bold text-gray-900 mb-2">{course.name}</h3>
                <p className="text-gray-600 mb-4">{course.code}</p>
                <div className="space-y-2 text-sm">
                  <p>
                    <span className="font-medium text-gray-700">{t('courses.professor')}:</span>{' '}
                    <span className="text-gray-600">{course.professor}</span>
                  </p>
                  <p>
                    <span className="font-medium text-gray-700">{t('courses.credits')}:</span>{' '}
                    <span className="text-gray-600">{course.credits}</span>
                  </p>
                </div>
                <button className="mt-4 w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  {t('courses.viewDetails')}
                </button>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">{t('courses.noCourses')}</p>
          </div>
        )}
      </div>
    </Layout>
  );
}
