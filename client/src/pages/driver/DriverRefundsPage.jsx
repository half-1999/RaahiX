import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { RotateCcw } from 'lucide-react';
import { driverService } from '../../services/driverService';
import { getErrorMessage } from '../../services/api';
import PageHeader from '../../components/common/PageHeader';
import Pagination from '../../components/common/Pagination';
import StatusBadge from '../../components/common/StatusBadge';
import Alert from '../../components/ui/Alert';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import { cityLabel, formatCurrency, formatDateTime } from '../../utils/format';

export default function DriverRefundsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [reference, setReference] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const query = useQuery({
    queryKey: ['driver', 'refunds', page],
    queryFn: () => driverService.listRefunds({ page, limit: 10 }),
  });
  const mark = useMutation({
    mutationFn: (id) => driverService.markRefund(id, { refundReference: reference, reason }),
    onSuccess: () => {
      setReference('');
      setReason('');
      setError('');
      queryClient.invalidateQueries({ queryKey: ['driver', 'refunds'] });
    },
    onError: (err) => setError(getErrorMessage(err)),
  });
  const bookings = query.data?.bookings || [];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Refunds"
        subtitle="If a passenger already paid and a refund is due, send it manually on UPI, then mark it processed."
      />
      {error ? <Alert tone="error">{error}</Alert> : null}
      {query.isError ? <Alert tone="error">Unable to load refunds.</Alert> : null}
      {!query.isLoading && !bookings.length ? (
        <EmptyState icon={RotateCcw} title="No refunds require your attention" description="Refund tasks appear here when a paid booking is cancelled." />
      ) : null}
      <ul className="space-y-3">
        {bookings.map((booking) => {
          const ride = booking.rideId;
          const due = booking.refundStatus === 'PENDING' || booking.refundStatus === 'PARTIAL';
          return (
            <li key={booking._id} className="rounded-2xl border border-line bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-bold text-navy">{booking.bookingNumber}</p>
                  <p className="text-sm text-slate">
                    {booking.userId?.name} · {cityLabel(ride?.routeId?.origin)} → {cityLabel(ride?.routeId?.destination)}
                  </p>
                  <p className="text-sm text-slate">{formatDateTime(ride?.departureTime)}</p>
                </div>
                <StatusBadge status={booking.refundStatus} type="payment" />
              </div>
              <p className="mt-3 font-display text-2xl font-bold text-navy">{formatCurrency(booking.refundAmount)}</p>
              <p className="text-sm text-slate">Customer UPI: {booking.userId?.payoutUpi || 'Not added yet'}</p>
              {due ? (
                <p className="mt-2 text-sm font-semibold text-warning">Customer has already paid. Refund required — process manually via UPI.</p>
              ) : null}
              {booking.refundReference ? <p className="text-sm text-slate">Reference {booking.refundReference}</p> : null}
              {due ? (
                <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                  <input className="h-11 rounded-xl border border-line px-3 text-sm" placeholder="UPI reference" value={reference} onChange={(e) => setReference(e.target.value)} />
                  <input className="h-11 rounded-xl border border-line px-3 text-sm" placeholder="Note" value={reason} onChange={(e) => setReason(e.target.value)} />
                  <Button size="sm" loading={mark.isPending} onClick={() => mark.mutate(booking._id)}>
                    Mark refund processed
                  </Button>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
      <Pagination page={query.data?.page || page} pages={query.data?.pages || 1} total={query.data?.total || 0} onPage={setPage} />
    </div>
  );
}
