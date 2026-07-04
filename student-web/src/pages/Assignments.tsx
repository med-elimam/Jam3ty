import { Card } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { useI18n } from '@/contexts/I18nContext';
import { useListAssignments } from '@workspace/api-client-react';
import Layout from '@/components/Layout';

export default function Assignments() {
  const { t } = useI18n();
  const { data: assignmentsData, isLoading: loading } = useListAssignments();
  const assignments = Array.isArray(assignmentsData) ? assignmentsData : (assignmentsData as any)?.data ?? [];

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
        <h1 className="text-3xl font-bold text-gray-900 mb-6">{t('assignments.title')}</h1>

        {assignments.length > 0 ? (
          <div className="space-y-4">
            {assignments.map((assignment: any) => (
              <Card key={assignment.id} className="p-6">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="text-lg font-bold text-gray-900">{assignment.title}</h3>
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                    {assignment.status}
                  </span>
                </div>
                <p className="text-gray-600 mb-4">{assignment.description}</p>
                <div className="text-sm text-gray-600">
                  <p>{t('assignments.dueDate')}: {assignment.dueDate}</p>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-500">{t('assignments.noAssignments')}</p>
        )}
      </div>
    </Layout>
  );
}
