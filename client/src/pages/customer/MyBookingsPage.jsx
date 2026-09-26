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

export default function MyBookingsPage() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['bookings'],
    queryFn: () => bookingService.list(),
  });

  const bookings = data?.bookings || data || [];

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <PageHeader
        title="My bookings"
        subtitle="Upcoming and past trips"
        actions={
          <Link to="/search">
            <Button size="sm">Find a ride</Button>
          </Link>
        }
      />

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
          title="You don’t have any upcoming bookings."
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
    </div>
  );
}
