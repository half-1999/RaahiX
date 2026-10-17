import { Link } from 'react-router-dom';
import {
  Armchair,
  Baby,
  CarFront,
  Clock3,
  Droplets,
  Luggage,
  MapPin,
  Music,
  Shield,
  Star,
  Sun,
  Users,
  Usb,
  Wifi,
  Wind,
  Zap,
} from 'lucide-react';
import {
  cityLabel,
  entityId,
  formatCurrency,
  formatDuration,
  formatTime,
} from '../../utils/format';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import { cn } from '../../utils/cn';
import { cabDisplayName, rideAmenities, rideHeroImage } from '../../utils/ridePresentation';
import { vehicleTypeLabel } from '../../utils/vehicleLayouts';

const amenityIcon = {
  AC: Wind,
  'Wi-Fi': Wifi,
  WiFi: Wifi,
  WIFI: Wifi,
  Charging: Zap,
  'USB charging': Zap,
  'USB ports': Usb,
  USB: Usb,
  Reclining: Armchair,
  'Reclining seats': Armchair,
  'Pushback seats': Armchair,
  'Music system': Music,
  'Reading light': Sun,
  'Water bottle': Droplets,
  'Bottle holder': Droplets,
  Blanket: Luggage,
  'First aid kit': Shield,
  'Luggage space': Luggage,
  'Sanitized cabin': Shield,
  'Child seat': Baby,
  'Window shades': Sun,
  Water: Droplets,
};

export default function RideCard({
  ride,
  passengers = 1,
  variant = 'available', // available | full | demo
}) {
  const id = entityId(ride);
  const origin = ride.route?.origin || ride.origin;
  const destination = ride.route?.destination || ride.destination;
  const price = ride.pricePerSeat ?? ride.price;
  const seats = ride.segmentSeats ?? ride.availableSeats;
  const duration = ride.route?.estimatedDuration || ride.estimatedDuration;
  const amenities = rideAmenities(ride);
  const name = cabDisplayName(ride);
  const rating = ride.rating;
  const isDemo = Boolean(ride.isDemo || ride.isSeed || variant === 'demo');
  const isFull = Boolean(ride.fullyBooked || variant === 'full' || seats === 0);
  const canBook = !isFull && ride.bookable !== false;
  const occupied = ride.occupiedSeats ?? Math.max(0, (ride.totalSeats || 0) - (seats || 0));
  const driverName = ride.driver?.name;

  return (
    <article
      className={cn(
        'overflow-hidden rounded-2xl border bg-white shadow-[var(--shadow-soft)] transition',
        isFull ? 'border-line opacity-95' : 'border-line hover:-translate-y-0.5 hover:border-brand/25 hover:shadow-[var(--shadow-lift)]',
        isDemo && 'ring-1 ring-coral/20'
      )}
    >
      <div className="grid md:grid-cols-[200px_1fr]">
        <div className="relative h-44 md:h-auto">
          <img src={rideHeroImage(ride)} alt={name} className="h-full w-full object-cover" />
          <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
            <Badge tone="brand" className="bg-white/95 text-black backdrop-blur">
              {vehicleTypeLabel(ride.vehicle?.vehicleType || ride.vehicleType)}
            </Badge>
            {isDemo ? (
              <Badge tone="warning" className="bg-white/95 backdrop-blur">
                Demo ride
              </Badge>
            ) : null}
            {isFull ? (
              <Badge tone="neutral" className="bg-white/95 backdrop-blur">
                Fully booked
              </Badge>
            ) : null}
          </div>
        </div>
        <div className="flex flex-col gap-4 p-4 md:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="font-display text-xl font-bold text-navy">{name}</h3>
              <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate">
                {rating ? (
                  <span className="inline-flex items-center gap-1 font-semibold text-navy">
                    <Star className="h-3.5 w-3.5 fill-coral text-coral" />
                    {Number(rating).toFixed(1)}
                    {ride.reviewCount ? ` (${ride.reviewCount})` : ''}
                  </span>
                ) : (
                  <span className="text-xs font-medium text-slate">No public rating yet</span>
                )}
                <span aria-hidden>·</span>
                <span>
                  {cityLabel(origin)} → {cityLabel(destination)}
                </span>
              </p>
              {driverName ? (
                <p className="mt-1 text-xs text-slate">
                  Driver {driverName}
                  {isDemo ? ' · demo profile' : ''}
                </p>
              ) : null}
              {ride.matchNote ? (
                <p className="mt-2 text-xs font-medium text-brand-ink">{ride.matchNote}</p>
              ) : null}
            </div>
            <div className="text-right">
              <p className="font-display text-2xl font-bold text-brand-dark">{formatCurrency(price)}</p>
              <p className="text-xs text-slate">per seat</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-sm text-navy">
            <span className="inline-flex items-center gap-1.5 font-semibold">
              <Clock3 className="h-4 w-4 text-brand-dark" />
              {formatTime(ride.departureTime)}
              <span className="text-slate">→</span>
              {formatTime(ride.arrivalTime)}
            </span>
            {duration ? (
              <span className="rounded-lg bg-mist px-2 py-1 text-xs font-semibold text-slate">
                {formatDuration(duration)}
              </span>
            ) : null}
            {isFull ? (
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-mist px-2 py-1 text-sm font-bold text-slate">
                <Users className="h-4 w-4" />
                {occupied}/{ride.totalSeats || occupied} seats taken
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-brand-soft px-2 py-1 text-sm font-bold text-navy">
                <Users className="h-4 w-4 text-brand-dark" />
                {seats ?? '—'} seats left
              </span>
            )}
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate">
              <CarFront className="h-3.5 w-3.5" />
              {name}
            </span>
            {ride.pickupPoint ? (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate">
                <MapPin className="h-3.5 w-3.5" />
                {ride.pickupPoint}
              </span>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {amenities.map((a) => {
              const Icon = amenityIcon[a] || Zap;
              return (
                <Badge key={a} tone="neutral">
                  <Icon className="h-3 w-3" />
                  {a}
                </Badge>
              );
            })}
          </div>

          <div className="mt-auto flex flex-wrap items-center justify-between gap-2">
            {isDemo ? (
              <p className="max-w-sm text-xs text-slate">
                Demonstration data — not a verified live offer.
              </p>
            ) : (
              <span />
            )}
            {canBook ? (
              <Link to={`/rides/${id}?passengers=${Math.max(1, Number(passengers) || 1)}`}>
                <Button size="sm">View seats</Button>
              </Link>
            ) : (
              <Button size="sm" variant="outline" disabled>
                {isFull ? 'Fully booked' : 'Unavailable'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
