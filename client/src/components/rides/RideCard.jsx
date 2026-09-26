import { Link } from 'react-router-dom';
import { Clock3, Users } from 'lucide-react';
import { cityLabel, entityId, formatCurrency, formatDuration, formatTime } from '../../utils/format';
import Badge from '../ui/Badge';

export default function RideCard({ ride }) {
  const id = entityId(ride);
  const origin = ride.route?.origin || ride.origin;
  const destination = ride.route?.destination || ride.destination;
  const price = ride.pricePerSeat ?? ride.price;
  const seats = ride.availableSeats;
  const duration = ride.route?.estimatedDuration || ride.estimatedDuration;

  return (
    <Link
      to={`/rides/${id}`}
      className="block rounded-xl border border-line bg-white p-4 transition hover:border-brand/40 hover:shadow-sm"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-display text-lg text-ink">
            {cityLabel(origin)} <span className="text-ink-muted">→</span> {cityLabel(destination)}
          </p>
          <p className="mt-1 flex items-center gap-3 text-sm text-ink-muted">
            <span className="inline-flex items-center gap-1">
              <Clock3 className="h-3.5 w-3.5" />
              {formatTime(ride.departureTime)} – {formatTime(ride.arrivalTime)}
            </span>
            {duration ? <span>{formatDuration(duration)}</span> : null}
          </p>
        </div>
        <div className="text-right">
          <p className="font-display text-xl text-brand">{formatCurrency(price)}</p>
          <p className="text-xs text-ink-muted">per seat</p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {ride.vehicleType || ride.vehicle?.vehicleType ? (
          <Badge tone="brand">{ride.vehicleType || ride.vehicle?.vehicleType}</Badge>
        ) : null}
        <Badge tone="neutral">
          <span className="inline-flex items-center gap-1">
            <Users className="h-3 w-3" />
            {seats} seats left
          </span>
        </Badge>
        {ride.pickupPoint ? (
          <span className="text-xs text-ink-muted">Pickup: {ride.pickupPoint}</span>
        ) : null}
      </div>
    </Link>
  );
}
