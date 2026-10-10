import { useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Armchair, CarFront, Pencil, UserRound } from 'lucide-react';
import { bookingService } from '../../services/bookingService';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/ui/Button';
import { getErrorMessage } from '../../services/api';
import CheckoutSummary from '../../components/booking/CheckoutSummary';
import HoldTimer from '../../components/seats/HoldTimer';
import BookingStepper from '../../components/booking/BookingStepper';
import Alert from '../../components/ui/Alert';
import Skeleton from '../../components/ui/Skeleton';
import Badge from '../../components/ui/Badge';
import {
  cityLabel,
  entityId,
  formatCurrency,
  formatDate,
  formatDuration,
  formatTime,
} from '../../utils/format';
import { cabDisplayName, rideAmenities, rideHeroImage, seatMeta } from '../../utils/ridePresentation';
import { normalizeBooking } from '../../utils/bookingNormalize';

function InfoCard({ title, icon: Icon, actionLabel, onAction, children }) {
  return (
    <section className="rounded-2xl border border-line bg-white p-4 shadow-[var(--shadow-soft)] md:p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="inline-flex items-center gap-2 font-display text-lg font-bold text-navy">
          {Icon ? <Icon className="h-4 w-4 text-brand" /> : null}
          {title}
        </h2>
        {onAction ? (
          <button
            type="button"
            onClick={onAction}
            className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline"
          >
            <Pencil className="h-3 w-3" />
            {actionLabel || 'Edit'}
          </button>
        ) : null}
      </div>
      {children}
    </section>
  );
}

