import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Ticket } from 'lucide-react';
import { bookingService } from '../../services/bookingService';
import { getErrorMessage } from '../../services/api';
import BookingCard from '../../components/booking/BookingCard';
import PageHeader from '../../components/common/PageHeader';
import Alert from '../../components/ui/Alert';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import Skeleton from '../../components/ui/Skeleton';
import Pagination from '../../components/common/Pagination';

const TABS = ['Upcoming', 'Active', 'Completed', 'Cancelled'];

function bucket(booking) {
  const status = booking.bookingStatus;
  const rideStatus = booking.ride?.status || booking.rideId?.status;
  if (status === 'CANCELLED' || status === 'EXPIRED') return 'Cancelled';
  if (rideStatus === 'COMPLETED') return 'Completed';
  if (['ACTIVE', 'STARTED', 'BOARDING'].includes(rideStatus)) return 'Active';
  return 'Upcoming';
}

export default function MyBookingsPage() {
  const [tab, setTab] = useState('Upcoming');
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['bookings', page],
    queryFn: () => bookingService.list({ page, limit: 10 }),
  });

  const bookings = (data?.bookings || data || []).filter((booking) => bucket(booking) === tab);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Trips"
        subtitle="Upcoming, active, and completed RaahiX bookings"
        actions={
          <Link to="/app/rides">
            <Button size="sm">Find a ride</Button>
          </Link>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {[
          ['Upcoming', data?.counts?.upcoming],
          ['Pending pay', data?.counts?.pendingPayments],
          ['All', data?.counts?.total],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-line bg-white px-3 py-2">
            <p className="font-display text-2xl font-bold text-navy">{value ?? '—'}</p>
            <p className="text-xs text-slate">{label}</p>
          </div>
        ))}
      </div>

      <div className="mb-4 flex gap-2 overflow-x-auto">
        {TABS.map((name) => (
          <button
            key={name}
            type="button"
            onClick={() => setTab(name)}
            className={`rounded-full px-3 py-1.5 text-sm font-semibold ${
              tab === name ? 'bg-brand text-ink' : 'bg-white text-slate'
            }`}
          >
            {name}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      ) : null}

      {isError ? (
        <Alert tone="error" title="Could not load bookings">
          {getErrorMessage(error)}{' '}
          <button type="button" className="underline" onClick={() => refetch()}>
            Retry
          </button>
        </Alert>
      ) : null}

      {!isLoading && !isError && !bookings.length ? (
        <EmptyState
          icon={Ticket}
          title={`Nothing in ${tab.toLowerCase()}.`}
          description="Search a corridor and reserve your seat."
          action={
            <Link to="/search">
              <Button>Search rides</Button>
            </Link>
          }
        />
      ) : null}

      <div className="space-y-3">
        {bookings.map((b) => (
          <BookingCard key={b.id || b._id} booking={b} />
        ))}
      </div>
      <Pagination page={data?.page || page} pages={data?.pages || 1} total={data?.total || 0} onPage={setPage} />
    </div>
  );
}
