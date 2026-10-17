import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bus, Plus, Search } from 'lucide-react';
import { driverService } from '../../services/driverService';
import { getErrorMessage } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import PageHeader from '../../components/common/PageHeader';
import SearchFiltersBar from '../../components/common/SearchFiltersBar';
import DriverRideListItem from '../../components/rides/DriverRideListItem';
import Alert from '../../components/ui/Alert';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import Modal from '../../components/ui/Modal';
import Select from '../../components/ui/Select';
import Skeleton from '../../components/ui/Skeleton';
import { cityLabel, entityId } from '../../utils/format';
import { RIDE_STATUS_OPTIONS, sortRidesActiveFirst } from '../../utils/rideStatus';

function defaultWhen(hoursAhead) {
  const date = new Date(Date.now() + hoursAhead * 60 * 60 * 1000);
  date.setMinutes(0, 0, 0);
  const pad = (value) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function emptyForm() {
  return {
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
  };
}

export default function DriverRidesPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const canPostRides = Boolean(user?.driverProfile?.canPostRides);
  const [searchParams, setSearchParams] = useSearchParams();
  const [status, setStatus] = useState('');
  const [date, setDate] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sort, setSort] = useState('active-first');
  const [minFare, setMinFare] = useState('');
  const [maxFare, setMaxFare] = useState('');
  const [formError, setFormError] = useState('');
  const [success, setSuccess] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 250);
    return () => clearTimeout(t);
  }, [search]);

  const routesQuery = useQuery({
    queryKey: ['driver', 'routes', 'available'],
    queryFn: () => driverService.listAvailableRoutes(),
  });
  const vehiclesQuery = useQuery({
    queryKey: ['driver', 'vehicles'],
    queryFn: () => driverService.listVehicles(),
  });

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['driver', 'rides', { status, date }],
    queryFn: () =>
      driverService.listRides({
        ...(status ? { status } : {}),
        ...(date ? { date } : {}),
      }),
  });

  const rides = data?.rides || [];

  const filtered = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    let list = rides.filter((ride) => {
      if (minFare !== '' && Number(ride.pricePerSeat) < Number(minFare)) return false;
      if (maxFare !== '' && Number(ride.pricePerSeat) > Number(maxFare)) return false;
      if (!q) return true;
      const hay = [
        cityLabel(ride.routeId?.origin),
        cityLabel(ride.routeId?.destination),
        entityId(ride),
        ride.vehicleId?.registrationNumber,
        ride.pickupPoint,
        ride.dropPoint,
        ride.status,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
    if (sort === 'active-first') return sortRidesActiveFirst(list);
    list = [...list].sort((a, b) => {
      if (sort === 'departure-desc') return new Date(b.departureTime) - new Date(a.departureTime);
      if (sort === 'fare-asc') return (a.pricePerSeat || 0) - (b.pricePerSeat || 0);
      if (sort === 'fare-desc') return (b.pricePerSeat || 0) - (a.pricePerSeat || 0);
      if (sort === 'seats-desc') return (b.availableSeats || 0) - (a.availableSeats || 0);
      if (sort === 'created-desc') return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      return new Date(a.departureTime) - new Date(b.departureTime);
    });
    return list;
  }, [rides, debouncedSearch, sort, minFare, maxFare]);

  useEffect(() => {
    if (searchParams.get('new') === '1') {
      openCreate();
      searchParams.delete('new');
      setSearchParams(searchParams, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openCreate() {
    setForm(emptyForm());
    setFormError('');
    setModalOpen(true);
  }

  const saveRide = useMutation({
    mutationFn: () =>
      driverService.createRide({
        routeId: form.routeId,
        vehicleId: form.vehicleId,
        departureTime: new Date(form.departureTime).toISOString(),
        arrivalTime: new Date(form.arrivalTime).toISOString(),
        pickupPoint: form.pickupPoint,
        dropPoint: form.dropPoint,
        pickupPoints: [form.pickupPoint, form.secondPickup]
          .map((point) => point.trim())
          .filter(Boolean)
          .slice(0, 2),
        dropPoints: [form.dropPoint, form.secondDrop]
          .map((point) => point.trim())
          .filter(Boolean)
          .slice(0, 2),
        pricePerSeat: Number(form.pricePerSeat),
        ...(form.frontSeatPrice === '' ? {} : { frontSeatPrice: Number(form.frontSeatPrice) }),
      }),
    onSuccess: () => {
      setFormError('');
      setSuccess('Ride scheduled');
      setModalOpen(false);
      setForm(emptyForm());
      queryClient.invalidateQueries({ queryKey: ['driver', 'rides'] });
      queryClient.invalidateQueries({ queryKey: ['driver', 'dashboard'] });
    },
    onError: (err) => setFormError(getErrorMessage(err)),
  });

  const voidRide = useMutation({
    mutationFn: (rideId) => driverService.voidRide(rideId, 'Driver voided the ride'),
    onSuccess: () => {
      setSuccess('Ride voided — bookings cancelled where applicable');
      queryClient.invalidateQueries({ queryKey: ['driver', 'rides'] });
      queryClient.invalidateQueries({ queryKey: ['driver', 'dashboard'] });
    },
    onError: (err) => setFormError(getErrorMessage(err)),
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title="My Rides"
        subtitle="Scheduled, active, and completed rides — statuses update automatically"
        inline
        actions={
          <Button size="sm" onClick={openCreate} disabled={!canPostRides}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add ride
          </Button>
        }
      />

      {!canPostRides ? (
        <Alert tone="warning">
          You cannot post rides until your profile is complete and verified.{' '}
          <Link to="/driver/profile?complete=1" className="font-semibold underline-offset-2 hover:underline">
            Complete profile
          </Link>
        </Alert>
      ) : null}

      {success ? <Alert tone="success">{success}</Alert> : null}
      {formError && !modalOpen ? <Alert tone="error">{formError}</Alert> : null}

      <SearchFiltersBar
        activeCount={
          [search, status, date, minFare, maxFare].filter(Boolean).length +
          (sort !== 'active-first' ? 1 : 0)
        }
        onReset={() => {
          setSearch('');
          setStatus('');
          setDate('');
          setMinFare('');
          setMaxFare('');
          setSort('active-first');
        }}
      >
        <label className="relative min-w-0 w-full md:max-w-xs md:flex-1">
          <span className="sr-only">Search rides</span>
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate" aria-hidden="true" />
          <input
            className="h-11 w-full rounded-xl border border-line bg-white py-2 pr-3 pl-9 text-sm"
            placeholder="Search city, plate, pickup…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <Select
          label="Status"
          className="min-w-[9rem] w-full md:w-auto"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          options={RIDE_STATUS_OPTIONS}
        />
        <Select
          label="Sort"
          className="min-w-[10rem] w-full md:w-auto"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          options={[
            { value: 'active-first', label: 'Active first' },
            { value: 'departure-asc', label: 'Departure ↑' },
            { value: 'departure-desc', label: 'Departure ↓' },
            { value: 'fare-asc', label: 'Fare ↑' },
            { value: 'fare-desc', label: 'Fare ↓' },
            { value: 'seats-desc', label: 'Seats available' },
            { value: 'created-desc', label: 'Newest' },
          ]}
        />
        <label className="block w-full text-xs font-medium text-ink-muted md:w-auto">
          Date
          <input
            type="date"
            className="mt-1 h-11 w-full rounded-xl border border-line bg-white px-3 text-sm md:w-auto"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
        <label className="block w-full text-xs font-medium text-ink-muted md:w-auto">
          Min fare
          <input
            type="number"
            min="0"
            className="mt-1 h-11 w-full rounded-xl border border-line bg-white px-3 text-sm md:w-24"
            value={minFare}
            onChange={(e) => setMinFare(e.target.value)}
          />
        </label>
        <label className="block w-full text-xs font-medium text-ink-muted md:w-auto">
          Max fare
          <input
            type="number"
            min="0"
            className="mt-1 h-11 w-full rounded-xl border border-line bg-white px-3 text-sm md:w-24"
            value={maxFare}
            onChange={(e) => setMaxFare(e.target.value)}
          />
        </label>
      </SearchFiltersBar>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : null}

      {isError ? <Alert tone="error">{getErrorMessage(error)}</Alert> : null}

      {!isLoading && !isError && !filtered.length ? (
        <EmptyState
          icon={Bus}
          title="No rides found"
          description="Try another filter, or add a new ride."
          action={
            canPostRides ? (
              <Button size="sm" onClick={openCreate}>
                Add ride
              </Button>
            ) : null
          }
        />
      ) : null}

      <ul className="space-y-3">
        {filtered.map((ride) => (
          <DriverRideListItem
            key={entityId(ride)}
            ride={ride}
            detailBase="/driver/rides"
            onCancel={(rideId) => voidRide.mutate(rideId)}
          />
        ))}
      </ul>

      <Modal
        open={modalOpen}
        onClose={() => !saveRide.isPending && setModalOpen(false)}
        title="Schedule ride"
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setModalOpen(false)} disabled={saveRide.isPending}>
              Cancel
            </Button>
            <Button
              loading={saveRide.isPending}
              disabled={!canPostRides}
              onClick={() => {
                if (!canPostRides) {
                  setFormError('Complete and verify your driver profile before posting a ride');
                  return;
                }
                if (new Date(form.arrivalTime) <= new Date(form.departureTime)) {
                  setFormError('Estimated arrival must be after departure');
                  return;
                }
                if (!form.routeId || !form.vehicleId) {
                  setFormError('Choose a route and vehicle');
                  return;
                }
                saveRide.mutate();
              }}
            >
              Schedule ride
            </Button>
          </>
        }
      >
        {formError ? <Alert tone="error" className="mb-3">{formError}</Alert> : null}
        <div className="grid gap-3 sm:grid-cols-2">
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
            label="Vehicle"
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
          <label className="block text-sm font-medium text-ink">
            Departure
            <input
              required
              type="datetime-local"
              className="mt-1 h-11 w-full rounded-xl border border-line px-3"
              value={form.departureTime}
              onChange={(event) => setForm((current) => ({ ...current, departureTime: event.target.value }))}
            />
          </label>
          <label className="block text-sm font-medium text-ink">
            Estimated arrival
            <input
              required
              type="datetime-local"
              className="mt-1 h-11 w-full rounded-xl border border-line px-3"
              value={form.arrivalTime}
              onChange={(event) => setForm((current) => ({ ...current, arrivalTime: event.target.value }))}
            />
            <span className="mt-1 block text-xs text-ink-muted">
              Used for automatic completion when the journey duration elapses
            </span>
          </label>
          <label className="block text-sm font-medium text-ink">
            Pickup point
            <input
              required
              className="mt-1 h-11 w-full rounded-xl border border-line px-3"
              value={form.pickupPoint}
              onChange={(event) => setForm((current) => ({ ...current, pickupPoint: event.target.value }))}
            />
          </label>
          <label className="block text-sm font-medium text-ink">
            Drop point
            <input
              required
              className="mt-1 h-11 w-full rounded-xl border border-line px-3"
              value={form.dropPoint}
              onChange={(event) => setForm((current) => ({ ...current, dropPoint: event.target.value }))}
            />
          </label>
          <label className="block text-sm font-medium text-ink">
            Second pickup
            <input
              className="mt-1 h-11 w-full rounded-xl border border-line px-3"
              value={form.secondPickup}
              placeholder="Optional"
              onChange={(event) => setForm((current) => ({ ...current, secondPickup: event.target.value }))}
            />
          </label>
          <label className="block text-sm font-medium text-ink">
            Second drop-off
            <input
              className="mt-1 h-11 w-full rounded-xl border border-line px-3"
              value={form.secondDrop}
              placeholder="Optional"
              onChange={(event) => setForm((current) => ({ ...current, secondDrop: event.target.value }))}
            />
          </label>
          <label className="block text-sm font-medium text-ink">
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
          <label className="block text-sm font-medium text-ink">
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
        </div>
      </Modal>
    </div>
  );
}
