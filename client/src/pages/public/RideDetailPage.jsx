import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { rideService } from '../../services/rideService';
import { bookingService } from '../../services/bookingService';
import { getErrorMessage } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import RideSummary from '../../components/rides/RideSummary';
import SeatMap from '../../components/seats/SeatMap';
import SeatLegend from '../../components/seats/SeatLegend';
import HoldTimer from '../../components/seats/HoldTimer';
import PassengerForm from '../../components/booking/PassengerForm';
import Alert from '../../components/ui/Alert';
import Button from '../../components/ui/Button';
import Skeleton from '../../components/ui/Skeleton';
import PageHeader from '../../components/common/PageHeader';
import { entityId } from '../../utils/format';

export default function RideDetailPage() {
  const { rideId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  const [selected, setSelected] = useState([]);
  const [hold, setHold] = useState(null);
  const [passengers, setPassengers] = useState([]);
  const [formError, setFormError] = useState('');

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

  const toggleSeat = (seatNumber) => {
    if (hold) return;
    setSelected((prev) =>
      prev.includes(seatNumber) ? prev.filter((s) => s !== seatNumber) : [...prev, seatNumber]
    );
  };

  const holdMutation = useMutation({
    mutationFn: () => bookingService.hold({ rideId, seatNumbers: selected }),
    onSuccess: (data) => {
      setHold(data);
      setPassengers(
        (data.seats || selected).map((seatNumber) => ({
          seatNumber,
          name: '',
          phone: '',
          age: '',
        }))
      );
      setFormError('');
      queryClient.invalidateQueries({ queryKey: ['rides', rideId, 'seats'] });
    },
    onError: (err) => setFormError(getErrorMessage(err, 'Could not hold seats')),
  });

  const createMutation = useMutation({
    mutationFn: (payload) => bookingService.create(payload),
    onSuccess: (data) => {
      const booking = data.booking || data;
      navigate('/checkout', { state: { bookingId: entityId(booking), booking } });
    },
    onError: (err) => setFormError(getErrorMessage(err, 'Could not create booking')),
  });

  const seatNumbers = useMemo(
    () => hold?.seats || selected,
    [hold, selected]
  );

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
    <div className="mx-auto max-w-6xl px-4 py-8">
      <PageHeader title="Choose seats" subtitle={`Hold lasts about ${holdMinutes} minutes`} />

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4">
          <RideSummary ride={ride} />
          {seatsQuery.isError ? (
            <Alert tone="error">{getErrorMessage(seatsQuery.error)}</Alert>
          ) : null}
          <div className="rounded-xl border border-line bg-white p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-lg">Seat map</h2>
              <SeatLegend />
            </div>
            <SeatMap
              seats={seats}
              selected={selected}
              onToggle={toggleSeat}
              disabled={Boolean(hold)}
            />
            {!hold ? (
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <p className="text-sm text-ink-muted">
                  {selected.length
                    ? `${selected.length} seat(s) selected: ${selected.join(', ')}`
                    : 'Select one or more available seats'}
                </p>
                {!isAuthenticated ? (
                  <Button
                    onClick={() =>
                      navigate('/login', { state: { from: `/rides/${rideId}` } })
                    }
                  >
                    Log in to hold seats
                  </Button>
                ) : (
                  <Button
                    disabled={!selected.length}
                    loading={holdMutation.isPending}
                    onClick={() => holdMutation.mutate()}
                  >
                    Hold &amp; continue
                  </Button>
                )}
              </div>
            ) : null}
          </div>
        </div>

        <div className="space-y-4">
          {hold ? (
            <>
              <HoldTimer
                expiresAt={hold.holdExpiresAt}
                onExpire={() => {
                  setHold(null);
                  setSelected([]);
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
                  queryClient.invalidateQueries({ queryKey: ['rides', rideId, 'seats'] });
                }}
              >
                Change seats
              </Button>
            </>
          ) : (
            <div className="rounded-xl border border-dashed border-line bg-white/70 p-5 text-sm text-ink-muted">
              Select seats and hold them to enter passenger details. Need help?{' '}
              <Link to="/search" className="text-brand underline">
                Back to search
              </Link>
            </div>
          )}
          {formError && !hold ? <Alert tone="error">{formError}</Alert> : null}
        </div>
      </div>
    </div>
  );
}