export default function CheckoutPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const bookingId = location.state?.bookingId || location.state?.booking?.id || location.state?.booking?._id;
  const { user } = useAuth();
  const proofInput = useRef(null);
  const [error, setError] = useState('');

  const bookingQuery = useQuery({
    queryKey: ['bookings', bookingId],
    queryFn: () => bookingService.getById(bookingId),
    enabled: Boolean(bookingId),
  });

  const booking = bookingQuery.data?.booking || bookingQuery.data || location.state?.booking;
  const normalized = normalizeBooking(booking) || booking;
  const ride = normalized?.ride;
  const seats = normalized?.selectedSeats || normalized?.passengers?.map((p) => p.seatNumber) || [];
  const origin = ride?.route?.origin || ride?.origin;
  const destination = ride?.route?.destination || ride?.destination;
  const duration = ride?.route?.estimatedDuration || ride?.estimatedDuration;

  const driver = ride?.driver;
  const proofMutation = useMutation({
    mutationFn: (screenshot) =>
      bookingService.submitProof(bookingId || entityId(booking), {
        screenshot,
        amount: Number(normalized?.totalAmount || 0),
      }),
    onSuccess: (data) => {
      const submitted = data.booking || data;
      navigate(`/booking/${entityId(submitted) || bookingId}`, { replace: true });
    },
    onError: (err) => setError(getErrorMessage(err, 'Could not submit the payment screenshot')),
  });

  function onScreenshot(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 2 * 1024 * 1024) {
      setError('Use a PNG, JPEG, or WebP screenshot under 2 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => proofMutation.mutate(String(reader.result));
    reader.readAsDataURL(file);
  }

  if (!bookingId && !booking) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <Alert tone="warning" title="No booking to checkout">
          Start from a ride and hold seats first.{' '}
          <Link to="/search" className="underline">
            Search rides
          </Link>
        </Alert>
      </div>
    );
  }

  if (bookingQuery.isLoading) {
    return (
      <div className="mx-auto max-w-5xl space-y-4 px-4 py-10">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <BookingStepper current="payment" className="mb-6" />
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-coral">Checkout</p>
        <h1 className="mt-1 font-display text-3xl font-bold text-navy">Pay the driver</h1>
        <p className="mt-1 text-sm text-slate">
          Send the fare to the driver, then upload the payment screenshot. The booking stays pending until the driver approves it.
        </p>
      </div>

      {normalized?.holdExpiresAt ? (
        <HoldTimer expiresAt={normalized.holdExpiresAt} className="mb-4" />
      ) : null}
      {error ? (
        <Alert tone="error" title="Payment issue" className="mb-4">
          {error}
        </Alert>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          <InfoCard title="Your trip">
            <p className="font-display text-xl font-bold text-navy">
              {cityLabel(origin)} → {cityLabel(destination)}
            </p>
            <p className="mt-1 text-sm text-slate">
              {formatDate(ride?.date || ride?.departureTime)} · {formatTime(ride?.departureTime)}
              {duration ? ` · ~${formatDuration(duration)}` : ''}
            </p>
            {ride?.pickupPoint ? (
              <p className="mt-2 text-xs text-slate">
                Pickup: <span className="font-semibold text-navy">{ride.pickupPoint}</span>
                {ride?.dropPoint ? (
                  <>
                    {' '}
                    · Drop: <span className="font-semibold text-navy">{ride.dropPoint}</span>
                  </>
                ) : null}
              </p>
            ) : null}
          </InfoCard>

          <InfoCard title="Your cab" icon={CarFront}>
            <div className="flex gap-3">
              <img
                src={rideHeroImage(ride)}
                alt=""
                className="h-20 w-28 rounded-xl object-cover"
              />
              <div>
                <p className="font-semibold text-navy">{cabDisplayName(ride)}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {rideAmenities(ride).map((a) => (
                    <Badge key={a} tone="brand">
                      {a}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </InfoCard>

          <InfoCard title="Your seat" icon={Armchair}>
            <ul className="space-y-2">
              {seats.map((s) => {
                const meta = seatMeta(s);
                return (
                  <li key={s} className="flex items-center justify-between gap-2 text-sm">
                    <span className="font-semibold text-navy">
                      {s} · {meta.label}
                    </span>
                    <span className="text-slate">{formatCurrency(normalized.amountPerSeat)}</span>
                  </li>
                );
              })}
            </ul>
          </InfoCard>

          <InfoCard title="Passenger" icon={UserRound}>
            <ul className="space-y-2 text-sm">
              {(normalized.passengers || []).map((p, i) => (
                <li key={`${p.seatNumber}-${i}`} className="rounded-xl bg-mist/70 px-3 py-2">
                  <p className="font-semibold text-navy">{p.name}</p>
                  <p className="text-slate">
                    Seat {p.seatNumber} · {p.phone}
                    {(p.age || (i === 0 ? user?.age : '')) ? ` · Age ${p.age || user?.age}` : ''}
                  </p>
                </li>
              ))}
            </ul>
          </InfoCard>
        </div>

        <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <CheckoutSummary booking={normalized} ride={ride} />
          <section className="rounded-2xl border border-line bg-white p-4">
            <h2 className="font-display text-lg font-bold text-navy">Driver payment</h2>
            <p className="mt-1 text-sm text-slate">{driver?.name || 'Driver'}</p>
            <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate">UPI ID</p>
            <p className="mt-1 font-display text-xl font-bold text-navy">
              {driver?.upiId || 'The driver has not added a UPI ID yet.'}
            </p>
            <p className="mt-2 text-sm text-slate">{driver?.paymentInstructions || 'Pay the exact fare, then upload the screenshot.'}</p>
            {driver?.qrCode ? (
              <img
                src={driver.qrCode}
                alt={`${driver?.name || 'Driver'} UPI QR code`}
                className="mt-4 h-52 w-52 rounded-xl border border-line bg-white object-contain p-2"
              />
            ) : (
              <p className="mt-4 text-sm text-slate">This driver has not uploaded a QR code. Pay with the UPI ID above.</p>
            )}
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
              className="mt-4 w-full"
              loading={proofMutation.isPending}
              onClick={() => proofInput.current?.click()}
            >
              Pay and Upload Payment proof
            </Button>
          </section>
          <Link
            to={`/booking/${entityId(normalized)}`}
            className="block text-center text-sm font-semibold text-slate hover:text-brand"
          >
            View booking draft
          </Link>
        </div>
      </div>
    </div>
  );
}
