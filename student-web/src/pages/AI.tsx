import { Bot } from 'lucide-react';
import { useI18n } from '@/contexts/I18nContext';
import Layout from '@/components/Layout';
import { EmptyState, PageHeader, PageShell } from '@/components/student/StudentUI';

export default function AI() {
  const { t } = useI18n();

  return (
    <Layout>
      <PageShell className="max-w-4xl">
        <PageHeader title={t('screens.ai')} description={t('ai.unavailableBody')} />
        <EmptyState icon={Bot} title={t('ai.unavailableTitle')} body={t('ai.unavailableBody')} />
      </PageShell>
    </Layout>
  );
}
