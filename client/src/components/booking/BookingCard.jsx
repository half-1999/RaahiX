import { Link } from 'react-router-dom';
import { cityLabel, entityId, formatCurrency, formatDate, formatTime } from '../../utils/format';
import StatusBadge from '../common/StatusBadge';

export default function BookingCard({ booking }) {
  const id = entityId(booking);
  const ride = booking.ride || {};
  const origin = ride.route?.origin || ride.origin;
  const destination = ride.route?.destination || ride.destination;
  const seats = booking.selectedSeats || booking.passengers?.map((p) => p.seatNumber) || [];

  return (
    <Link
      to={`/booking/${id}`}
      className="block rounded-xl border border-line bg-white p-4 transition hover:border-brand/40"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs text-ink-muted">{booking.bookingNumber || id}</p>
          <p className="font-display text-lg text-ink">
            {cityLabel(origin)} → {cityLabel(destination)}
          </p>
          <p className="mt-1 text-sm text-ink-muted">
            {formatDate(ride.date || ride.departureTime)} · {formatTime(ride.departureTime)}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <StatusBadge status={booking.bookingStatus} type="booking" />
          <StatusBadge status={booking.paymentStatus} type="payment" />
        </div>
      </div>
      <div className="mt-3 flex flex-wrap justify-between gap-2 text-sm">
        <span className="text-ink-muted">Seats: {seats.join(', ') || '—'}</span>
        <span className="font-medium text-brand">{formatCurrency(booking.totalAmount)}</span>
      </div>
    </Link>
  );
}
