import { useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { CheckCircle2, Download, ImageUp, Share2, Ticket } from 'lucide-react';
import { bookingService } from '../../services/bookingService';
import { getErrorMessage } from '../../services/api';
import WhatsAppAction from '../../components/booking/WhatsAppAction';
import BookingStepper from '../../components/booking/BookingStepper';
import HoldTimer from '../../components/seats/HoldTimer';
import Alert from '../../components/ui/Alert';
import Button from '../../components/ui/Button';
import Skeleton from '../../components/ui/Skeleton';
import {
  cityLabel,
  entityId,
  formatCurrency,
  formatDate,
  formatDuration,
  formatTime,
} from '../../utils/format';
import { cabDisplayName, seatMeta } from '../../utils/ridePresentation';
import { normalizeBooking } from '../../utils/bookingNormalize';

export default function BookingSuccessPage() {
  const location = useLocation();
  const queryClient = useQueryClient();
  const proofInput = useRef(null);
  const bookingId = location.state?.bookingId || entityId(location.state?.booking);
  const [mode, setMode] = useState(location.state?.mode || 'paid');
  const [uploadError, setUploadError] = useState('');
  const isHoldOnly = mode === 'hold';

  const { data, isLoading, isError } = useQuery({
    queryKey: ['bookings', bookingId],
    queryFn: () => bookingService.getById(bookingId),
    enabled: Boolean(bookingId),
  });

  const booking = normalizeBooking(data?.booking || data || location.state?.booking);
  const ride = booking?.ride;
  const driver = ride?.driver;
  const id = entityId(booking) || bookingId;
  const proofAlreadyIn =
    ['SUBMITTED', 'APPROVED'].includes(booking?.proofStatus) || mode === 'paid';

  const proofMutation = useMutation({
    mutationFn: (screenshot) =>
      bookingService.submitProof(id, {
        screenshot,
        amount: Number(booking?.totalAmount || 0),
      }),
    onSuccess: (result) => {
      setUploadError('');
      setMode('paid');
      queryClient.setQueryData(['bookings', bookingId], (prev) => {
        const next = result?.booking || result;
        if (!prev) return { booking: next };
        if (prev.booking) return { ...prev, booking: { ...prev.booking, ...next } };
        return { ...prev, ...next };
      });
      queryClient.invalidateQueries({ queryKey: ['bookings', bookingId] });
    },
    onError: (err) => setUploadError(getErrorMessage(err, 'Could not upload the screenshot')),
  });

  function onScreenshot(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 2 * 1024 * 1024) {
      setUploadError('Use a PNG, JPEG, or WebP screenshot under 2 MB.');
      return;
    }
    setUploadError('');
    const reader = new FileReader();
    reader.onload = () => proofMutation.mutate(String(reader.result));
    reader.readAsDataURL(file);
  }

  if (!bookingId && !booking) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12">
        <Alert tone="info">
          No confirmation to show.{' '}
          <Link to="/my-bookings" className="underline">
            My bookings
          </Link>
        </Alert>
      </div>
    );
  }

  if (isLoading && !booking) {
    return (
      <div className="mx-auto max-w-2xl space-y-3 px-4 py-12">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (isError && !booking) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12">
        <Alert tone="error">Could not load booking confirmation.</Alert>
      </div>
    );
  }

  const seats = booking.selectedSeats || booking.passengers?.map((p) => p.seatNumber) || [];
  const origin = ride?.route?.origin || ride?.origin;
  const destination = ride?.route?.destination || ride?.destination;
  const destLabel = cityLabel(destination);
  const duration = ride?.route?.estimatedDuration || ride?.estimatedDuration;
  const primarySeat = seats[0];
  const meta = primarySeat ? seatMeta(primarySeat) : null;
  const showHoldUpload = isHoldOnly && !proofAlreadyIn && booking?.bookingStatus === 'PENDING';

  const share = async () => {
    const text = `RaahiX booking ${booking.bookingNumber}: ${cityLabel(origin)} → ${destLabel}, seat ${seats.join(', ')}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'RaahiX booking', text });
      } catch {
        /* dismissed */
      }
    } else {
      await navigator.clipboard?.writeText(text);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <BookingStepper current={showHoldUpload ? 'payment' : 'confirmed'} className="mb-6" />
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="overflow-hidden rounded-3xl border border-line bg-white shadow-[var(--shadow-lift)]"
      >
        <div className="bg-brand px-6 py-8 text-center text-ink">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white/15">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h1 className="mt-4 font-display text-3xl font-bold text-balance">
            {showHoldUpload
              ? `Seats held for ${destLabel.split(',')[0]}`
              : `Payment submitted for ${destLabel.split(',')[0]}`}
          </h1>
          <p className="mt-2 text-sm text-ink/80">
            {showHoldUpload
              ? 'Booked without payment for now. Pay and upload a screenshot before the hold expires — the seat is confirmed only after the driver approves.'
              : 'Screenshot sent. Your booking stays pending until the driver verifies payment.'}
          </p>
          {showHoldUpload && booking.holdExpiresAt ? (
            <div className="mx-auto mt-4 max-w-sm text-left">
              <HoldTimer
                expiresAt={booking.holdExpiresAt}
                className="justify-center border-ink/15 bg-white/90 text-navy shadow-sm"
              />
            </div>
          ) : null}
          <p className="mt-3 text-sm text-ink/70">Booking ID</p>
          <p className="mt-1 font-mono text-lg font-semibold tracking-wide">
            {booking.bookingNumber || entityId(booking)}
          </p>
        </div>

        <div className="p-6">
          <div className="rounded-2xl bg-mist/80 px-4 py-5">
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-center">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate">
                  {cityLabel(origin).split(',')[0]}
                </p>
                <p className="mt-1 font-display text-2xl font-bold text-navy">
                  {formatTime(ride?.departureTime)}
                </p>
              </div>
              <div className="px-2">
                <div className="h-px w-16 bg-brand sm:w-24" />
                <p className="mt-1 text-[11px] font-semibold text-brand-dark">
                  {duration ? formatDuration(duration) : 'Direct'}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate">
                  {destLabel.split(',')[0]}
                </p>
                <p className="mt-1 font-display text-2xl font-bold text-navy">
                  {formatTime(ride?.arrivalTime)}
                </p>
              </div>
            </div>
            <p className="mt-3 text-center text-xs text-slate">
              {formatDate(ride?.date || ride?.departureTime)}
            </p>
          </div>

          <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
            <div className="rounded-xl border border-line p-3">
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate">Car</dt>
              <dd className="mt-1 font-semibold text-navy">
                {cabDisplayName(ride)}
                {ride?.vehicle?.registrationNumber ? ` · ${ride.vehicle.registrationNumber}` : ''}
              </dd>
            </div>
            <div className="rounded-xl border border-line p-3">
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate">Driver</dt>
              <dd className="mt-1 font-semibold text-navy">
                {ride?.driver?.name || 'Assigned driver'}
                {ride?.driver?.phone ? ` · ${ride.driver.phone}` : ''}
              </dd>
            </div>
            <div className="rounded-xl border border-line p-3 sm:col-span-2">
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate">Seats and passengers</dt>
              <dd className="mt-1 font-semibold text-navy">
                {(booking.passengers || []).length
                  ? booking.passengers
                      .map((passenger) => `${passenger.seatNumber} ${passenger.name || ''}`.trim())
                      .join(' · ')
                  : seats.join(', ')}
                {meta ? ` · ${meta.label}` : ''}
              </dd>
            </div>
            <div className="rounded-xl border border-line p-3">
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate">
                {showHoldUpload ? 'Amount due' : 'Amount'}
              </dt>
              <dd className="mt-1 font-display text-xl font-bold text-brand-dark">
                {formatCurrency(booking.totalAmount)}
              </dd>
            </div>
          </dl>

          {showHoldUpload ? (
            <section className="print-hide mt-4 space-y-3 rounded-2xl border border-line bg-mist/50 p-4">
              <h2 className="font-display text-lg font-bold text-navy">Pay and upload screenshot</h2>
              <p className="text-sm text-slate">
                Pay {formatCurrency(booking.totalAmount)} to the driver, then upload your UPI screenshot here.
              </p>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate">UPI ID</p>
                <p className="mt-1 font-display text-xl font-bold text-navy">
                  {driver?.upiId || 'The driver has not added a UPI ID yet.'}
                </p>
              </div>
              {driver?.paymentInstructions ? (
                <p className="text-sm text-slate">{driver.paymentInstructions}</p>
              ) : null}
              {driver?.qrCode ? (
                <img
                  src={driver.qrCode}
                  alt={`${driver?.name || 'Driver'} UPI QR code`}
                  className="h-48 w-48 rounded-xl border border-line bg-white object-contain p-2"
                />
              ) : null}
              {uploadError ? (
                <Alert tone="error" title="Upload failed">
                  {uploadError}
                </Alert>
              ) : null}
              <input
                ref={proofInput}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="sr-only"
                disabled={proofMutation.isPending}
                onChange={onScreenshot}
              />
              <Button
                type="button"
                className="w-full"
                loading={proofMutation.isPending}
                onClick={() => proofInput.current?.click()}
              >
                <ImageUp className="h-4 w-4" />
                Upload payment screenshot
              </Button>
              <Link
                to="/checkout"
                state={{ bookingId: id, booking }}
                className="block text-center text-sm font-semibold text-slate hover:text-brand-dark"
              >
                Open full checkout instead
              </Link>
            </section>
          ) : null}

          <div className="print-hide mt-6 flex flex-col gap-2 sm:flex-row">
            <Link to={`/booking/${entityId(booking)}`} className="flex-1">
              <Button className="w-full" variant={showHoldUpload ? 'outline' : 'primary'}>
                <Ticket className="h-4 w-4" />
                View ticket
              </Button>
            </Link>
            <Button variant="outline" className="flex-1" onClick={() => window.print()}>
              <Download className="h-4 w-4" />
              Print / Save PDF
            </Button>
            <Button variant="secondary" className="flex-1" onClick={share}>
              <Share2 className="h-4 w-4" />
              Share
            </Button>
          </div>

          <div className="print-hide mt-4 flex justify-center">
            <WhatsAppAction booking={booking} />
          </div>
        </div>
      </motion.div>
    </div>
  );
}
