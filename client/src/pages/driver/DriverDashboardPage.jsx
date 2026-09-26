import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Bus } from 'lucide-react';
import { driverService } from '../../services/driverService';
import { getErrorMessage } from '../../services/api';
import StatusBadge from '../../components/common/StatusBadge';
import PageHeader from '../../components/common/PageHeader';
import Alert from '../../components/ui/Alert';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import Skeleton from '../../components/ui/Skeleton';
import { cityLabel, entityId, formatTime, todayISODate } from '../../utils/format';

export default function DriverDashboardPage() {
  const today = todayISODate();

  const dashQuery = useQuery({
    queryKey: ['driver', 'dashboard'],
    queryFn: () => driverService.dashboard(),
  });

  const ridesQuery = useQuery({
    queryKey: ['driver', 'rides', { date: today }],
    queryFn: () => driverService.listRides({ date: today }),
  });

  const data = dashQuery.data;
  const todayRides = ridesQuery.data?.rides || [];
  const primary = todayRides[0];
  const isLoading = dashQuery.isLoading || ridesQuery.isLoading;
  const isError = dashQuery.isError || ridesQuery.isError;
  const error = dashQuery.error || ridesQuery.error;

  return (
    <div>
      <PageHeader
        title="Today’s trip"
        subtitle="Your assigned rides for today"
        actions={
          <Link to="/driver/rides">
            <Button variant="outline" size="sm">
              All rides
            </Button>
          </Link>
        }
      />

      {isLoading ? <Skeleton className="h-40 w-full" /> : null}
      {isError ? <Alert tone="error">{getErrorMessage(error)}</Alert> : null}

      {!isLoading && !isError && !primary ? (
        <EmptyState
          icon={Bus}
          title="No rides assigned for today"
          description="Check upcoming rides or wait for ops to schedule you."
        />
      ) : null}

      {primary ? (
        <Link
          to={`/driver/rides/${entityId(primary)}`}
          className="block rounded-2xl border border-brand/30 bg-white p-5 shadow-sm"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-accent">Primary today</p>
              <p className="mt-1 font-display text-2xl text-ink">
                {cityLabel(primary.routeId?.origin || primary.route?.origin || primary.origin)} →{' '}
                {cityLabel(
                  primary.routeId?.destination || primary.route?.destination || primary.destination
                )}
              </p>
              <p className="mt-2 text-sm text-ink-muted">
                Departs {formatTime(primary.departureTime)} · {primary.availableSeats ?? '—'} seats
                open
              </p>
            </div>
            <StatusBadge status={primary.status} type="ride" />
          </div>
          <p className="mt-4 text-sm font-medium text-brand">Open trip →</p>
        </Link>
      ) : null}

      <div className="mt-6 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-line bg-white p-4">
          <p className="text-xs text-ink-muted">Today’s rides</p>
          <p className="font-display text-2xl">
            {typeof data?.todayRides === 'number' ? data.todayRides : todayRides.length}
          </p>
        </div>
        <div className="rounded-xl border border-line bg-white p-4">
          <p className="text-xs text-ink-muted">Upcoming</p>
          <p className="font-display text-2xl">{data?.upcomingCount ?? '—'}</p>
        </div>
        <div className="rounded-xl border border-line bg-white p-4 col-span-2">
          <p className="text-xs text-ink-muted">Completed today</p>
          <p className="font-display text-2xl">{data?.completedToday ?? '—'}</p>
        </div>
      </div>
    </div>
  );
}
