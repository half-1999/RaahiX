import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Users } from 'lucide-react';
import { driverService } from '../../services/driverService';
import { getErrorMessage } from '../../services/api';
import PageHeader from '../../components/common/PageHeader';
import Alert from '../../components/ui/Alert';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import Skeleton from '../../components/ui/Skeleton';
import Table from '../../components/ui/Table';
import Badge from '../../components/ui/Badge';

export default function DriverPassengersPage() {
  const { rideId } = useParams();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['driver', 'rides', rideId, 'passengers'],
    queryFn: () => driverService.getPassengers(rideId),
  });

  const passengers = data?.passengers || [];
  const seats = data?.seats || [];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Passengers"
        subtitle="Confirmed bookings for this trip"
        actions={
          <Link to={`/driver/rides/${rideId}`}>
            <Button variant="outline" size="sm">
              Back to trip
            </Button>
          </Link>
        }
      />

      {isLoading ? <Skeleton className="h-40 w-full" /> : null}
      {isError ? <Alert tone="error">{getErrorMessage(error)}</Alert> : null}

      {!isLoading && !isError && !passengers.length ? (
        <EmptyState
          icon={Users}
          title="No confirmed passengers yet"
          description="Passengers appear after payment confirmation."
        />
      ) : null}

      {passengers.length ? (
        <Table
          keyField="seatNumber"
          columns={[
            { key: 'seatNumber', header: 'Seat' },
            { key: 'name', header: 'Name' },
            {
              key: 'phone',
              header: 'Phone',
              render: (row) => (
                <a className="text-brand-dark underline" href={`tel:${row.phone}`}>
                  {row.phone}
                </a>
              ),
            },
            { key: 'bookingNumber', header: 'Booking #' },
          ]}
          rows={passengers}
        />
      ) : null}

      {seats.length ? (
        <div>
          <h2 className="mb-2 text-sm font-medium text-ink-muted">Seat board</h2>
          <div className="flex flex-wrap gap-2">
            {seats.map((s) => (
              <Badge
                key={s.seatNumber}
                tone={
                  s.status === 'BOOKED'
                    ? 'success'
                    : s.status === 'HELD'
                      ? 'warning'
                      : s.status === 'BLOCKED'
                        ? 'danger'
                        : 'neutral'
                }
              >
                {s.seatNumber} · {s.status}
              </Badge>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
