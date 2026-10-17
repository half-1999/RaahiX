import { useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  Armchair,
  CarFront,
  Clock3,
  ImageUp,
  Pencil,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
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
import { cn } from '../../utils/cn';
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
          {Icon ? <Icon className="h-4 w-4 text-brand-dark" /> : null}
          {title}
        </h2>
        {onAction ? (
          <button
            type="button"
            onClick={onAction}
            className="inline-flex items-center gap-1 text-xs font-semibold text-brand-dark hover:underline"
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

function ChoiceCard({ selected, icon: Icon, title, description, onSelect }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        'w-full rounded-2xl border p-4 text-left transition',
        selected
          ? 'border-brand bg-brand/10 shadow-[var(--shadow-soft)]'
          : 'border-line bg-white hover:border-brand/50'
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            'mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
            selected ? 'bg-brand text-ink' : 'bg-mist text-navy'
          )}
        >
          <Icon className="h-5 w-5" />
        </span>
        <span className="min-w-0">
          <span className="block font-display text-base font-bold text-navy">{title}</span>
          <span className="mt-1 block text-sm text-slate">{description}</span>
        </span>
      </div>
    </button>
  );
}

export default function CheckoutPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const bookingId = location.state?.bookingId || location.state?.booking?.id || location.state?.booking?._id;
  const { user } = useAuth();
  const proofInput = useRef(null);
  const [error, setError] = useState('');
  const [checkoutMode, setCheckoutMode] = useState('pay'); // 'hold' | 'pay'

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
  const id = bookingId || entityId(normalized);
  const proofSubmitted = ['SUBMITTED', 'APPROVED'].includes(normalized?.proofStatus);
  const canChoose =
    normalized?.bookingStatus === 'PENDING' &&
    !proofSubmitted &&
    normalized?.proofStatus !== 'REJECTED';

  const proofMutation = useMutation({
    mutationFn: (screenshot) =>
      bookingService.submitProof(id, {
        screenshot,
        amount: Number(normalized?.totalAmount || 0),
      }),
    onSuccess: (data) => {
      const submitted = data.booking || data;
      navigate('/booking-success', {
        replace: true,
        state: { bookingId: entityId(submitted) || id, booking: submitted, mode: 'paid' },
      });
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
    setError('');
    const reader = new FileReader();
    reader.onload = () => proofMutation.mutate(String(reader.result));
    reader.readAsDataURL(file);
  }

  function bookWithoutPayment() {
    setError('');
    navigate('/booking-success', {
      replace: true,
      state: { bookingId: id, booking: normalized, mode: 'hold' },
    });
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
        <h1 className="mt-1 font-display text-3xl font-bold text-navy">Choose how to finish</h1>
        <p className="mt-1 text-sm text-slate">
          Hold your seats without paying now, or pay the driver by UPI and upload a screenshot for approval.
        </p>
      </div>

      {normalized?.holdExpiresAt ? (
        <HoldTimer expiresAt={normalized.holdExpiresAt} className="mb-4" />
      ) : null}
      {error ? (
        <Alert tone="error" title="Checkout issue" className="mb-4">
          {error}
        </Alert>
      ) : null}
      {proofSubmitted ? (
        <Alert tone="success" title="Payment proof already submitted" className="mb-4">
          Your booking stays pending until the driver verifies the screenshot.{' '}
          <Link to={`/booking/${id}`} className="underline">
            View booking
          </Link>
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

          <InfoCard title="Your car" icon={CarFront}>
            <div className="flex gap-3">
              <img src={rideHeroImage(ride)} alt="" className="h-20 w-28 rounded-xl object-cover" />
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
                    <span className="text-slate">
                      {formatCurrency(
                        (normalized.seatFares || []).find((fare) => fare.seatNumber === s)?.amount ??
                          normalized.amountPerSeat
                      )}
                    </span>
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

          {canChoose ? (
            <section className="space-y-3 rounded-2xl border border-line bg-white p-4 shadow-[var(--shadow-soft)]">
              <h2 className="font-display text-lg font-bold text-navy">How would you like to continue?</h2>
              <p className="text-sm text-slate">
                Seats stay reserved while your hold is active. A screenshot alone does not confirm the booking —
                the driver must approve payment.
              </p>

              <ChoiceCard
                selected={checkoutMode === 'hold'}
                icon={Clock3}
                title="Book seat without payment"
                description="Keep this booking under your account and pay later before the hold expires. Seats are not finally confirmed until payment is approved."
                onSelect={() => setCheckoutMode('hold')}
              />
              <ChoiceCard
                selected={checkoutMode === 'pay'}
                icon={ImageUp}
                title="Pay and upload screenshot"
                description="Pay the driver by UPI now, then upload your payment screenshot for verification."
                onSelect={() => setCheckoutMode('pay')}
              />

              {checkoutMode === 'hold' ? (
                <div className="space-y-3 rounded-xl bg-mist/80 p-3">
                  <p className="text-sm text-slate">
                    Your seats stay held until the timer ends. You can return anytime from My bookings to pay and
                    upload proof.
                  </p>
                  <Button type="button" className="w-full" variant="secondary" onClick={bookWithoutPayment}>
                    Book seat without payment
                  </Button>
                </div>
              ) : (
                <div className="space-y-3 rounded-xl border border-line p-3">
                  <p className="text-sm font-semibold text-navy">{driver?.name || 'Driver'}</p>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate">UPI ID</p>
                    <p className="mt-1 font-display text-xl font-bold text-navy">
                      {driver?.upiId || 'The driver has not added a UPI ID yet.'}
                    </p>
                  </div>
                  <p className="text-sm text-slate">
                    {driver?.paymentInstructions || 'Pay the exact fare, then upload the screenshot.'}
                  </p>
                  {driver?.qrCode ? (
                    <img
                      src={driver.qrCode}
                      alt={`${driver?.name || 'Driver'} UPI QR code`}
                      className="h-52 w-52 rounded-xl border border-line bg-white object-contain p-2"
                    />
                  ) : (
                    <p className="text-sm text-slate">
                      This driver has not uploaded a QR code. Pay with the UPI ID above.
                    </p>
                  )}
                  <p className="inline-flex items-center gap-1.5 text-xs text-slate">
                    <ShieldCheck className="h-3.5 w-3.5 text-brand-dark" />
                    Amount: {formatCurrency(normalized?.totalAmount)}
                  </p>
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
                    Pay and upload screenshot
                  </Button>
                </div>
              )}
            </section>
          ) : (
            <section className="rounded-2xl border border-line bg-white p-4">
              <h2 className="font-display text-lg font-bold text-navy">Booking status</h2>
              <p className="mt-2 text-sm text-slate">
                This booking is {normalized?.bookingStatus || 'unavailable'}
                {normalized?.proofStatus ? ` · proof ${normalized.proofStatus}` : ''}.
              </p>
              <Link to={`/booking/${id}`}>
                <Button className="mt-4 w-full" variant="outline">
                  Open booking
                </Button>
              </Link>
            </section>
          )}

          <Link
            to={`/booking/${id}`}
            className="block text-center text-sm font-semibold text-slate hover:text-brand-dark"
          >
            View booking details
          </Link>
        </div>
      </div>
    </div>
  );
}
