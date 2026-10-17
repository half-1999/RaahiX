import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle2,
  CreditCard,
  IndianRupee,
  Search,
  XCircle,
} from 'lucide-react';
import { driverService } from '../../services/driverService';
import { getErrorMessage } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import PageHeader from '../../components/common/PageHeader';
import SearchFiltersBar from '../../components/common/SearchFiltersBar';
import StatusBadge from '../../components/common/StatusBadge';
import Alert from '../../components/ui/Alert';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import Select from '../../components/ui/Select';
import SummaryCard, { SummaryGrid } from '../../components/ui/SummaryCard';
import { cityLabel, formatCurrency, formatDateTime } from '../../utils/format';

export default function DriverPaymentsPage() {
  const queryClient = useQueryClient();
  const { refreshMe } = useAuth();
  const [upiId, setUpiId] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [paymentInstructions, setPaymentInstructions] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [details, setDetails] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const detailsQuery = useQuery({
    queryKey: ['driver', 'payment-details'],
    queryFn: async () => {
      const data = await driverService.paymentDetails();
      setUpiId(data.upiId || '');
      setQrCode(data.qrCode || '');
      setPaymentInstructions(data.paymentInstructions || '');
      return data;
    },
  });

  const bookingsQuery = useQuery({
    queryKey: ['driver', 'bookings'],
    queryFn: () => driverService.listBookings(),
  });

  const bookings = bookingsQuery.data?.bookings || [];

  const summary = useMemo(() => {
    const total = bookings.length;
    const approved = bookings.filter((b) => b.proofStatus === 'APPROVED');
    const pending = bookings.filter((b) => b.proofStatus === 'SUBMITTED' || b.proofStatus === 'PENDING');
    const failed = bookings.filter((b) => b.proofStatus === 'REJECTED');
    const received = approved.reduce((sum, b) => sum + Number(b.proofAmount || b.totalAmount || 0), 0);
    const outstanding = pending.reduce((sum, b) => sum + Number(b.proofAmount || b.totalAmount || 0), 0);
    return {
      total,
      successful: approved.length,
      pending: pending.length,
      failed: failed.length,
      received,
      outstanding,
    };
  }, [bookings]);

  const filtered = useMemo(() => {
    return bookings.filter((booking) => {
      if (statusFilter && booking.proofStatus !== statusFilter) return false;
      const q = search.trim().toLowerCase();
      if (!q) return true;
      const hay = [
        booking.bookingNumber,
        booking.userId?.name,
        booking.proofStatus,
        booking.bookingStatus,
        cityLabel(booking.rideId?.routeId?.origin),
        cityLabel(booking.rideId?.routeId?.destination),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [bookings, search, statusFilter]);

  const saveDetails = useMutation({
    mutationFn: () => driverService.updatePaymentDetails({ upiId, qrCode, paymentInstructions }),
    onSuccess: async () => {
      setError('');
      setSuccess('Payment details saved');
      setSettingsOpen(false);
      await refreshMe();
      queryClient.invalidateQueries({ queryKey: ['driver', 'payment-details'] });
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  const review = useMutation({
    mutationFn: ({ id, decision }) => driverService.reviewPayment(id, { decision, reason }),
    onSuccess: () => {
      setReason('');
      setSuccess('Payment review saved');
      setDetails(null);
      queryClient.invalidateQueries({ queryKey: ['driver', 'bookings'] });
      queryClient.invalidateQueries({ queryKey: ['driver', 'dashboard'] });
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title="Payments"
        subtitle="Customers pay you directly. Approving a screenshot confirms the booking."
        actions={
          <Button size="sm" variant="outline" onClick={() => setSettingsOpen(true)}>
            Payment settings
          </Button>
        }
      />

      {error ? <Alert tone="error">{error}</Alert> : null}
      {success ? <Alert tone="success">{success}</Alert> : null}

      <SummaryGrid className="xl:grid-cols-3">
        <SummaryCard label="Total payments" value={summary.total} icon={CreditCard} />
        <SummaryCard label="Successful" value={summary.successful} icon={CheckCircle2} />
        <SummaryCard label="Pending" value={summary.pending} icon={CreditCard} />
        <SummaryCard label="Failed / rejected" value={summary.failed} icon={XCircle} />
        <SummaryCard label="Amount received" value={formatCurrency(summary.received)} icon={IndianRupee} />
        <SummaryCard label="Outstanding" value={formatCurrency(summary.outstanding)} icon={IndianRupee} />
      </SummaryGrid>

      <SearchFiltersBar
        activeCount={[search, statusFilter].filter(Boolean).length}
        onReset={() => {
          setSearch('');
          setStatusFilter('');
        }}
      >
        <label className="relative min-w-0 w-full md:max-w-xs md:flex-1">
          <span className="sr-only">Search payments</span>
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate" aria-hidden="true" />
          <input
            className="h-11 w-full rounded-xl border border-line bg-white py-2 pr-3 pl-9 text-sm"
            placeholder="Search booking, passenger…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <Select
          label="Proof status"
          className="min-w-[10rem] w-full md:w-auto"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          options={[
            { value: '', label: 'All proof statuses' },
            { value: 'SUBMITTED', label: 'Submitted' },
            { value: 'APPROVED', label: 'Approved' },
            { value: 'REJECTED', label: 'Rejected' },
            { value: 'PENDING', label: 'Pending' },
          ]}
        />
        <Input
          label="Rejection reason"
          className="min-w-0 w-full md:max-w-sm md:flex-1"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          hint="Required when rejecting"
        />
      </SearchFiltersBar>

      {bookingsQuery.isLoading ? <p className="text-sm text-slate">Loading payments…</p> : null}

      {!bookingsQuery.isLoading && !filtered.length ? (
        <EmptyState icon={CreditCard} title="No payments found" description="Submitted UPI proofs appear here." />
      ) : null}

      {/* Desktop table */}
      <div className="hidden overflow-x-auto rounded-2xl border-2 border-ink/10 bg-white md:block">
        <table className="w-full min-w-[40rem] text-left text-sm">
          <thead className="border-b border-line bg-surface text-xs font-bold uppercase tracking-wide text-slate">
            <tr>
              <th className="px-4 py-3">Booking</th>
              <th className="px-4 py-3">Passenger</th>
              <th className="px-4 py-3">Ride</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((booking) => (
              <tr key={booking._id} className="border-b border-line last:border-0">
                <td className="px-4 py-3 font-semibold text-ink">
                  <div>{booking.bookingNumber}</div>
                  {booking.paymentReference ? (
                    <div className="font-mono text-xs text-ink-muted">{booking.paymentReference}</div>
                  ) : null}
                </td>
                <td className="px-4 py-3 text-ink-muted">{booking.userId?.name || '—'}</td>
                <td className="px-4 py-3 text-ink-muted">
                  {cityLabel(booking.rideId?.routeId?.origin)} → {cityLabel(booking.rideId?.routeId?.destination)}
                </td>
                <td className="px-4 py-3 font-semibold">
                  {formatCurrency(booking.proofAmount || booking.totalAmount)}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={booking.proofStatus} type="payment" />
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1.5">
                    <Button size="sm" variant="outline" onClick={() => setDetails(booking)}>
                      Details
                    </Button>
                    {booking.proofStatus === 'SUBMITTED' ? (
                      <>
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
                      </>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <ul className="space-y-3 md:hidden">
        {filtered.map((booking) => (
          <li
            key={booking._id}
            className="rounded-2xl border-2 border-ink/10 bg-white p-4 shadow-[var(--shadow-soft)]"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-ink">{booking.bookingNumber}</p>
                <p className="text-sm text-slate">{booking.userId?.name}</p>
              </div>
              <StatusBadge status={booking.proofStatus} type="payment" />
            </div>
            <p className="mt-2 text-sm text-ink-muted">
              {cityLabel(booking.rideId?.routeId?.origin)} → {cityLabel(booking.rideId?.routeId?.destination)}
            </p>
            <p className="mt-1 font-display text-xl font-bold text-ink">
              {formatCurrency(booking.proofAmount || booking.totalAmount)}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => setDetails(booking)}>
                Details
              </Button>
              {booking.proofStatus === 'SUBMITTED' ? (
                <>
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
                </>
              ) : null}
            </div>
          </li>
        ))}
      </ul>

      <Modal
        open={Boolean(details)}
        onClose={() => setDetails(null)}
        title="Payment details"
        size="md"
        footer={
          details?.proofStatus === 'SUBMITTED' ? (
            <>
              <Button variant="outline" onClick={() => setDetails(null)}>
                Close
              </Button>
              <Button
                variant="danger"
                loading={review.isPending}
                onClick={() => review.mutate({ id: details._id, decision: 'REJECT' })}
              >
                Reject
              </Button>
              <Button
                loading={review.isPending}
                onClick={() => review.mutate({ id: details._id, decision: 'APPROVE' })}
              >
                Approve
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={() => setDetails(null)}>
              Close
            </Button>
          )
        }
      >
        {details ? (
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs font-bold uppercase tracking-wide text-slate">Booking</dt>
              <dd className="font-semibold text-ink">{details.bookingNumber}</dd>
            </div>
            <div>
              <dt className="text-xs font-bold uppercase tracking-wide text-slate">Passenger</dt>
              <dd className="text-ink">{details.userId?.name || '—'}</dd>
            </div>
            <div>
              <dt className="text-xs font-bold uppercase tracking-wide text-slate">Amount</dt>
              <dd className="font-semibold text-ink">
                {formatCurrency(details.proofAmount || details.totalAmount)}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-bold uppercase tracking-wide text-slate">Proof status</dt>
              <dd>
                <StatusBadge status={details.proofStatus} type="payment" />
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs font-bold uppercase tracking-wide text-slate">Ride</dt>
              <dd className="text-ink">
                {cityLabel(details.rideId?.routeId?.origin)} → {cityLabel(details.rideId?.routeId?.destination)}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs font-bold uppercase tracking-wide text-slate">Updated</dt>
              <dd className="text-ink-muted">{formatDateTime(details.updatedAt)}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs font-bold uppercase tracking-wide text-slate">Booking status</dt>
              <dd className="text-ink">{details.bookingStatus}</dd>
            </div>
          </dl>
        ) : null}
      </Modal>

      <Modal
        open={settingsOpen}
        onClose={() => !saveDetails.isPending && setSettingsOpen(false)}
        title="Payment settings"
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setSettingsOpen(false)} disabled={saveDetails.isPending}>
              Cancel
            </Button>
            <Button loading={saveDetails.isPending || detailsQuery.isLoading} onClick={() => saveDetails.mutate()}>
              Save details
            </Button>
          </>
        }
      >
        <div className="grid gap-3">
          <Input label="UPI ID" value={upiId} onChange={(e) => setUpiId(e.target.value)} />
          <label className="block text-sm font-medium text-ink">
            QR code image
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="mt-1 block w-full text-sm"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                if (file.size > 2 * 1024 * 1024) {
                  setError('QR image must be 2 MB or smaller');
                  return;
                }
                const reader = new FileReader();
                reader.onload = () => setQrCode(String(reader.result));
                reader.readAsDataURL(file);
              }}
            />
          </label>
          {qrCode ? (
            <img src={qrCode} alt="Your UPI QR code" className="h-36 w-36 rounded-lg border border-line object-contain" />
          ) : null}
          <Input
            label="Instructions"
            value={paymentInstructions}
            onChange={(e) => setPaymentInstructions(e.target.value)}
          />
        </div>
      </Modal>
    </div>
  );
}
