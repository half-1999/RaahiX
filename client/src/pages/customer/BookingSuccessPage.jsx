import { Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';
import { bookingService } from '../../services/bookingService';
import WhatsAppAction from '../../components/booking/WhatsAppAction';
import Alert from '../../components/ui/Alert';
import Button from '../../components/ui/Button';
import Skeleton from '../../components/ui/Skeleton';
import { cityLabel, entityId, formatCurrency, formatDate, formatTime } from '../../utils/format';

export default function BookingSuccessPage() {
  const location = useLocation();
  const bookingId = location.state?.bookingId || entityId(location.state?.booking);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['bookings', bookingId],
    queryFn: () => bookingService.getById(bookingId),
    enabled: Boolean(bookingId),
  });

  const booking = data?.booking || data || location.state?.booking;
  const ride = booking?.ride;

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
      <div className="mx-auto max-w-lg space-y-3 px-4 py-12">
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

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-2xl border border-success/20 bg-white p-6 text-center shadow-sm"
      >
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success/10 text-success">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <h1 className="mt-4 font-display text-3xl text-ink">Booking confirmed</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Confirmation email is on the way. Keep this booking number handy.
        </p>
        <p className="mt-4 font-mono text-lg font-semibold text-brand">
          {booking.bookingNumber || entityId(booking)}
        </p>
        <dl className="mt-6 space-y-2 text-left text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-ink-muted">Route</dt>
            <dd className="font-medium">
              {cityLabel(ride?.route?.origin || ride?.origin)} →{' '}
              {cityLabel(ride?.route?.destination || ride?.destination)}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-ink-muted">When</dt>
            <dd className="font-medium">
              {formatDate(ride?.date || ride?.departureTime)} {formatTime(ride?.departureTime)}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-ink-muted">Seats</dt>
            <dd className="font-medium">{seats.join(', ')}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-ink-muted">Paid</dt>
            <dd className="font-medium">{formatCurrency(booking.totalAmount)}</dd>
          </div>
        </dl>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <WhatsAppAction booking={booking} />
          <Link to={`/booking/${entityId(booking)}`}>
            <Button variant="outline" className="w-full">
              Booking details
            </Button>
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
