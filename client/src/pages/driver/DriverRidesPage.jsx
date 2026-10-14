import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bus } from 'lucide-react';
import { driverService } from '../../services/driverService';
import { getErrorMessage } from '../../services/api';
import StatusBadge from '../../components/common/StatusBadge';
import PageHeader from '../../components/common/PageHeader';
import Alert from '../../components/ui/Alert';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import Select from '../../components/ui/Select';
import Skeleton from '../../components/ui/Skeleton';
import { cityLabel, entityId, formatDate, formatTime } from '../../utils/format';
import { useState } from 'react';

function defaultWhen(hoursAhead) {
  const date = new Date(Date.now() + hoursAhead * 60 * 60 * 1000);
  date.setMinutes(0, 0, 0);
  const pad = (value) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function DriverRidesPage() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState('');
  const [formError, setFormError] = useState('');
  const [form, setForm] = useState({
    routeId: '',
    vehicleId: '',
    departureTime: defaultWhen(24),
    arrivalTime: defaultWhen(30),
    pickupPoint: '',
    dropPoint: '',
    secondPickup: '',
    secondDrop: '',
    pricePerSeat: '500',
    frontSeatPrice: '',
  });

  const routesQuery = useQuery({
    queryKey: ['driver', 'routes', 'available'],
    queryFn: () => driverService.listAvailableRoutes(),
  });
  const vehiclesQuery = useQuery({
    queryKey: ['driver', 'vehicles'],
    queryFn: () => driverService.listVehicles(),
  });
  const createRide = useMutation({
    mutationFn: () =>
      driverService.createRide({
        routeId: form.routeId,
        vehicleId: form.vehicleId,
        departureTime: new Date(form.departureTime).toISOString(),
        arrivalTime: new Date(form.arrivalTime).toISOString(),
        pickupPoint: form.pickupPoint,
        dropPoint: form.dropPoint,
        pickupPoints: [form.pickupPoint, form.secondPickup].map((point) => point.trim()).filter(Boolean).slice(0, 2),
        dropPoints: [form.dropPoint, form.secondDrop].map((point) => point.trim()).filter(Boolean).slice(0, 2),
        pricePerSeat: Number(form.pricePerSeat),
        ...(form.frontSeatPrice === '' ? {} : { frontSeatPrice: Number(form.frontSeatPrice) }),
      }),
    onSuccess: () => {
      setFormError('');
      queryClient.invalidateQueries({ queryKey: ['driver', 'rides'] });
    },
    onError: (err) => setFormError(getErrorMessage(err)),
  });

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['driver', 'rides', { status }],
    queryFn: () => driverService.listRides(status ? { status } : {}),
  });

  const rides = data?.rides || [];

  return (
    <div>
      <PageHeader
        title="My rides"
        subtitle="Publish a draft, then open it to edit or start the trip"
        actions={
          <Select
            className="min-w-[9rem]"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            options={[
              { value: '', label: 'All statuses' },
              { value: 'DRAFT', label: 'Draft' },
              { value: 'PUBLISHED', label: 'Published' },
              { value: 'ACTIVE', label: 'Active' },
              { value: 'SCHEDULED', label: 'Scheduled' },
              { value: 'BOARDING', label: 'Boarding' },
              { value: 'STARTED', label: 'Started' },
              { value: 'COMPLETED', label: 'Completed' },
              { value: 'CANCELLED', label: 'Cancelled' },
            ]}
          />
        }
      />

      <form
        className="mb-5 grid gap-3 rounded-2xl border border-line bg-white p-4 sm:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (new Date(form.arrivalTime) <= new Date(form.departureTime)) {
            setFormError('Arrival must be after departure');
            return;
          }
          createRide.mutate();
        }}
      >
        <h2 className="font-display text-lg font-bold text-navy sm:col-span-2">Add a ride</h2>
        {formError ? <Alert tone="error" className="sm:col-span-2">{formError}</Alert> : null}
        <Select
          label="Route"
          value={form.routeId}
          onChange={(event) => setForm((current) => ({ ...current, routeId: event.target.value }))}
          options={(routesQuery.data?.routes || []).map((route) => ({
            value: route._id,
            label: `${route.origin?.city || 'From'} → ${route.destination?.city || 'To'}`,
          }))}
          placeholder="Choose a route"
          required
        />
        <Select
          label="Car"
          value={form.vehicleId}
          onChange={(event) => setForm((current) => ({ ...current, vehicleId: event.target.value }))}
          options={(vehiclesQuery.data?.vehicles || [])
            .filter((vehicle) => vehicle.status !== 'INACTIVE')
            .map((vehicle) => ({
              value: vehicle._id,
              label: `${vehicle.registrationNumber} · ${vehicle.make} ${vehicle.model}`,
            }))}
          placeholder="Choose your car"
          required
        />
        <label className="block text-sm font-medium text-navy">
          Departure
          <input
            required
            type="datetime-local"
            className="mt-1 h-11 w-full rounded-xl border border-line px-3"
            value={form.departureTime}
            onChange={(event) => setForm((current) => ({ ...current, departureTime: event.target.value }))}
          />
        </label>
        <label className="block text-sm font-medium text-navy">
          Arrival
          <input
            required
            type="datetime-local"
            className="mt-1 h-11 w-full rounded-xl border border-line px-3"
            value={form.arrivalTime}
            onChange={(event) => setForm((current) => ({ ...current, arrivalTime: event.target.value }))}
          />
        </label>
        <label className="block text-sm font-medium text-navy">
          Pickup point
          <input
            required
            className="mt-1 h-11 w-full rounded-xl border border-line px-3"
            value={form.pickupPoint}
            onChange={(event) => setForm((current) => ({ ...current, pickupPoint: event.target.value }))}
          />
        </label>
        <label className="block text-sm font-medium text-navy">
          Drop point
          <input
            required
            className="mt-1 h-11 w-full rounded-xl border border-line px-3"
            value={form.dropPoint}
            onChange={(event) => setForm((current) => ({ ...current, dropPoint: event.target.value }))}
          />
        </label>
        <label className="block text-sm font-medium text-navy">
          Second pickup
          <input
            className="mt-1 h-11 w-full rounded-xl border border-line px-3"
            value={form.secondPickup}
            placeholder="Optional"
            onChange={(event) => setForm((current) => ({ ...current, secondPickup: event.target.value }))}
          />
        </label>
        <label className="block text-sm font-medium text-navy">
          Second drop-off
          <input
            className="mt-1 h-11 w-full rounded-xl border border-line px-3"
            value={form.secondDrop}
            placeholder="Optional"
            onChange={(event) => setForm((current) => ({ ...current, secondDrop: event.target.value }))}
          />
        </label>
        <label className="block text-sm font-medium text-navy">
          Price per seat
          <input
            required
            type="number"
            min="1"
            className="mt-1 h-11 w-full rounded-xl border border-line px-3"
            value={form.pricePerSeat}
            onChange={(event) => setForm((current) => ({ ...current, pricePerSeat: event.target.value }))}
          />
        </label>
        <label className="block text-sm font-medium text-navy">
          Front-seat price
          <input
            type="number"
            min="0"
            className="mt-1 h-11 w-full rounded-xl border border-line px-3"
            value={form.frontSeatPrice}
            placeholder="Same as other seats if empty"
            onChange={(event) => setForm((current) => ({ ...current, frontSeatPrice: event.target.value }))}
          />
        </label>
        <div className="flex items-end">
          <Button type="submit" loading={createRide.isPending}>Save draft</Button>
        </div>
      </form>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : null}

      {isError ? <Alert tone="error">{getErrorMessage(error)}</Alert> : null}

      {!isLoading && !isError && !rides.length ? (
        <EmptyState icon={Bus} title="No rides found" description="Try another status filter." />
      ) : null}

      <ul className="space-y-3">
        {rides.map((ride) => (
          <li key={entityId(ride)}>
            <Link
              to={`/driver/rides/${entityId(ride)}`}
              className="block rounded-xl border border-line bg-white p-4 active:bg-surface"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-display text-lg text-ink">
                    {cityLabel(ride.routeId?.origin)} → {cityLabel(ride.routeId?.destination)}
                  </p>
                  <p className="mt-1 text-sm text-ink-muted">
                    {formatDate(ride.date || ride.departureTime)} · {formatTime(ride.departureTime)}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-muted">
                    {ride.vehicleId?.registrationNumber || '—'} · Pickup {ride.pickupPoint}
                  </p>
                </div>
                <StatusBadge status={ride.status} type="ride" />
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
