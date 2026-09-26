import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CreditCard } from 'lucide-react';
import { adminService } from '../../services/adminService';
import { getErrorMessage } from '../../services/api';
import PageHeader from '../../components/common/PageHeader';
import StatusBadge from '../../components/common/StatusBadge';
import Alert from '../../components/ui/Alert';
import EmptyState from '../../components/ui/EmptyState';
import Select from '../../components/ui/Select';
import Skeleton from '../../components/ui/Skeleton';
import Table from '../../components/ui/Table';
import { formatCurrency, formatDateTime } from '../../utils/format';

export default function AdminPaymentsPage() {
  const [status, setStatus] = useState('');

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['admin', 'payments', { status }],
    queryFn: () => adminService.listPayments(status ? { status } : {}),
  });

  const payments = data?.payments || [];

  return (
    <div>
      <PageHeader title="Payments" subtitle="Gateway orders and settlements" />

      <div className="mb-4 max-w-xs">
        <Select
          label="Status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          options={[
            { value: '', label: 'All' },
            { value: 'CREATED', label: 'Created' },
            { value: 'PENDING', label: 'Pending' },
            { value: 'SUCCESS', label: 'Success' },
            { value: 'FAILED', label: 'Failed' },
            { value: 'REFUNDED', label: 'Refunded' },
          ]}
        />
      </div>

      {isLoading ? <Skeleton className="h-48 w-full" /> : null}
      {isError ? <Alert tone="error">{getErrorMessage(error)}</Alert> : null}

      {!isLoading && !payments.length ? (
        <EmptyState icon={CreditCard} title="No payments" />
      ) : (
        <Table
          keyField="_id"
          columns={[
            {
              key: 'booking',
              header: 'Booking',
              render: (row) => row.bookingId?.bookingNumber || '—',
            },
            {
              key: 'user',
              header: 'Customer',
              render: (row) => row.userId?.name || row.userId?.email || '—',
            },
            {
              key: 'amount',
              header: 'Amount',
              render: (row) => formatCurrency(row.amount, row.currency),
            },
            { key: 'gateway', header: 'Gateway' },
            {
              key: 'gatewayOrderId',
              header: 'Order ID',
              render: (row) => (
                <span className="font-mono text-xs">{row.gatewayOrderId || '—'}</span>
              ),
            },
            {
              key: 'status',
              header: 'Status',
              render: (row) => <StatusBadge status={row.status} type="payment" />,
            },
            {
              key: 'paidAt',
              header: 'Paid at',
              render: (row) => formatDateTime(row.paidAt || row.createdAt),
            },
          ]}
          rows={payments}
        />
      )}
    </div>
  );
}
