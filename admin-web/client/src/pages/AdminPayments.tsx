import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { useAdminI18n } from '@/contexts/AdminI18nContext';
import AdminLayout from '@/components/AdminLayout';
import { toast } from 'sonner';
import {
  useListAdminPayments,
  useApproveAdminPayment,
  useRejectAdminPayment,
  getListAdminPaymentsQueryKey,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';

const statusLabelKey: Record<string, string> = {
  pending: 'payments.pending',
  under_review: 'payments.pending',
  approved: 'payments.approved',
  rejected: 'payments.rejected',
  expired: 'payments.rejected',
  refunded: 'payments.rejected',
};

export default function AdminPayments() {
  const { t } = useAdminI18n();
  const queryClient = useQueryClient();
  const { data, isLoading } = useListAdminPayments();
  const approveMutation = useApproveAdminPayment();
  const rejectMutation = useRejectAdminPayment();

  const payments = data?.data ?? [];

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getListAdminPaymentsQueryKey() });
  };

  const handleApprove = (paymentId: string) => {
    approveMutation.mutate(
      { paymentId },
      {
        onSuccess: () => {
          toast.success(t('common.success'));
          invalidate();
        },
        onError: () => toast.error(t('common.error')),
      },
    );
  };

  const handleReject = (paymentId: string) => {
    rejectMutation.mutate(
      { paymentId, data: {} },
      {
        onSuccess: () => {
          toast.success(t('common.success'));
          invalidate();
        },
        onError: () => toast.error(t('common.error')),
      },
    );
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-full">
          <Spinner />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">{t('payments.title')}</h1>

        {payments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">{t('payments.user')}</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">{t('payments.amount')}</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">{t('payments.method')}</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">{t('payments.status')}</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-700"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {payments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {payment.userFullName ?? payment.userId}
                      <div className="text-xs text-gray-500">{payment.userEmail}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{payment.amountMru} MRU</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{payment.method}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                        {t(statusLabelKey[payment.status] ?? 'payments.pending')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {(payment.status === 'pending' || payment.status === 'under_review') && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            disabled={approveMutation.isPending || rejectMutation.isPending}
                            onClick={() => handleApprove(payment.id)}
                          >
                            {t('payments.approve')}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600"
                            disabled={approveMutation.isPending || rejectMutation.isPending}
                            onClick={() => handleReject(payment.id)}
                          >
                            {t('payments.reject')}
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Card className="p-12 text-center">
            <p className="text-gray-500">{t('common.noData')}</p>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
