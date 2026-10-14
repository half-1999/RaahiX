import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Armchair } from 'lucide-react';
import { bookingService } from '../../services/bookingService';
import { getErrorMessage } from '../../services/api';
import WhatsAppAction from '../../components/booking/WhatsAppAction';
import PaymentProofPreview from '../../components/booking/PaymentProofPreview';
import StatusBadge from '../../components/common/StatusBadge';
import Alert from '../../components/ui/Alert';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Skeleton from '../../components/ui/Skeleton';
import { cityLabel, entityId, formatCurrency, formatDate, formatTime } from '../../utils/format';
import { cabDisplayName, seatMeta } from '../../utils/ridePresentation';
import { vehicleTypeLabel } from '../../utils/vehicleLayouts';
import { normalizeBooking } from '../../utils/bookingNormalize';

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

  const booking = normalizeBooking(data?.booking || data);
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
  const vehicle = ride?.vehicle;
  const driver = ride?.driver;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-coral">Ticket</p>
          <h1 className="mt-1 font-display text-3xl font-bold text-navy">
            {booking.bookingNumber || 'Booking'}
          </h1>
          <p className="mt-1 text-sm text-slate">Ticket, car, driver, seats, and refund</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusBadge status={booking.bookingStatus} type="booking" />
          <StatusBadge status={booking.proofStatus || booking.paymentStatus} type="payment" />
          {booking.refundStatus ? <StatusBadge status={booking.refundStatus} type="payment" /> : null}
        </div>
      </div>

      {error ? <Alert tone="error" className="print-hide mb-4">{error}</Alert> : null}

      <article className="ticket-sheet mb-4 overflow-hidden rounded-2xl border border-line bg-white">
        <div className="border-b border-line bg-ivory px-5 py-4 text-ink">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate">RaahiX · Scheduled intercity shared rides</p>
          <p className="font-display text-2xl font-bold">{booking.bookingNumber}</p>
          <p className="text-sm text-slate">
            {cityLabel(ride?.route?.origin || ride?.origin)} → {cityLabel(ride?.route?.destination || ride?.destination)}
          </p>
        </div>
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate">Trip</p>
            <p className="font-bold text-navy">{formatDate(ride?.departureTime)} · {formatTime(ride?.departureTime)}</p>
            <p className="text-sm text-slate">Arrives {formatTime(ride?.arrivalTime)}</p>
            <p className="text-sm text-slate">Pickup {ride?.pickupPoint || 'As published'}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate">Car</p>
            <p className="font-bold text-navy">{cabDisplayName(ride)}</p>
            <p className="text-sm text-slate">{vehicleTypeLabel(vehicle?.vehicleType)}</p>
            <p className="text-sm text-slate">{vehicle?.registrationNumber || 'Registration on file'}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate">Driver</p>
            <p className="font-bold text-navy">{driver?.name || 'Driver'}</p>
            <p className="text-sm text-slate">{driver?.phone || 'Phone shared after confirmation'}</p>
            <p className="text-sm text-slate">Licence {driver?.licenseNumber || 'On file'}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate">Fare and refund</p>
            <p className="font-display text-2xl font-bold text-brand-dark">{formatCurrency(booking.totalAmount)}</p>
            <p className="text-sm text-slate">
              Refund {booking.refundStatus || 'NOT_APPLICABLE'}
              {booking.refundAmount ? ` · ${formatCurrency(booking.refundAmount)}` : ''}
            </p>
            {booking.refundReference ? <p className="text-sm text-slate">Reference {booking.refundReference}</p> : null}
          </div>
        </div>
      </article>

      <section className="mb-4 rounded-2xl border border-line bg-white p-5">
        <h2 className="font-display text-lg font-bold text-navy">Payment and refund</h2>
        <p className="mt-2 text-sm text-slate">
          Proof: {booking.proofStatus || 'NOT_SUBMITTED'} · Refund: {booking.refundStatus || 'NOT_APPLICABLE'}
          {booking.refundAmount ? ` · ${formatCurrency(booking.refundAmount)}` : ''}
        </p>
        <p className="mt-1 text-sm text-slate">UPI: {ride?.driver?.upiId || 'Ask the driver for UPI details'}</p>
        {booking.proofFile ? (
          <div className="mt-4">
            <PaymentProofPreview bookingId={entityId(booking)} status={booking.proofStatus} />
          </div>
        ) : null}
        {booking.bookingStatus === 'PENDING' && booking.proofStatus !== 'SUBMITTED' ? (
          <label className="mt-3 block text-sm font-medium text-navy">
            Upload payment screenshot
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="mt-2 block w-full text-sm"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = async () => {
                  try {
                    await bookingService.submitProof(bookingId, {
                      screenshot: String(reader.result),
                      amount: Number(booking.totalAmount),
                    });
                    queryClient.invalidateQueries({ queryKey: ['bookings', bookingId] });
                  } catch (err) {
                    setError(getErrorMessage(err, 'Could not submit the screenshot'));
                  }
                };
                reader.readAsDataURL(file);
              }}
            />
          </label>
        ) : null}
      </section>

      <div className="space-y-4">
        <section className="rounded-2xl border border-line bg-white p-5 shadow-[var(--shadow-soft)]">
          <div className="flex items-center justify-between gap-2">
            <h2 className="inline-flex items-center gap-2 font-display text-lg font-bold text-navy">
              <Armchair className="h-4 w-4 text-brand-dark" />
              Passengers &amp; seats
            </h2>
          </div>
          <ul className="mt-3 divide-y divide-line text-sm">
            {(booking.passengers || seats.map((seatNumber) => ({ seatNumber }))).map((p, i) => {
              const meta = seatMeta(p.seatNumber);
              return (
                <li key={`${p.seatNumber}-${i}`} className="flex justify-between gap-3 py-3">
                  <span>
                    <span className="font-semibold text-navy">Seat {p.seatNumber}</span>
                    <span className="text-slate"> · {meta.label}</span>
                    {p.name ? <span className="block text-slate">{p.name} · {p.phone}</span> : null}
                  </span>
                  {p.age ? <span className="text-slate">Age {p.age}</span> : null}
                </li>
              );
            })}
          </ul>
          <p className="mt-3 text-sm">
            Total paid / due:{' '}
            <span className="font-display text-2xl font-bold text-brand-dark">
              {formatCurrency(booking.totalAmount)}
            </span>
          </p>
        </section>

        <div className="flex flex-wrap gap-2 print:hidden">
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
          <Button variant="outline" onClick={() => window.print()}>
            Print / Save PDF
          </Button>
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
        <p className="text-sm text-slate">
          Seats will be released if the cancellation policy allows. This cannot be undone from the
          app.
        </p>
        <label className="mt-3 block text-sm font-medium text-navy">
          Reason (optional)
          <textarea
            className="mt-1 w-full rounded-xl border border-line p-2 text-sm"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </label>
      </Modal>
    </div>
  );
}
