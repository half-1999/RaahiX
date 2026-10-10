import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { adminService } from '../../services/adminService';
import { getErrorMessage } from '../../services/api';
import PageHeader from '../../components/common/PageHeader';
import Alert from '../../components/ui/Alert';
import Skeleton from '../../components/ui/Skeleton';

const cards = [
  { key: 'drivers', label: 'Total drivers', to: '/admin/drivers' },
  { key: 'verifiedDrivers', label: 'Verified drivers', to: '/admin/drivers' },
  { key: 'customers', label: 'Customers', to: '/admin/users' },
  { key: 'activeVehicles', label: 'Active vehicles', to: '/admin/vehicles' },
  { key: 'ridesToday', label: "Today's rides", to: '/admin/rides' },
  { key: 'upcomingRides', label: 'Upcoming rides', to: '/admin/rides' },
  { key: 'pendingBookings', label: 'Pending bookings', to: '/admin/bookings' },
  { key: 'pendingProofs', label: 'Pending payments', to: '/admin/payments' },
  { key: 'pendingRefunds', label: 'Pending refunds', to: '/admin/bookings' },
];

export default function AdminDashboardPage() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: () => adminService.dashboard(),
  });

  return (
    <div>
      <PageHeader title="Control tower" subtitle="Live counts from RaahiX operations" />
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
            <p className="mt-2 font-display text-3xl text-ink">{data?.[c.key] ?? '—'}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
