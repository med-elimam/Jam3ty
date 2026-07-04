import { Check, Crown } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useI18n } from '@/contexts/I18nContext';
import { useListPlans } from '@workspace/api-client-react';
import Layout from '@/components/Layout';
import {
  EmptyState,
  ErrorState,
  PageHeader,
  PageShell,
  PageSkeleton,
  chooseLocalized,
  getResponseData,
} from '@/components/student/StudentUI';

export default function Subscription() {
  const { t, lang } = useI18n();
  const { data: plansData, isLoading, isError } = useListPlans();
  const plans = getResponseData<any>(plansData).filter((plan) => plan.isActive !== false);

  if (isLoading) {
    return (
      <Layout>
        <PageSkeleton cards={3} />
      </Layout>
    );
  }

  return (
    <Layout>
      <PageShell>
        <PageHeader
          title={t('subscription.title')}
          description={`${t('subscription.currentPlan')}: ${t('subscription.freePlan')}`}
        />

        {isError ? (
          <ErrorState />
        ) : plans.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {plans.map((plan: any) => (
              <Card key={plan.id} className="student-card student-card-hover rounded-xl p-6 shadow-none">
                <div className="mb-5 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-primary">{plan.durationDays} يوم</p>
                    <h3 className="mt-1 text-xl font-bold text-foreground">
                      {chooseLocalized(plan, lang, plan.name)}
                    </h3>
                  </div>
                  <div className="flex size-11 items-center justify-center rounded-xl bg-accent/30 text-amber-900">
                    <Crown className="size-5" />
                  </div>
                </div>
                <p className="text-3xl font-black text-primary">{plan.priceMru} MRU</p>
                {Array.isArray(plan.features) && plan.features.length > 0 ? (
                  <ul className="mt-6 space-y-3 text-sm text-muted-foreground">
                    {plan.features.map((feature: string) => (
                      <li key={feature} className="flex items-start gap-2">
                        <Check className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState icon={Crown} title={t('subscription.freePlan')} body={t('subscription.emptyBody')} />
        )}
      </PageShell>
    </Layout>
  );
}
