import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Bus,
  CarFront,
  CheckCircle2,
  IndianRupee,
  RotateCcw,
  Ticket,
} from 'lucide-react';
import { driverService } from '../../services/driverService';
import { api, getErrorMessage } from '../../services/api';
import StatusBadge from '../../components/common/StatusBadge';
import PageHeader from '../../components/common/PageHeader';
import Alert from '../../components/ui/Alert';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import Skeleton from '../../components/ui/Skeleton';
import SummaryCard, { SummaryGrid } from '../../components/ui/SummaryCard';
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

export default function DriverDashboardPage() {
  const queryClient = useQueryClient();
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [reportDate, setReportDate] = useState(() => new Date().toISOString().slice(0, 10));

  const dashQuery = useQuery({
    queryKey: ['driver', 'dashboard'],
    queryFn: () => driverService.dashboard(),
    refetchInterval: 30_000,
  });

  const todayQuery = useQuery({
    queryKey: ['driver', 'dashboard', 'today', reportDate],
    queryFn: () => driverService.todayReport({ date: reportDate }),
    refetchInterval: 30_000,
  });

  const review = useMutation({
    mutationFn: ({ id, decision }) => driverService.reviewPayment(id, { decision, reason }),
    onSuccess: () => {
      setReason('');
      setError('');
      queryClient.invalidateQueries({ queryKey: ['driver', 'dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['driver', 'bookings'] });
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  const data = dashQuery.data || {};
  const today = todayQuery.data || data.todayReport || {};
  const todaySummary = today.summary || {};
  const todayRides = today.rides || [];
  const recentRides = data.recentRides || [];
  const recentBookings = data.recentBookings || [];
  const recentRefunds = data.recentRefunds || [];
  const pendingProofs = recentBookings.filter((b) => b.proofStatus === 'SUBMITTED');

  return (
    <div className="space-y-5">
      <PageHeader
        title="Dashboard"
        subtitle="Today’s report, quick actions, and live ride totals"
        className="mb-4"
        actions={
          <div className="flex flex-wrap gap-2">
            <Link to="/driver/rides?new=1">
              <Button size="sm">Create ride</Button>
            </Link>
            <Link to="/driver/passengers">
              <Button size="sm" variant="outline">
                Add passenger
              </Button>
            </Link>
            <Link to="/driver/payments">
              <Button size="sm" variant="outline">
                Payments
              </Button>
            </Link>
          </div>
        }
      />

      {dashQuery.isLoading ? <Skeleton className="h-36 w-full" /> : null}
      {dashQuery.isError ? <Alert tone="error">Could not load dashboard totals.</Alert> : null}
      {error ? <Alert tone="error">{error}</Alert> : null}

      <section className="space-y-3 rounded-2xl border-2 border-ink/10 bg-white p-4 shadow-[var(--shadow-soft)]">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-bold text-ink">Today&apos;s report</h2>
            <p className="text-sm text-ink-muted">Business-day totals from scheduled departure and actual completion times</p>
          </div>
          <label className="block text-xs font-medium text-ink-muted">
            Report date
            <input
              type="date"
              className="mt-1 h-10 rounded-xl border border-line bg-white px-3 text-sm"
              value={reportDate}
              onChange={(e) => setReportDate(e.target.value)}
            />
          </label>
        </div>
        {todayQuery.isLoading ? <Skeleton className="h-24 w-full" /> : null}
        {!todayQuery.isLoading ? (
          <SummaryGrid>
            <SummaryCard
              label="Scheduled today"
              value={todaySummary.scheduledToday ?? 0}
              icon={Bus}
              hint="By departure date"
            />
            <SummaryCard label="Active now" value={todaySummary.activeNow ?? 0} icon={Ticket} />
            <SummaryCard
              label="Completed today"
              value={todaySummary.completedToday ?? 0}
              icon={CheckCircle2}
              hint="By actual completion"
            />
            <SummaryCard label="Passengers" value={todaySummary.totalPassengers ?? 0} icon={Ticket} />
            <SummaryCard
              label="Expected fare"
              value={formatCurrency(todaySummary.expectedFare || 0)}
              icon={IndianRupee}
            />
            <SummaryCard
              label="Collected"
              value={formatCurrency(todaySummary.collected || 0)}
              icon={IndianRupee}
              hint={`${formatCurrency(todaySummary.outstanding || 0)} outstanding`}
            />
            <SummaryCard
              label="Seats booked"
              value={todaySummary.seatsBooked ?? 0}
              icon={Bus}
              hint={`${todaySummary.seatsRemaining ?? 0} remaining`}
            />
            <SummaryCard label="Rides in view" value={todaySummary.rideCount ?? 0} icon={CarFront} />
          </SummaryGrid>
        ) : null}

        {!todayQuery.isLoading && !todayRides.length ? (
          <EmptyState icon={Bus} title="No activity for this date" description="Schedule a ride or pick another date." />
        ) : null}

        {todayRides.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-line text-xs uppercase tracking-wide text-slate">
                <tr>
                  <th className="px-2 py-2">Route</th>
                  <th className="px-2 py-2">Departure</th>
                  <th className="px-2 py-2">Status</th>
                  <th className="px-2 py-2">Pax</th>
                  <th className="px-2 py-2">Expected</th>
                  <th className="px-2 py-2">Collected</th>
                </tr>
              </thead>
              <tbody>
                {todayRides.map((ride) => (
                  <tr key={entityId(ride)} className="border-b border-line/60">
                    <td className="px-2 py-2">
                      <Link to={`/driver/rides/${entityId(ride)}`} className="font-semibold text-ink hover:underline">
                        {ride.source} → {ride.destination}
                      </Link>
                    </td>
                    <td className="px-2 py-2 text-ink-muted">
                      {formatDate(ride.departureTime)} {formatTime(ride.departureTime)}
                    </td>
                    <td className="px-2 py-2">
                      <StatusBadge status={ride.status} type="ride" />
                    </td>
                    <td className="px-2 py-2">{ride.passengerCount}</td>
                    <td className="px-2 py-2">{formatCurrency(ride.expectedFare)}</td>
                    <td className="px-2 py-2">{formatCurrency(ride.collected)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>

      {!dashQuery.isLoading ? (
        <SummaryGrid>
          <SummaryCard label="Total rides" value={data.totalRides ?? 0} icon={Bus} />
          <SummaryCard
            label="Active rides"
            value={data.activeRides ?? 0}
            icon={Ticket}
            hint={`${data.todayRides ?? 0} departing today`}
          />
          <SummaryCard label="Upcoming scheduled" value={data.upcomingCount ?? 0} icon={Bus} />
          <SummaryCard label="Completed" value={data.completedRides ?? 0} icon={CheckCircle2} />
          <SummaryCard label="Voided" value={data.voidedRides ?? data.cancelledRides ?? 0} icon={RotateCcw} />
          <SummaryCard
            label="Total earnings"
            value={formatCurrency(data.totalEarnings || 0)}
            icon={IndianRupee}
            hint={`${formatCurrency(data.todayEarnings || 0)} today · ${data.confirmedBookings ?? 0} confirmed`}
          />
          <SummaryCard label="Pending payments" value={data.pendingProofs ?? 0} icon={Ticket} />
          <SummaryCard label="Vehicles" value={data.vehicleCount ?? 0} icon={CarFront} />
        </SummaryGrid>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border-2 border-ink/10 bg-white p-4 shadow-[var(--shadow-soft)]">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="font-display text-[clamp(1rem,1.2vw+0.5rem,1.25rem)] font-bold text-ink">
              Payment proofs
            </h2>
            <Link to="/driver/payments?section=payments" className="text-xs font-semibold text-brand-ink hover:underline">
              View all
            </Link>
          </div>
          {!pendingProofs.length ? (
            <EmptyState icon={Ticket} title="No proofs waiting" description="Submitted screenshots appear here." />
          ) : (
            <ul className="space-y-3">
              {pendingProofs.slice(0, 4).map((booking) => (
                <li key={booking._id} className="rounded-xl border border-line p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-ink">{booking.bookingNumber}</p>
                      <p className="text-sm text-slate">
                        {booking.userId?.name} · {formatCurrency(booking.proofAmount || booking.totalAmount)}
                      </p>
                    </div>
                    <StatusBadge status={booking.proofStatus} type="payment" />
                  </div>
                  {booking.proofFile ? <ProofImage bookingId={booking._id} /> : null}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      loading={review.isPending}
                      onClick={() => review.mutate({ id: booking._id, decision: 'APPROVE' })}
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      loading={review.isPending}
                      onClick={() => review.mutate({ id: booking._id, decision: 'REJECT' })}
                    >
                      Reject
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <label className="mt-3 block text-xs font-medium text-ink">
            Rejection reason
            <input
              className="mt-1 h-10 w-full rounded-xl border border-line px-3 text-sm"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Required when rejecting"
            />
          </label>
        </section>

        <section className="rounded-2xl border-2 border-ink/10 bg-white p-4 shadow-[var(--shadow-soft)]">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="font-display text-[clamp(1rem,1.2vw+0.5rem,1.25rem)] font-bold text-ink">
              Recent rides
            </h2>
            <Link to="/driver/rides" className="text-xs font-semibold text-brand-ink hover:underline">
              All rides
            </Link>
          </div>
          {!recentRides.length ? (
            <EmptyState icon={Bus} title="No rides yet" description="Create your first ride to get started." />
          ) : (
            <ul className="space-y-2">
              {recentRides.map((ride) => (
                <li key={entityId(ride)}>
                  <Link
                    to={`/driver/trips/${entityId(ride)}`}
                    className="flex items-center justify-between gap-3 rounded-xl border border-line px-3 py-2.5 transition hover:border-brand hover:bg-brand-soft/40"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-ink">
                        {cityLabel(ride.routeId?.origin)} → {cityLabel(ride.routeId?.destination)}
                      </p>
                      <p className="text-xs text-slate">
                        {formatDate(ride.departureTime)} · {formatTime(ride.departureTime)}
                      </p>
                    </div>
                    <StatusBadge status={ride.status} type="ride" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="rounded-2xl border-2 border-ink/10 bg-white p-4 shadow-[var(--shadow-soft)]">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="font-display text-[clamp(1rem,1.2vw+0.5rem,1.25rem)] font-bold text-ink">
            Recent refunds
          </h2>
          <Link to="/driver/payments?section=refunds" className="text-xs font-semibold text-brand-ink hover:underline">
            Refund history
          </Link>
        </div>
        {!recentRefunds.length ? (
          <p className="text-sm text-slate">No refund activity yet.</p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {recentRefunds.map((booking) => (
              <li key={booking._id} className="rounded-xl border border-line px-3 py-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-ink">{booking.bookingNumber}</p>
                    <p className="text-xs text-slate">{booking.userId?.name}</p>
                  </div>
                  <StatusBadge status={booking.refundStatus} type="payment" />
                </div>
                <p className="mt-1 text-sm font-bold text-ink">{formatCurrency(booking.refundAmount)}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
