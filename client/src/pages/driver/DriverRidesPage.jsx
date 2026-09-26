import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Bus } from 'lucide-react';
import { driverService } from '../../services/driverService';
import { getErrorMessage } from '../../services/api';
import StatusBadge from '../../components/common/StatusBadge';
import PageHeader from '../../components/common/PageHeader';
import Alert from '../../components/ui/Alert';
import EmptyState from '../../components/ui/EmptyState';
import Select from '../../components/ui/Select';
import Skeleton from '../../components/ui/Skeleton';
import { cityLabel, entityId, formatDate, formatTime } from '../../utils/format';
import { useState } from 'react';

export default function DriverRidesPage() {
  const [status, setStatus] = useState('');

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['driver', 'rides', { status }],
    queryFn: () => driverService.listRides(status ? { status } : {}),
  });

  const rides = data?.rides || [];

  return (
    <div>
      <PageHeader
        title="My rides"
        subtitle="Assigned trips"
        actions={
          <Select
            className="min-w-[9rem]"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            options={[
              { value: '', label: 'All statuses' },
              { value: 'SCHEDULED', label: 'Scheduled' },
              { value: 'BOARDING', label: 'Boarding' },
              { value: 'STARTED', label: 'Started' },
              { value: 'COMPLETED', label: 'Completed' },
              { value: 'CANCELLED', label: 'Cancelled' },
            ]}
          />
        }
      />

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : null}

      {isError ? <Alert tone="error">{getErrorMessage(error)}</Alert> : null}

      {!isLoading && !isError && !rides.length ? (
        <EmptyState icon={Bus} title="No rides found" description="Try another status filter." />
      ) : null}

      <ul className="space-y-3">
        {rides.map((ride) => (
          <li key={entityId(ride)}>
            <Link
              to={`/driver/rides/${entityId(ride)}`}
              className="block rounded-xl border border-line bg-white p-4 active:bg-surface"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-display text-lg text-ink">
                    {cityLabel(ride.routeId?.origin)} → {cityLabel(ride.routeId?.destination)}
                  </p>
                  <p className="mt-1 text-sm text-ink-muted">
                    {formatDate(ride.date || ride.departureTime)} · {formatTime(ride.departureTime)}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-muted">
                    {ride.vehicleId?.registrationNumber || '—'} · Pickup {ride.pickupPoint}
                  </p>
                </div>
                <StatusBadge status={ride.status} type="ride" />
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
