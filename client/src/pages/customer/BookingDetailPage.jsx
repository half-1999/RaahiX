import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { bookingService } from '../../services/bookingService';
import { getErrorMessage } from '../../services/api';
import WhatsAppAction from '../../components/booking/WhatsAppAction';
import RideSummary from '../../components/rides/RideSummary';
import StatusBadge from '../../components/common/StatusBadge';
import PageHeader from '../../components/common/PageHeader';
import Alert from '../../components/ui/Alert';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Skeleton from '../../components/ui/Skeleton';
import { entityId, formatCurrency } from '../../utils/format';

export default function BookingDetailPage() {
  const { bookingId } = useParams();
  const queryClient = useQueryClient();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const { data, isLoading, isError, error: qError } = useQuery({
    queryKey: ['bookings', bookingId],
    queryFn: () => bookingService.getById(bookingId),
  });

  const booking = data?.booking || data;
  const ride = booking?.ride;

  const cancelMutation = useMutation({
    mutationFn: () => bookingService.cancel(bookingId, reason),
    onSuccess: () => {
      setCancelOpen(false);
      queryClient.invalidateQueries({ queryKey: ['bookings', bookingId] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    },
    onError: (err) => setError(getErrorMessage(err, 'Could not cancel booking')),
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-8">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (isError || !booking) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <Alert tone="error" title="Booking not found">
          {getErrorMessage(qError)}
        </Alert>
      </div>
    );
  }

  const seats = booking.selectedSeats || booking.passengers?.map((p) => p.seatNumber) || [];
  const canCancel =
    booking.bookingStatus === 'CONFIRMED' || booking.bookingStatus === 'PENDING';

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <PageHeader
        title={booking.bookingNumber || 'Booking'}
        subtitle={`ID ${entityId(booking)}`}
        actions={
          <div className="flex gap-2">
            <StatusBadge status={booking.bookingStatus} type="booking" />
            <StatusBadge status={booking.paymentStatus} type="payment" />
          </div>
        }
      />

      {error ? <Alert tone="error" className="mb-4">{error}</Alert> : null}

      <div className="space-y-4">
        {ride ? <RideSummary ride={ride} /> : null}
        <div className="rounded-xl border border-line bg-white p-4">
          <h2 className="font-display text-lg">Passengers & seats</h2>
          <ul className="mt-3 divide-y divide-line text-sm">
            {(booking.passengers || seats.map((seatNumber) => ({ seatNumber }))).map((p, i) => (
              <li key={`${p.seatNumber}-${i}`} className="flex justify-between gap-3 py-2">
                <span>
                  Seat {p.seatNumber}
                  {p.name ? ` · ${p.name}` : ''}
                  {p.phone ? ` · ${p.phone}` : ''}
                </span>
                {p.age ? <span className="text-ink-muted">Age {p.age}</span> : null}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm">
            Total paid / due:{' '}
            <span className="font-display text-lg text-brand">
              {formatCurrency(booking.totalAmount)}
            </span>
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {booking.bookingStatus === 'CONFIRMED' ? <WhatsAppAction booking={booking} /> : null}
          {booking.bookingStatus === 'PENDING' && booking.paymentStatus !== 'PAID' ? (
            <Link to="/checkout" state={{ bookingId: entityId(booking), booking }}>
              <Button>Continue payment</Button>
            </Link>
          ) : null}
          {canCancel ? (
            <Button variant="danger" onClick={() => setCancelOpen(true)}>
              Cancel booking
            </Button>
          ) : null}
          <Link to="/my-bookings">
            <Button variant="outline">All bookings</Button>
          </Link>
        </div>
      </div>

      <Modal
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        title="Cancel booking?"
        footer={
          <>
            <Button variant="ghost" onClick={() => setCancelOpen(false)}>
              Keep booking
            </Button>
            <Button
              variant="danger"
              loading={cancelMutation.isPending}
              onClick={() => cancelMutation.mutate()}
            >
              Confirm cancel
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink-muted">
          Seats will be released if the cancellation policy allows.
        </p>
        <label className="mt-3 block text-sm">
          Reason (optional)
          <textarea
            className="mt-1 w-full rounded-lg border border-line p-2 text-sm"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </label>
      </Modal>
    </div>
  );
}
