import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bus, IndianRupee, Ticket } from 'lucide-react';
import { driverService } from '../../services/driverService';
import { api, getErrorMessage } from '../../services/api';
import StatusBadge from '../../components/common/StatusBadge';
import PageHeader from '../../components/common/PageHeader';
import Alert from '../../components/ui/Alert';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import Skeleton from '../../components/ui/Skeleton';
import { cityLabel, entityId, formatCurrency, formatDate, formatTime } from '../../utils/format';

function ProofImage({ bookingId }) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    let active = true;
    let objectUrl = '';
    api
      .get(`/bookings/${bookingId}/proof`, { responseType: 'blob' })
      .then((response) => {
        objectUrl = URL.createObjectURL(response.data);
        if (active) setUrl(objectUrl);
      })
      .catch(() => {});
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [bookingId]);
  if (!url) return <p className="text-xs text-slate">Screenshot stored privately.</p>;
  return <img src={url} alt="Payment screenshot" className="mt-2 h-28 w-full rounded-lg object-cover" />;
}

function BarChart({ rows }) {
  const max = Math.max(1, ...rows.map((row) => row.value));
  return (
    <div className="space-y-2">
      {rows.map((row) => (
        <div key={row.label}>
          <div className="mb-1 flex justify-between text-xs font-semibold text-slate">
            <span>{row.label}</span>
            <span>{row.value}</span>
          </div>
          <div className="h-2 rounded-full bg-mist">
            <div className="h-2 rounded-full bg-brand" style={{ width: `${(row.value / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function DriverDashboardPage() {
  const queryClient = useQueryClient();
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const dashQuery = useQuery({
    queryKey: ['driver', 'dashboard'],
    queryFn: () => driverService.dashboard(),
  });
  const ridesQuery = useQuery({
    queryKey: ['driver', 'rides', 'all'],
    queryFn: () => driverService.listRides(),
  });
  const bookingsQuery = useQuery({
    queryKey: ['driver', 'bookings'],
    queryFn: () => driverService.listBookings(),
  });

  const review = useMutation({
    mutationFn: ({ id, decision }) => driverService.reviewPayment(id, { decision, reason }),
    onSuccess: () => {
      setReason('');
      setError('');
      queryClient.invalidateQueries({ queryKey: ['driver', 'bookings'] });
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  const rides = ridesQuery.data?.rides || [];
  const bookings = bookingsQuery.data?.bookings || [];
  const requests = bookings.filter((booking) => booking.proofStatus && booking.proofStatus !== 'NOT_SUBMITTED');
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const todayRides = rides.filter((ride) => {
    const when = new Date(ride.departureTime);
    return when >= start && when <= end;
  });
  const upcoming = rides.filter((ride) => new Date(ride.departureTime) > end).slice(0, 4);
  const isLoading = dashQuery.isLoading || ridesQuery.isLoading || bookingsQuery.isLoading;

  const localKey = (value) => {
    const day = new Date(value);
    const month = String(day.getMonth() + 1).padStart(2, '0');
    const date = String(day.getDate()).padStart(2, '0');
    return `${day.getFullYear()}-${month}-${date}`;
  };
  const byDay = Array.from({ length: 7 }, (_, index) => {
    const day = new Date();
    day.setDate(day.getDate() + index);
    const key = localKey(day);
    const value = rides.filter((ride) => localKey(ride.departureTime) === key).length;
    return { label: day.toLocaleDateString('en-IN', { weekday: 'short' }), value };
  });

  return (
    <div className="space-y-5">
      <PageHeader
        title="Driver desk"
        subtitle="Recent seat requests, payment screenshots, and the week ahead"
        actions={
          <Link to="/driver/payments">
            <Button variant="outline" size="sm">All payments</Button>
          </Link>
        }
      />

      {isLoading ? <Skeleton className="h-40 w-full" /> : null}
      {error ? <Alert tone="error">{error}</Alert> : null}

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: 'Proofs waiting', value: requests.filter((booking) => booking.proofStatus === 'SUBMITTED').length, icon: Ticket },
          { label: 'Today’s rides', value: dashQuery.data?.todayRides ?? 0, icon: Bus },
          { label: 'Confirmed bookings', value: bookings.filter((b) => b.bookingStatus === 'CONFIRMED').length, icon: IndianRupee },
        ].map((card) => (
          <div key={card.label} className="rounded-2xl border border-line bg-white p-4 shadow-[var(--shadow-soft)]">
            <card.icon className="h-4 w-4 text-brand-dark" />
            <p className="mt-2 font-display text-3xl font-bold text-navy">{card.value}</p>
            <p className="text-sm text-slate">{card.label}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-2xl border border-line bg-white p-4 shadow-[var(--shadow-soft)]">
          <h2 className="font-display text-lg font-bold text-navy">Recent ride requests</h2>
          {!requests.length ? (
            <EmptyState icon={Ticket} title="No screenshots waiting" description="New payment proofs show up here." />
          ) : (
            <ul className="mt-3 space-y-3">
              {requests.slice(0, 4).map((booking) => (
                <li key={booking._id} className="rounded-xl border border-line p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-bold text-navy">{booking.bookingNumber}</p>
                      <p className="text-sm text-slate">
                        {booking.userId?.name} · {formatCurrency(booking.proofAmount || booking.totalAmount)} · {(booking.selectedSeats || []).join(', ')}
                      </p>
                    </div>
                    <StatusBadge status={booking.proofStatus} type="payment" />
                  </div>
                  {booking.proofFile ? (
                    <ProofImage bookingId={booking._id} />
                  ) : (
                    <p className="mt-2 text-xs text-slate">No screenshot stored for this booking.</p>
                  )}
                  {booking.proofStatus === 'SUBMITTED' ? (
                    <div className="mt-3 flex gap-2">
                      <Button size="sm" loading={review.isPending} onClick={() => review.mutate({ id: booking._id, decision: 'APPROVE' })}>
                        Approve
                      </Button>
                      <Button size="sm" variant="danger" loading={review.isPending} onClick={() => review.mutate({ id: booking._id, decision: 'REJECT' })}>
                        Reject
                      </Button>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
          <label className="mt-3 block text-sm font-medium text-navy">
            Rejection reason
            <input className="mt-1 h-11 w-full rounded-xl border border-line px-3 text-sm" value={reason} onChange={(e) => setReason(e.target.value)} />
          </label>
        </section>

        <section className="rounded-2xl border border-line bg-white p-4 shadow-[var(--shadow-soft)]">
          <h2 className="mb-3 font-display text-lg font-bold text-navy">Rides this week</h2>
          <BarChart rows={byDay} />
          <h3 className="mb-2 mt-5 text-sm font-bold text-navy">Today</h3>
          {!todayRides.length ? <p className="text-sm text-slate">No trips scheduled for today.</p> : null}
          <ul className="space-y-2">
            {todayRides.map((ride) => (
              <li key={`today-${entityId(ride)}`}>
                <Link to={`/driver/rides/${entityId(ride)}`} className="block rounded-xl bg-mist/70 px-3 py-2 text-sm">
                  <span className="font-bold text-navy">
                    {cityLabel(ride.routeId?.origin || ride.route?.origin)} → {cityLabel(ride.routeId?.destination || ride.route?.destination)}
                  </span>
                  <span className="block text-slate">{formatTime(ride.departureTime)} · {ride.status}</span>
                </Link>
              </li>
            ))}
          </ul>
          <h3 className="mb-2 mt-5 text-sm font-bold text-navy">Coming up</h3>
          <ul className="space-y-2">
            {upcoming.map((ride) => (
              <li key={entityId(ride)}>
                <Link to={`/driver/rides/${entityId(ride)}`} className="block rounded-xl bg-mist/70 px-3 py-2 text-sm">
                  <span className="font-bold text-navy">
                    {cityLabel(ride.routeId?.origin || ride.route?.origin)} → {cityLabel(ride.routeId?.destination || ride.route?.destination)}
                  </span>
                  <span className="block text-slate">
                    {formatDate(ride.departureTime)} · {formatTime(ride.departureTime)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
