import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle2,
  Clock3,
  IndianRupee,
  RotateCcw,
  Search,
  XCircle,
} from 'lucide-react';
import { driverService } from '../../services/driverService';
import { getErrorMessage } from '../../services/api';
import PageHeader from '../../components/common/PageHeader';
import SearchFiltersBar from '../../components/common/SearchFiltersBar';
import Pagination from '../../components/common/Pagination';
import StatusBadge from '../../components/common/StatusBadge';
import Alert from '../../components/ui/Alert';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import Modal from '../../components/ui/Modal';
import Select from '../../components/ui/Select';
import SummaryCard, { SummaryGrid } from '../../components/ui/SummaryCard';
import { cityLabel, formatCurrency, formatDateTime } from '../../utils/format';

export default function DriverRefundsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [reference, setReference] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selected, setSelected] = useState(null);

  const query = useQuery({
    queryKey: ['driver', 'refunds', page],
    queryFn: () => driverService.listRefunds({ page, limit: 10 }),
  });

  const bookings = query.data?.bookings || [];

  const summary = useMemo(() => {
    const all = bookings;
    const pending = all.filter((b) => b.refundStatus === 'PENDING' || b.refundStatus === 'PARTIAL');
    const completed = all.filter((b) => b.refundStatus === 'COMPLETED');
    const waived = all.filter((b) => b.refundStatus === 'WAIVED');
    const totalAmount = completed.reduce((sum, b) => sum + Number(b.refundAmount || 0), 0);
    return {
      total: all.length,
      pending: pending.length,
      completed: completed.length,
      rejected: waived.length,
      amount: totalAmount,
    };
  }, [bookings]);

  const filtered = useMemo(() => {
    return bookings.filter((booking) => {
      if (statusFilter && booking.refundStatus !== statusFilter) return false;
      const q = search.trim().toLowerCase();
      if (!q) return true;
      const hay = [
        booking.bookingNumber,
        booking.userId?.name,
        booking.refundStatus,
        booking.refundReference,
        cityLabel(booking.rideId?.routeId?.origin),
        cityLabel(booking.rideId?.routeId?.destination),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [bookings, search, statusFilter]);

  const mark = useMutation({
    mutationFn: (id) => driverService.markRefund(id, { refundReference: reference, reason }),
    onSuccess: () => {
      setReference('');
      setReason('');
      setError('');
      setSuccess('Refund marked as processed');
      setSelected(null);
      queryClient.invalidateQueries({ queryKey: ['driver', 'refunds'] });
      queryClient.invalidateQueries({ queryKey: ['driver', 'dashboard'] });
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title="Refund history"
        subtitle="If a passenger already paid and a refund is due, send it on UPI, then mark it processed."
      />

      {error ? <Alert tone="error">{error}</Alert> : null}
      {success ? <Alert tone="success">{success}</Alert> : null}
      {query.isError ? <Alert tone="error">Unable to load refunds.</Alert> : null}

      <SummaryGrid className="xl:grid-cols-3">
        <SummaryCard label="Total refunds" value={summary.total} icon={RotateCcw} />
        <SummaryCard label="Pending" value={summary.pending} icon={Clock3} />
        <SummaryCard label="Completed" value={summary.completed} icon={CheckCircle2} />
        <SummaryCard label="Waived" value={summary.rejected} icon={XCircle} />
        <SummaryCard label="Amount refunded" value={formatCurrency(summary.amount)} icon={IndianRupee} />
      </SummaryGrid>

      <SearchFiltersBar
        activeCount={[search, statusFilter].filter(Boolean).length}
        onReset={() => {
          setSearch('');
          setStatusFilter('');
        }}
      >
        <label className="relative min-w-0 w-full md:max-w-xs md:flex-1">
          <span className="sr-only">Search refunds</span>
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate" aria-hidden="true" />
          <input
            className="h-11 w-full rounded-xl border border-line bg-white py-2 pr-3 pl-9 text-sm"
            placeholder="Search booking, passenger…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <Select
          label="Status"
          className="min-w-[10rem] w-full md:w-auto"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          options={[
            { value: '', label: 'All statuses' },
            { value: 'PENDING', label: 'Pending' },
            { value: 'PARTIAL', label: 'Partial' },
            { value: 'COMPLETED', label: 'Completed' },
            { value: 'WAIVED', label: 'Waived' },
          ]}
        />
      </SearchFiltersBar>

      {!query.isLoading && !filtered.length ? (
        <EmptyState
          icon={RotateCcw}
          title="No refunds require your attention"
          description="Refund tasks appear here when a paid booking is cancelled."
        />
      ) : null}

      <ul className="space-y-3">
        {filtered.map((booking) => {
          const ride = booking.rideId;
          const due = booking.refundStatus === 'PENDING' || booking.refundStatus === 'PARTIAL';
          return (
            <li
              key={booking._id}
              className="rounded-2xl border-2 border-ink/10 bg-white p-4 shadow-[var(--shadow-soft)]"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-bold text-ink">{booking.bookingNumber}</p>
                  <p className="text-sm text-slate">
                    {booking.userId?.name} · {cityLabel(ride?.routeId?.origin)} →{' '}
                    {cityLabel(ride?.routeId?.destination)}
                  </p>
                  <p className="text-sm text-slate">{formatDateTime(ride?.departureTime)}</p>
                </div>
                <StatusBadge status={booking.refundStatus} type="payment" />
              </div>
              <p className="mt-3 font-display text-[clamp(1.25rem,2vw+0.5rem,1.75rem)] font-bold text-ink">
                {formatCurrency(booking.refundAmount)}
              </p>
              <p className="text-sm text-slate">Customer UPI: {booking.userId?.payoutUpi || 'Not added yet'}</p>
              {due ? (
                <p className="mt-2 text-sm font-semibold text-warning">
                  Customer has already paid. Refund required — process manually via UPI.
                </p>
              ) : null}
              {booking.refundReference ? (
                <p className="text-sm text-slate">Reference {booking.refundReference}</p>
              ) : null}
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => setSelected(booking)}>
                  View details
                </Button>
              </div>
              {due ? (
                <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                  <input
                    className="h-11 rounded-xl border border-line px-3 text-sm"
                    placeholder="UPI reference"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                  />
                  <input
                    className="h-11 rounded-xl border border-line px-3 text-sm"
                    placeholder="Note"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                  <Button size="sm" loading={mark.isPending} onClick={() => mark.mutate(booking._id)}>
                    Mark processed
                  </Button>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>

      <Pagination
        page={query.data?.page || page}
        pages={query.data?.pages || 1}
        total={query.data?.total || 0}
        onPage={setPage}
      />

      <Modal
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title="Refund details"
        size="lg"
        footer={
          selected && (selected.refundStatus === 'PENDING' || selected.refundStatus === 'PARTIAL') ? (
            <>
              <Button variant="outline" onClick={() => setSelected(null)}>
                Close
              </Button>
              <Button
                loading={mark.isPending}
                onClick={() => {
                  if (!reference.trim() || !reason.trim()) {
                    setError('UPI reference and note are required');
                    return;
                  }
                  mark.mutate(selected._id);
                }}
              >
                Mark processed
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={() => setSelected(null)}>
              Close
            </Button>
          )
        }
      >
        {selected ? (
          <div className="space-y-4 text-sm">
            <dl className="grid gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-bold uppercase tracking-wide text-slate">Refund / booking</dt>
                <dd className="font-semibold text-ink">{selected.bookingNumber}</dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase tracking-wide text-slate">Status</dt>
                <dd>
                  <StatusBadge status={selected.refundStatus} type="payment" />
                </dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase tracking-wide text-slate">Customer</dt>
                <dd className="text-ink">{selected.userId?.name || '—'}</dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase tracking-wide text-slate">Customer UPI</dt>
                <dd className="text-ink">{selected.userId?.payoutUpi || 'Not added'}</dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase tracking-wide text-slate">Original payment</dt>
                <dd className="font-semibold text-ink">
                  {formatCurrency(selected.proofAmount || selected.totalAmount)}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase tracking-wide text-slate">Refund amount</dt>
                <dd className="font-semibold text-ink">{formatCurrency(selected.refundAmount)}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs font-bold uppercase tracking-wide text-slate">Ride</dt>
                <dd className="text-ink">
                  {cityLabel(selected.rideId?.routeId?.origin)} →{' '}
                  {cityLabel(selected.rideId?.routeId?.destination)}
                  <span className="block text-ink-muted">
                    {formatDateTime(selected.rideId?.departureTime)}
                  </span>
                </dd>
              </div>
              {selected.refundReference ? (
                <div className="sm:col-span-2">
                  <dt className="text-xs font-bold uppercase tracking-wide text-slate">Transaction reference</dt>
                  <dd className="text-ink">{selected.refundReference}</dd>
                </div>
              ) : null}
              {selected.refundReason || selected.cancellationReason ? (
                <div className="sm:col-span-2">
                  <dt className="text-xs font-bold uppercase tracking-wide text-slate">Reason</dt>
                  <dd className="text-ink">{selected.refundReason || selected.cancellationReason}</dd>
                </div>
              ) : null}
            </dl>

            {(selected.refundStatus === 'PENDING' || selected.refundStatus === 'PARTIAL') && (
              <div className="grid gap-2 sm:grid-cols-2">
                <label className="block text-sm font-medium text-ink">
                  UPI reference
                  <input
                    className="mt-1 h-11 w-full rounded-xl border border-line px-3"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                  />
                </label>
                <label className="block text-sm font-medium text-ink">
                  Processing note
                  <input
                    className="mt-1 h-11 w-full rounded-xl border border-line px-3"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                </label>
              </div>
            )}
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
