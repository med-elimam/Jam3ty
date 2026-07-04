import { Card } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { useI18n } from '@/contexts/I18nContext';
import { useListOpportunities } from '@workspace/api-client-react';
import Layout from '@/components/Layout';

export default function Opportunities() {
  const { t } = useI18n();
  const { data: opportunitiesData, isLoading: loading } = useListOpportunities();
  const opportunities = Array.isArray(opportunitiesData) ? opportunitiesData : (opportunitiesData as any)?.data ?? [];

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
        <h1 className="text-3xl font-bold text-gray-900 mb-6">{t('opportunities.title')}</h1>

        {opportunities.length > 0 ? (
          <div className="space-y-4">
            {opportunities.map((opp: any) => (
              <Card key={opp.id} className="p-6">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="text-lg font-bold text-gray-900">{opp.title}</h3>
                  <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                    {opp.type}
                  </span>
                </div>
                <p className="text-gray-600 mb-4">{opp.description}</p>
                <div className="text-sm text-gray-600 mb-4">
                  <p>{t('opportunities.deadline')}: {opp.deadline}</p>
                </div>
                <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  {t('opportunities.apply')}
                </button>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-500">{t('opportunities.noOpportunities')}</p>
        )}
      </div>
    </Layout>
  );
}
