import { Link } from 'react-router-dom';
import { cityLabel, entityId, formatCurrency, formatDate, formatTime } from '../../utils/format';
import StatusBadge from '../common/StatusBadge';
import { normalizeBooking } from '../../utils/bookingNormalize';

export default function BookingCard({ booking: raw }) {
  const booking = normalizeBooking(raw) || raw || {};
  const id = entityId(booking);
  const ride = booking.ride || {};
  const origin = ride.route?.origin || ride.origin;
  const destination = ride.route?.destination || ride.destination;
  const seats = booking.selectedSeats || booking.passengers?.map((p) => p.seatNumber) || [];

  return (
    <Link
      to={`/booking/${id}`}
      className="block rounded-2xl border border-line bg-white p-4 shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5 hover:border-brand/30 hover:shadow-[var(--shadow-lift)]"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold tracking-wide text-slate">
            {booking.bookingNumber || id}
          </p>
          <p className="mt-1 font-display text-lg font-bold text-navy">
            {cityLabel(origin)} → {cityLabel(destination)}
          </p>
          <p className="mt-1 text-sm text-slate">
            {formatDate(ride.date || ride.departureTime)} · {formatTime(ride.departureTime)}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <StatusBadge status={booking.bookingStatus} type="booking" />
          <StatusBadge status={booking.paymentStatus} type="payment" />
        </div>
      </div>
      <div className="mt-3 flex flex-wrap justify-between gap-2 text-sm">
        <span className="text-slate">Seats: {seats.join(', ') || '—'}</span>
        <span className="font-display text-lg font-bold text-brand">
          {formatCurrency(booking.totalAmount)}
        </span>
      </div>
    </Link>
  );
}
