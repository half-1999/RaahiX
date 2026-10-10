import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Armchair, Info } from 'lucide-react';
import { rideService } from '../../services/rideService';
import { bookingService } from '../../services/bookingService';
import { getErrorMessage } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import RideSummary from '../../components/rides/RideSummary';
import RideReviews from '../../components/rides/RideReviews';
import SeatMap from '../../components/seats/SeatMap';
import SeatLegend from '../../components/seats/SeatLegend';
import HoldTimer from '../../components/seats/HoldTimer';
import PassengerForm from '../../components/booking/PassengerForm';
import BookingStepper from '../../components/booking/BookingStepper';
import Alert from '../../components/ui/Alert';
import Button from '../../components/ui/Button';
import Skeleton from '../../components/ui/Skeleton';
import { entityId, formatCurrency } from '../../utils/format';
import { seatMeta } from '../../utils/ridePresentation';
import {
  clearPendingSeats,
  consumeAutoHold,
  loadPendingSeats,
  markAutoHold,
  savePendingSeats,
} from '../../utils/pendingSeats';
import { cn } from '../../utils/cn';
import { getAccessToken } from '../../store/authStore';

function toSeatNumber(seat) {
  if (typeof seat === 'string') return seat;
  return seat?.seatNumber || '';
}

export default function RideDetailPage() {
  const { rideId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const autoHoldTried = useRef(false);

  const [selected, setSelected] = useState(() => loadPendingSeats(rideId));
  const [hold, setHold] = useState(null);
  const [passengers, setPassengers] = useState([]);
  const [formError, setFormError] = useState('');
  const [hovered, setHovered] = useState(null);
  const [focusSeat, setFocusSeat] = useState(null);

  const rideQuery = useQuery({
    queryKey: ['rides', rideId],
    queryFn: () => rideService.getById(rideId),
    enabled: Boolean(rideId),
  });

  const seatsQuery = useQuery({
    queryKey: ['rides', rideId, 'seats'],
    queryFn: () => rideService.getSeats(rideId),
    enabled: Boolean(rideId),
    refetchInterval: hold ? false : 15000,
  });

  const ride = rideQuery.data?.ride || rideQuery.data;
  const seats = seatsQuery.data?.seats || [];
  const holdMinutes = seatsQuery.data?.holdMinutes || 10;
  const price = ride?.pricePerSeat ?? ride?.price ?? 0;
  const canBook = Boolean(isAuthenticated && getAccessToken() && user?.role === 'CUSTOMER');

  useEffect(() => {
    const pending = loadPendingSeats(rideId);
    if (pending.length) {
      setSelected(pending);
      setFocusSeat(pending[pending.length - 1]);
    }
  }, [rideId]);

  useEffect(() => {
    if (selected.length) savePendingSeats(rideId, selected);
  }, [rideId, selected]);

  const applyHoldSuccess = (data, seatList) => {
    const heldSeatNumbers = (data.seats || seatList).map(toSeatNumber).filter(Boolean);
    setHold({ ...data, seats: heldSeatNumbers });
    setSelected(heldSeatNumbers);
    setPassengers(
      heldSeatNumbers.map((seatNumber) => ({
        seatNumber,
        name: '',
        phone: '',
        age: '',
      }))
    );
    setFormError('');
    clearPendingSeats();
    queryClient.invalidateQueries({ queryKey: ['rides', rideId, 'seats'] });
  };

  const holdMutation = useMutation({
    mutationFn: (seatNumbers) =>
      bookingService.hold({ rideId, seatNumbers: seatNumbers || selected }),
    onSuccess: (data, seatNumbers) => applyHoldSuccess(data, seatNumbers || selected),
    onError: (err) => {
      const status = err?.response?.status;
      const message = getErrorMessage(err, 'Could not hold seats');
      if (status === 404) {
        clearPendingSeats();
        setFormError(
          'This ride is no longer available (data was refreshed). Go back to search and pick the ride again.'
        );
        return;
      }
      if (status === 401) {
        setFormError('Please log in again to lock your seats.');
        return;
      }
      setFormError(message);
    },
  });

  useEffect(() => {
    if (authLoading || hold || autoHoldTried.current) return;
    if (!canBook || !selected.length) return;
    if (rideQuery.isLoading || rideQuery.isError || seatsQuery.isLoading || seatsQuery.isError) return;
    if (!consumeAutoHold(rideId)) return;
    autoHoldTried.current = true;
    holdMutation.mutate(selected);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    authLoading,
    canBook,
    selected.length,
    hold,
    rideId,
    rideQuery.isLoading,
    rideQuery.isError,
    seatsQuery.isLoading,
    seatsQuery.isError,
  ]);

  const toggleSeat = (seatNumber) => {
    if (hold) return;
    setSelected((prev) => {
      const next = prev.includes(seatNumber)
        ? prev.filter((s) => s !== seatNumber)
        : [...prev, seatNumber];
      setFocusSeat(seatNumber);
      return next;
    });
  };

  const goLogin = () => {
    savePendingSeats(rideId, selected);
    markAutoHold(rideId);
    navigate('/login', { state: { from: `/rides/${rideId}`, selectedSeats: selected } });
  };

  const createMutation = useMutation({
    mutationFn: (payload) => bookingService.create(payload),
    onSuccess: (data) => {
      const booking = data.booking || data;
      navigate('/checkout', { state: { bookingId: entityId(booking), booking } });
    },
    onError: (err) => setFormError(getErrorMessage(err, 'Could not create booking')),
  });

  const seatNumbers = useMemo(
    () => (hold?.seats || selected).map(toSeatNumber).filter(Boolean),
    [hold, selected]
  );

  const activeSeat = focusSeat || hovered?.seatNumber || seatNumbers[0];
  const activeMeta = activeSeat ? seatMeta(activeSeat) : null;
  const fareTotal = price * (seatNumbers.length || selected.length || 0);

  if (rideQuery.isLoading || seatsQuery.isLoading) {
    return (
      <div className="mx-auto max-w-6xl space-y-4 px-4 py-8">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (rideQuery.isError) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-8">
        <Alert tone="error" title="Ride not found">
          {getErrorMessage(rideQuery.error)}
        </Alert>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 pb-28 lg:pb-8">
      <BookingStepper current={hold ? 'details' : 'seat'} className="mb-6" />
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-coral">Seat selection</p>
        <h1 className="mt-1 font-display text-3xl font-bold text-navy">Choose your seat</h1>
        <p className="mt-1 text-sm text-slate">Hold lasts about {holdMinutes} minutes once confirmed.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.15fr_0.85fr]">
        <div className="space-y-4">
          <RideSummary ride={ride} />
        </div>

        <div className="space-y-4">
          {seatsQuery.isError ? (
            <Alert tone="error">{getErrorMessage(seatsQuery.error)}</Alert>
          ) : null}
          <div className="rounded-2xl border border-line bg-white p-4 shadow-[var(--shadow-soft)] md:p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-lg font-bold text-navy">Cabin layout</h2>
              <SeatLegend />
            </div>
            <SeatMap
              seats={seats}
              selected={selected}
              onToggle={toggleSeat}
              onHover={setHovered}
              disabled={Boolean(hold)}
              vehicleType={ride?.vehicle?.vehicleType || ride?.vehicleType}
            />
          </div>
          <RideReviews vehicleId={entityId(ride?.vehicle)} />

          {activeSeat && activeMeta ? (
            <div className="rounded-2xl border border-brand/20 bg-indigo-soft/60 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-brand">Seat {activeSeat}</p>
                  <p className="mt-1 font-display text-xl font-bold text-navy">{activeMeta.label}</p>
                  <p className="mt-1 text-sm text-slate">{activeMeta.blurb}</p>
                </div>
                <p className="font-display text-xl font-bold text-brand">{formatCurrency(price)}</p>
              </div>
              {selected.includes(activeSeat) && !hold ? (
                <Button variant="ghost" size="sm" className="mt-2" onClick={() => toggleSeat(activeSeat)}>
                  Change seat
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="space-y-4">
          {hold ? (
            <>
              <HoldTimer
                expiresAt={hold.holdExpiresAt}
                onExpire={() => {
                  setHold(null);
                  autoHoldTried.current = false;
                  setFormError('Seat hold expired. Please select seats again.');
                }}
              />
              {formError ? <Alert tone="error">{formError}</Alert> : null}
              <PassengerForm
                seats={seatNumbers}
                passengers={passengers}
                onChange={setPassengers}
                loading={createMutation.isPending}
                onSubmit={(list) => {
                  createMutation.mutate({
                    rideId,
                    holdId: hold.holdId,
                    passengers: list.map((p) => ({
                      name: p.name,
                      phone: p.phone,
                      age: Number(p.age),
                      seatNumber: p.seatNumber,
                    })),
                  });
                }}
              />
              <Button
                variant="ghost"
                onClick={() => {
                  setHold(null);
                  autoHoldTried.current = false;
                  queryClient.invalidateQueries({ queryKey: ['rides', rideId, 'seats'] });
                }}
              >
                Change seats
              </Button>
            </>
          ) : (
            <div className={cn('rounded-2xl border border-line bg-white p-5 shadow-[var(--shadow-soft)]', 'lg:sticky lg:top-24')}>
              <h2 className="font-display text-lg font-bold text-navy">Booking summary</h2>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-slate">Selected seats</dt>
                  <dd className="font-semibold text-navy">
                    {selected.length ? selected.join(', ') : 'None yet'}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-slate">Passengers</dt>
                  <dd className="font-semibold text-navy">{selected.length || 0}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-slate">Base fare</dt>
                  <dd className="font-semibold text-navy">{formatCurrency(fareTotal)}</dd>
                </div>
                <div className="flex justify-between gap-3 border-t border-line pt-3">
                  <dt className="font-semibold text-navy">Total</dt>
                  <dd className="font-display text-2xl font-bold text-brand">{formatCurrency(fareTotal)}</dd>
                </div>
              </dl>
              <p className="mt-3 inline-flex items-start gap-1.5 text-xs text-slate">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                Final amount is confirmed by the server at checkout.
              </p>
              {formError ? <Alert tone="error" className="mt-3">{formError}</Alert> : null}
              {isAuthenticated && user?.role && user.role !== 'CUSTOMER' ? (
                <Alert tone="warning" className="mt-3">
                  Seat booking is for customer accounts. Log in as a passenger to continue.
                </Alert>
              ) : null}
              <div className="mt-4 space-y-2">
                {!canBook ? (
                  <Button className="w-full" onClick={goLogin} disabled={!selected.length && !isAuthenticated}>
                    {selected.length ? 'Log in to lock seats' : 'Log in to hold seats'}
                  </Button>
                ) : (
                  <Button
                    className="w-full"
                    disabled={!selected.length}
                    loading={holdMutation.isPending}
                    onClick={() => holdMutation.mutate(selected)}
                  >
                    Continue
                  </Button>
                )}
                <Link to="/search" className="block text-center text-sm font-semibold text-slate hover:text-brand">
                  Back to search
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {!hold ? (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 p-3 backdrop-blur lg:hidden">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
            <div>
              <p className="text-xs text-slate">
                {selected.length ? (
                  <span className="inline-flex items-center gap-1 font-semibold text-navy">
                    <Armchair className="h-3.5 w-3.5" />
                    {selected.join(', ')}
                  </span>
                ) : (
                  'Select a seat'
                )}
              </p>
              <p className="font-display text-lg font-bold text-brand">{formatCurrency(fareTotal)}</p>
            </div>
            {!canBook ? (
              <Button size="sm" onClick={goLogin}>
                Log in
              </Button>
            ) : (
              <Button
                size="sm"
                disabled={!selected.length}
                loading={holdMutation.isPending}
                onClick={() => holdMutation.mutate(selected)}
              >
                Continue
              </Button>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
