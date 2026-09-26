import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminService } from '../../services/adminService';
import { getErrorMessage } from '../../services/api';
import PageHeader from '../../components/common/PageHeader';
import Alert from '../../components/ui/Alert';
import Input from '../../components/ui/Input';
import Skeleton from '../../components/ui/Skeleton';
import Table from '../../components/ui/Table';
import { formatCurrency } from '../../utils/format';

export default function AdminReportsPage() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const params = {
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
  };

  const revenueQuery = useQuery({
    queryKey: ['admin', 'reports', 'revenue', params],
    queryFn: () => adminService.revenueReport(params),
  });
  const bookingsQuery = useQuery({
    queryKey: ['admin', 'reports', 'bookings', params],
    queryFn: () => adminService.bookingsReport(params),
  });
  const ridesQuery = useQuery({
    queryKey: ['admin', 'reports', 'rides', params],
    queryFn: () => adminService.ridesReport(params),
  });

  const loading = revenueQuery.isLoading || bookingsQuery.isLoading || ridesQuery.isLoading;
  const err = revenueQuery.error || bookingsQuery.error || ridesQuery.error;

  return (
    <div className="space-y-8">
      <PageHeader title="Reports" subtitle="Revenue, bookings, and ride volume" />

      <div className="grid max-w-md gap-3 sm:grid-cols-2">
        <Input
          label="From"
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
        />
        <Input label="To" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
      </div>

      {loading ? <Skeleton className="h-40 w-full" /> : null}
      {err ? <Alert tone="error">{getErrorMessage(err)}</Alert> : null}

      <section>
        <h2 className="mb-2 font-display text-xl">
          Revenue · {formatCurrency(revenueQuery.data?.total)}
        </h2>
        <Table
          keyField="date"
          empty={<p className="text-sm text-ink-muted">No revenue in range.</p>}
          columns={[
            { key: 'date', header: 'Date' },
            {
              key: 'revenue',
              header: 'Revenue',
              render: (row) => formatCurrency(row.revenue),
            },
            { key: 'payments', header: 'Payments' },
          ]}
          rows={revenueQuery.data?.daily || []}
        />
      </section>

      <section>
        <h2 className="mb-2 font-display text-xl">
          Bookings · {bookingsQuery.data?.total ?? '—'}
        </h2>
        <Table
          keyField="status"
          empty={<p className="text-sm text-ink-muted">No bookings in range.</p>}
          columns={[
            { key: 'status', header: 'Status' },
            { key: 'count', header: 'Count' },
            {
              key: 'amount',
              header: 'Amount',
              render: (row) => formatCurrency(row.amount),
            },
          ]}
          rows={bookingsQuery.data?.byStatus || []}
        />
      </section>

      <section>
        <h2 className="mb-2 font-display text-xl">Rides · {ridesQuery.data?.total ?? '—'}</h2>
        <Table
          keyField="status"
          empty={<p className="text-sm text-ink-muted">No rides in range.</p>}
          columns={[
            { key: 'status', header: 'Status' },
            { key: 'count', header: 'Count' },
          ]}
          rows={ridesQuery.data?.byStatus || []}
        />
      </section>
    </div>
  );
}
