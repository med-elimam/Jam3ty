import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/contexts/I18nContext';
import { useApi } from '@/hooks/useApi';
import Layout from '@/components/Layout';

export default function Subscription() {
  const { t } = useI18n();
  const { getSubscriptionPlans } = useApi();
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const result = await getSubscriptionPlans();
      if (result.success) setPlans(result.plans || []);
      setLoading(false);
    };
    load();
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('subscription.title')}</h1>
        <p className="text-gray-600 mb-8">{t('subscription.currentPlan')}: {t('subscription.freePlan')}</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.length > 0 ? (
            plans.map((plan: any) => (
              <Card
                key={plan.id}
                className={`p-6 ${plan.featured ? 'ring-2 ring-blue-600' : ''}`}
              >
                <h3 className="text-xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                <p className="text-3xl font-bold text-blue-600 mb-4">{plan.price} MRU</p>
                <p className="text-gray-600 mb-6">{plan.duration}</p>
                <ul className="space-y-2 mb-6 text-sm text-gray-700">
                  {plan.features?.map((feature: string, idx: number) => (
                    <li key={idx}>✓ {feature}</li>
                  ))}
                </ul>
                <Button className="w-full">{t('subscription.subscribeNow')}</Button>
              </Card>
            ))
          ) : (
            <p className="text-center text-gray-500 col-span-3">{t('common.comingSoonTitle')}</p>
          )}
        </div>
      </div>
    </Layout>
  );
}
