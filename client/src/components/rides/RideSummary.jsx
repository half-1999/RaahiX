import { Clock3, MapPin, Navigation, Star, UserRound } from 'lucide-react';
import {
  cityLabel,
  formatCurrency,
  formatDate,
  formatDuration,
  formatTime,
} from '../../utils/format';
import StatusBadge from '../common/StatusBadge';
import { cabDisplayName, rideAmenities } from '../../utils/ridePresentation';
import Badge from '../ui/Badge';

export default function RideSummary({ ride, compact = false }) {
  if (!ride) return null;
  const origin =
    ride.route?.origin || ride.routeId?.origin || ride.origin;
  const destination =
    ride.route?.destination || ride.routeId?.destination || ride.destination;
  const duration =
    ride.route?.estimatedDuration ||
    ride.routeId?.estimatedDuration ||
    ride.estimatedDuration;
  const amenities = rideAmenities(ride);
  const vehicle =
    ride.vehicle ||
    (ride.vehicleId && typeof ride.vehicleId === 'object' ? ride.vehicleId : null);
  const driver =
    ride.driver ||
    (ride.driverId && typeof ride.driverId === 'object' && ride.driverId.name
      ? ride.driverId
      : null);
  const rideForDisplay = { ...ride, vehicle, driver };

  return (
    <div className="rounded-2xl border border-line bg-white p-4 shadow-[var(--shadow-soft)] md:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-display text-2xl font-bold text-navy">
            {cityLabel(origin)} → {cityLabel(destination)}
          </p>
          <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate">
            <span className="inline-flex items-center gap-1">
              <Clock3 className="h-3.5 w-3.5 text-brand" />
              {formatDate(ride.date || ride.departureTime)} · {formatTime(ride.departureTime)}
              {ride.arrivalTime ? ` – ${formatTime(ride.arrivalTime)}` : ''}
            </span>
            {duration ? <span>{formatDuration(duration)}</span> : null}
          </p>
        </div>
        {ride.status ? <StatusBadge status={ride.status} type="ride" /> : null}
      </div>
      {!compact ? (
        <>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div className="rounded-xl bg-mist/70 p-3">
              <dt className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-slate">
                <MapPin className="h-3 w-3 text-brand" /> Pickup
              </dt>
              <dd className="mt-1 font-semibold text-navy">{ride.pickupPoint || '—'}</dd>
            </div>
            <div className="rounded-xl bg-mist/70 p-3">
              <dt className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-slate">
                <Navigation className="h-3 w-3 text-coral" /> Drop
              </dt>
              <dd className="mt-1 font-semibold text-navy">{ride.dropPoint || '—'}</dd>
            </div>
            <div className="rounded-xl bg-mist/70 p-3">
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate">Vehicle</dt>
              <dd className="mt-1 font-semibold text-navy">{cabDisplayName(rideForDisplay)}</dd>
            </div>
            <div className="rounded-xl bg-mist/70 p-3">
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate">Price / seat</dt>
              <dd className="mt-1 font-display text-lg font-bold text-brand">
                {formatCurrency(ride.pricePerSeat ?? ride.price)}
              </dd>
            </div>
            {driver?.name ? (
              <div className="rounded-xl bg-mist/70 p-3 sm:col-span-2">
                <dt className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-slate">
                  <UserRound className="h-3 w-3" /> Operator
                </dt>
                <dd className="mt-1 flex items-center gap-2 font-semibold text-navy">
                  {driver.name}
                  {driver.rating ? (
                    <span className="inline-flex items-center gap-1 text-xs text-slate">
                      <Star className="h-3 w-3 fill-coral text-coral" />
                      {driver.rating}
                    </span>
                  ) : null}
                </dd>
              </div>
            ) : null}
          </dl>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {amenities.map((a) => (
              <Badge key={a} tone="brand">
                {a}
              </Badge>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
