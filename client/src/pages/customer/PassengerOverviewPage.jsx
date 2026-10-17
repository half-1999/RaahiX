import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Bus, CalendarDays, CheckCircle2, IndianRupee, Ticket } from 'lucide-react';
import { bookingService } from '../../services/bookingService';
import PageHeader from '../../components/common/PageHeader';
import Alert from '../../components/ui/Alert';
import EmptyState from '../../components/ui/EmptyState';
import Skeleton from '../../components/ui/Skeleton';
import SummaryCard, { SummaryGrid } from '../../components/ui/SummaryCard';
import StatusBadge from '../../components/common/StatusBadge';
import { cityLabel, formatCurrency, formatDate, formatTime } from '../../utils/format';

function bucket(booking) {
  const status = booking.bookingStatus;
  const rideStatus = booking.ride?.status || booking.rideId?.status;
  if (status === 'CANCELLED' || status === 'EXPIRED') return 'Cancelled';
  if (rideStatus === 'COMPLETED') return 'Completed';
  if (['ACTIVE', 'STARTED', 'BOARDING'].includes(rideStatus)) return 'Active';
  return 'Upcoming';
}

export default function PassengerOverviewPage() {
  const query = useQuery({
    queryKey: ['bookings', 'overview'],
    queryFn: () => bookingService.list({ page: 1, limit: 50 }),
  });

  const bookings = query.data?.bookings || query.data || [];
  const upcoming = bookings.filter((b) => bucket(b) === 'Upcoming');
  const active = bookings.filter((b) => bucket(b) === 'Active');
  const completed = bookings.filter((b) => bucket(b) === 'Completed');
  const spending = bookings
    .filter((b) => b.proofStatus === 'APPROVED' || b.bookingStatus === 'CONFIRMED')
    .reduce((sum, b) => sum + Number(b.totalAmount || 0), 0);

  return (
    <div className="space-y-5">
      <PageHeader title="Overview" subtitle="Your trips, bookings, and spending at a glance" />

      {query.isLoading ? <Skeleton className="h-28 w-full" /> : null}
      {query.isError ? <Alert tone="error">Could not load your overview.</Alert> : null}

      {!query.isLoading ? (
        <SummaryGrid>
          <SummaryCard label="Total bookings" value={bookings.length} icon={Ticket} />
          <SummaryCard label="Upcoming trips" value={upcoming.length} icon={CalendarDays} />
          <SummaryCard label="Active trips" value={active.length} icon={Bus} />
          <SummaryCard label="Completed" value={completed.length} icon={CheckCircle2} />
          <SummaryCard label="Total spending" value={formatCurrency(spending)} icon={IndianRupee} />
          <SummaryCard
            label="Pending payments"
            value={query.data?.counts?.pendingPayments ?? bookings.filter((b) => b.proofStatus === 'PENDING' || b.proofStatus === 'SUBMITTED').length}
            icon={Ticket}
          />
        </SummaryGrid>
      ) : null}

      <section className="rounded-2xl border-2 border-ink/10 bg-white p-4 shadow-[var(--shadow-soft)]">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="font-display text-[clamp(1rem,1.2vw+0.5rem,1.25rem)] font-bold text-ink">
            Upcoming trips
          </h2>
          <Link to="/app/trips" className="text-xs font-semibold text-brand-ink hover:underline">
            All trips
          </Link>
        </div>
        {!upcoming.length && !active.length ? (
          <EmptyState
            icon={CalendarDays}
            title="Book your first ride"
            description="Search corridors and reserve a seat for today or a future trip."
            action={
              <Link to="/search">
                <span className="inline-flex h-11 items-center justify-center rounded-xl bg-brand px-4 text-sm font-bold text-ink shadow-sm transition hover:bg-brand-dark">
                  Book a ride
                </span>
              </Link>
            }
          />
        ) : !upcoming.length ? (
          <EmptyState
            icon={CalendarDays}
            title="No upcoming trips"
            description="You have an active trip in progress. Browse more rides anytime."
            action={
              <Link to="/search">
                <span className="inline-flex h-11 items-center justify-center rounded-xl border-2 border-ink/15 bg-white px-4 text-sm font-bold text-ink transition hover:border-brand">
                  Find another ride
                </span>
              </Link>
            }
          />
        ) : (
          <ul className="space-y-2">
            {upcoming.slice(0, 5).map((booking) => {
              const ride = booking.ride || booking.rideId;
              return (
                <li key={booking._id}>
                  <Link
                    to={`/booking/${booking._id}`}
                    className="flex items-center justify-between gap-3 rounded-xl border border-line px-3 py-2.5 transition hover:border-brand hover:bg-brand-soft/40"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-ink">
                        {cityLabel(ride?.routeId?.origin || ride?.origin)} →{' '}
                        {cityLabel(ride?.routeId?.destination || ride?.destination)}
                      </p>
                      <p className="text-xs text-slate">
                        {formatDate(ride?.departureTime)} · {formatTime(ride?.departureTime)} ·{' '}
                        {booking.bookingNumber}
                      </p>
                    </div>
                    <StatusBadge status={booking.bookingStatus} />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
