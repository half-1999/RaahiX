import { cityLabel, formatCurrency, formatDate, formatDuration, formatTime } from '../../utils/format';
import StatusBadge from '../common/StatusBadge';

export default function RideSummary({ ride, compact = false }) {
  if (!ride) return null;
  const origin = ride.route?.origin || ride.origin;
  const destination = ride.route?.destination || ride.destination;
  const duration = ride.route?.estimatedDuration || ride.estimatedDuration;

  return (
    <div className="rounded-xl border border-line bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-display text-xl text-ink">
            {cityLabel(origin)} → {cityLabel(destination)}
          </p>
          <p className="mt-1 text-sm text-ink-muted">
            {formatDate(ride.date || ride.departureTime)} · {formatTime(ride.departureTime)}
            {ride.arrivalTime ? ` – ${formatTime(ride.arrivalTime)}` : ''}
            {duration ? ` · ${formatDuration(duration)}` : ''}
          </p>
        </div>
        {ride.status ? <StatusBadge status={ride.status} type="ride" /> : null}
      </div>
      {!compact ? (
        <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-ink-muted">Pickup</dt>
            <dd className="font-medium">{ride.pickupPoint || '—'}</dd>
          </div>
          <div>
            <dt className="text-ink-muted">Drop</dt>
            <dd className="font-medium">{ride.dropPoint || '—'}</dd>
          </div>
          <div>
            <dt className="text-ink-muted">Vehicle</dt>
            <dd className="font-medium">
              {ride.vehicle?.make
                ? `${ride.vehicle.make} ${ride.vehicle.model || ''}`.trim()
                : ride.vehicleType || '—'}
            </dd>
          </div>
          <div>
            <dt className="text-ink-muted">Price / seat</dt>
            <dd className="font-medium text-brand">
              {formatCurrency(ride.pricePerSeat ?? ride.price)}
            </dd>
          </div>
          {ride.driver?.name ? (
            <div>
              <dt className="text-ink-muted">Driver</dt>
              <dd className="font-medium">{ride.driver.name}</dd>
            </div>
          ) : null}
        </dl>
      ) : null}
    </div>
  );
}
