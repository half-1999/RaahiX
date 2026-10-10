import { MessageCircle } from 'lucide-react';
import Button from '../ui/Button';
import { cityLabel, formatCurrency, formatDate, formatTime } from '../../utils/format';
import { normalizeBooking } from '../../utils/bookingNormalize';

function buildMessage(raw) {
  const booking = normalizeBooking(raw) || raw || {};
  const ride = booking.ride || {};
  const origin = cityLabel(ride.route?.origin || ride.origin);
  const destination = cityLabel(ride.route?.destination || ride.destination);
  const seats = (booking.selectedSeats || booking.passengers?.map((p) => p.seatNumber) || []).join(', ');
  return [
    `RaahiX booking ${booking.bookingNumber || ''}`.trim(),
    `${origin} → ${destination}`,
    `${formatDate(ride.date || ride.departureTime)} ${formatTime(ride.departureTime)}`,
    `Seats: ${seats || '—'}`,
    `Amount: ${formatCurrency(booking.totalAmount)}`,
  ].join('\n');
}

export default function WhatsAppAction({
  booking,
  phone,
  label = 'Share on WhatsApp',
  className,
}) {
  const number = (phone || import.meta.env.VITE_WHATSAPP_NUMBER || '').replace(/\D/g, '');
  const text = encodeURIComponent(buildMessage(booking || {}));
  const href = number
    ? `https://wa.me/${number}?text=${text}`
    : `https://wa.me/?text=${text}`;

  return (
    <Button
      variant="accent"
      className={className}
      onClick={() => window.open(href, '_blank', 'noopener,noreferrer')}
    >
      <MessageCircle className="h-4 w-4" />
      {label}
    </Button>
  );
}
