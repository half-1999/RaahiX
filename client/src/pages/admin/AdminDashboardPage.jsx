import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { adminService } from '../../services/adminService';
import { getErrorMessage } from '../../services/api';
import PageHeader from '../../components/common/PageHeader';
import Alert from '../../components/ui/Alert';
import Skeleton from '../../components/ui/Skeleton';
import { formatCurrency } from '../../utils/format';

const cards = [
  { key: 'users', label: 'Users', to: '/admin/users' },
  { key: 'drivers', label: 'Drivers', to: '/admin/drivers' },
  { key: 'ridesToday', label: 'Rides today', to: '/admin/rides' },
  { key: 'bookingsToday', label: 'Bookings today', to: '/admin/bookings' },
  { key: 'revenueToday', label: 'Revenue today', to: '/admin/payments', money: true },
  { key: 'pendingPayments', label: 'Pending payments', to: '/admin/payments' },
];

export default function AdminDashboardPage() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: () => adminService.dashboard(),
  });

  return (
    <div>
      <PageHeader title="Ops dashboard" subtitle="Today’s operational snapshot" />
      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : null}
      {isError ? <Alert tone="error">{getErrorMessage(error)}</Alert> : null}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <Link
            key={c.key}
            to={c.to}
            className="rounded-lg border border-line bg-white p-4 hover:border-brand/40"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">{c.label}</p>
            <p className="mt-2 font-display text-3xl text-ink">
              {c.money
                ? formatCurrency(data?.[c.key])
                : (data?.[c.key] ?? '—')}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
