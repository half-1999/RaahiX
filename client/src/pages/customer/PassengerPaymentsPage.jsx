import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CreditCard, RotateCcw, Search } from 'lucide-react';
import { bookingService } from '../../services/bookingService';
import { SectionSwitcher } from '../../components/layout/DashboardShell';
import PageHeader from '../../components/common/PageHeader';
import SearchFiltersBar from '../../components/common/SearchFiltersBar';
import StatusBadge from '../../components/common/StatusBadge';
import Alert from '../../components/ui/Alert';
import EmptyState from '../../components/ui/EmptyState';
import Skeleton from '../../components/ui/Skeleton';
import SummaryCard, { SummaryGrid } from '../../components/ui/SummaryCard';
import { cityLabel, formatCurrency, formatDateTime } from '../../utils/format';

export default function PassengerPaymentsPage() {
  const [section, setSection] = useState('payments');
  const [search, setSearch] = useState('');

  const query = useQuery({
    queryKey: ['bookings', 'payments'],
    queryFn: () => bookingService.list({ page: 1, limit: 100 }),
  });

  const bookings = query.data?.bookings || query.data || [];

  const paymentStats = useMemo(() => {
    const approved = bookings.filter((b) => b.proofStatus === 'APPROVED');
    const pending = bookings.filter((b) => ['PENDING', 'SUBMITTED'].includes(b.proofStatus));
    const rejected = bookings.filter((b) => b.proofStatus === 'REJECTED');
    return {
      total: bookings.length,
      successful: approved.length,
      pending: pending.length,
      failed: rejected.length,
      spent: approved.reduce((s, b) => s + Number(b.totalAmount || 0), 0),
    };
  }, [bookings]);

  const refunds = useMemo(
    () =>
      bookings.filter((b) =>
        ['PENDING', 'PARTIAL', 'COMPLETED', 'WAIVED'].includes(b.refundStatus)
      ),
    [bookings]
  );

  const filteredPayments = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return bookings;
    return bookings.filter((b) =>
      [
        b.bookingNumber,
        b.paymentReference,
        b.proofStatus,
        b.bookingStatus,
        cityLabel(b.rideId?.routeId?.origin),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(q)
    );
  }, [bookings, search]);

  const filteredRefunds = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return refunds;
    return refunds.filter((b) =>
      [b.bookingNumber, b.refundStatus, b.refundReference]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(q)
    );
  }, [refunds, search]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Payments"
        subtitle="Payment proofs and refund status for your bookings"
      />

      <SectionSwitcher
        value={section}
        onChange={setSection}
        items={[
          { id: 'payments', label: 'Payment History', icon: CreditCard },
          { id: 'refunds', label: 'Refund History', icon: RotateCcw },
        ]}
      />

      {query.isLoading ? <Skeleton className="h-28 w-full" /> : null}
      {query.isError ? <Alert tone="error">Could not load payment history.</Alert> : null}

      {section === 'payments' ? (
        <>
          <SummaryGrid className="xl:grid-cols-3">
            <SummaryCard label="Total records" value={paymentStats.total} icon={CreditCard} />
            <SummaryCard label="Successful" value={paymentStats.successful} icon={CreditCard} />
            <SummaryCard label="Pending" value={paymentStats.pending} icon={CreditCard} />
            <SummaryCard label="Rejected" value={paymentStats.failed} icon={CreditCard} />
            <SummaryCard label="Amount paid" value={formatCurrency(paymentStats.spent)} icon={CreditCard} />
          </SummaryGrid>

          <SearchFiltersBar activeCount={search ? 1 : 0} onReset={() => setSearch('')}>
            <label className="relative min-w-0 w-full md:max-w-sm md:flex-1">
              <span className="sr-only">Search</span>
              <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate" aria-hidden="true" />
              <input
                className="h-11 w-full rounded-xl border border-line bg-white py-2 pr-3 pl-9 text-sm"
                placeholder="Search booking…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
          </SearchFiltersBar>

          {!query.isLoading && !filteredPayments.length ? (
            <EmptyState icon={CreditCard} title="No payments yet" description="Book a ride to see payment history here." />
          ) : null}

          <ul className="space-y-3">
            {filteredPayments.map((booking) => (
              <li
                key={booking._id}
                className="rounded-2xl border-2 border-ink/10 bg-white p-4 shadow-[var(--shadow-soft)]"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-ink">{booking.bookingNumber}</p>
                    {booking.paymentReference ? (
                      <p className="font-mono text-xs text-ink-muted">{booking.paymentReference}</p>
                    ) : null}
                    <p className="text-sm text-slate">
                      {cityLabel(booking.rideId?.routeId?.origin || booking.ride?.routeId?.origin)} →{' '}
                      {cityLabel(booking.rideId?.routeId?.destination || booking.ride?.routeId?.destination)}
                    </p>
                    <p className="text-xs text-slate">{formatDateTime(booking.updatedAt)}</p>
                  </div>
                  <StatusBadge status={booking.proofStatus || booking.bookingStatus} type="payment" />
                </div>
                <p className="mt-2 font-display text-xl font-bold text-ink">
                  {formatCurrency(booking.totalAmount)}
                </p>
                <Link
                  to={`/booking/${booking._id}`}
                  className="mt-2 inline-block text-sm font-semibold text-brand-ink underline-offset-2 hover:underline"
                >
                  View booking
                </Link>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <>
          <SummaryGrid className="xl:grid-cols-3">
            <SummaryCard label="Refund records" value={refunds.length} icon={RotateCcw} />
            <SummaryCard
              label="Pending"
              value={refunds.filter((b) => b.refundStatus === 'PENDING' || b.refundStatus === 'PARTIAL').length}
              icon={RotateCcw}
            />
            <SummaryCard
              label="Completed"
              value={refunds.filter((b) => b.refundStatus === 'COMPLETED').length}
              icon={RotateCcw}
            />
          </SummaryGrid>

          {!query.isLoading && !filteredRefunds.length ? (
            <EmptyState icon={RotateCcw} title="No refunds" description="Refund activity for cancelled paid bookings appears here." />
          ) : null}

          <ul className="space-y-3">
            {filteredRefunds.map((booking) => (
              <li
                key={booking._id}
                className="rounded-2xl border-2 border-ink/10 bg-white p-4 shadow-[var(--shadow-soft)]"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-ink">{booking.bookingNumber}</p>
                    {booking.paymentReference ? (
                      <p className="font-mono text-xs text-ink-muted">Payment {booking.paymentReference}</p>
                    ) : null}
                    <p className="text-sm text-slate">
                      {booking.refundReference ? `Refund ${booking.refundReference}` : 'Awaiting processing'}
                    </p>
                  </div>
                  <StatusBadge status={booking.refundStatus} type="payment" />
                </div>
                <p className="mt-2 font-display text-xl font-bold text-ink">
                  {formatCurrency(booking.refundAmount || booking.totalAmount)}
                </p>
                <Link
                  to={`/booking/${booking._id}`}
                  className="mt-2 inline-block text-sm font-semibold text-brand-ink underline-offset-2 hover:underline"
                >
                  View booking
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
