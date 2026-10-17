import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Users } from 'lucide-react';
import { driverService } from '../../services/driverService';
import { getErrorMessage } from '../../services/api';
import PageHeader from '../../components/common/PageHeader';
import SearchFiltersBar from '../../components/common/SearchFiltersBar';
import Alert from '../../components/ui/Alert';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import Select from '../../components/ui/Select';
import Skeleton from '../../components/ui/Skeleton';
import StatusBadge from '../../components/common/StatusBadge';
import { cityLabel, entityId, formatCurrency, formatDateTime } from '../../utils/format';

export default function DriverPassengersHubPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [rideId, setRideId] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [formError, setFormError] = useState('');
  const [form, setForm] = useState({
    rideId: '',
    name: '',
    phone: '',
    email: '',
    seatCount: '1',
    fareAmount: '',
    amountCollected: '0',
    pickupName: '',
    dropName: '',
    notes: '',
  });

  const ridesQuery = useQuery({
    queryKey: ['driver', 'rides', { forPassengers: true }],
    queryFn: () => driverService.listRides({}),
  });

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['driver', 'passengers', { search, paymentStatus, rideId }],
    queryFn: () =>
      driverService.listPassengers({
        ...(search ? { q: search } : {}),
        ...(paymentStatus ? { paymentStatus } : {}),
        ...(rideId ? { rideId } : {}),
      }),
  });

  const passengers = data?.passengers || [];
  const rideOptions = useMemo(() => {
    const rides = (ridesQuery.data?.rides || []).filter((r) => r.status !== 'COMPLETED');
    return [
      { value: '', label: 'Select ride' },
      ...rides.map((r) => ({
        value: entityId(r),
        label: `${cityLabel(r.routeId?.origin) || r.sourceName} → ${cityLabel(r.routeId?.destination) || r.destinationName} · ${formatDateTime(r.departureTime)}`,
      })),
    ];
  }, [ridesQuery.data]);

  const addPassenger = useMutation({
    mutationFn: () =>
      driverService.addPassenger(form.rideId, {
        name: form.name.trim(),
        phone: form.phone.trim() || undefined,
        email: form.email.trim() || undefined,
        seatCount: Number(form.seatCount) || 1,
        fareAmount: form.fareAmount === '' ? undefined : Number(form.fareAmount),
        amountCollected: Number(form.amountCollected) || 0,
        pickupName: form.pickupName.trim() || undefined,
        dropName: form.dropName.trim() || undefined,
        notes: form.notes.trim() || undefined,
      }),
    onSuccess: () => {
      setModalOpen(false);
      setFormError('');
      queryClient.invalidateQueries({ queryKey: ['driver', 'passengers'] });
      queryClient.invalidateQueries({ queryKey: ['driver', 'dashboard'] });
    },
    onError: (err) => setFormError(getErrorMessage(err)),
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title="Passengers"
        subtitle="Manual guests and ride assignments — no account required"
        inline
        actions={
          <Button
            size="sm"
            onClick={() => {
              setFormError('');
              setModalOpen(true);
            }}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add passenger
          </Button>
        }
      />

      <SearchFiltersBar
        activeCount={[search, paymentStatus, rideId].filter(Boolean).length}
        onReset={() => {
          setSearch('');
          setPaymentStatus('');
          setRideId('');
        }}
      >
        <label className="relative min-w-0 w-full md:max-w-xs md:flex-1">
          <span className="sr-only">Search passengers</span>
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate" aria-hidden="true" />
          <input
            className="h-11 w-full rounded-xl border border-line bg-white py-2 pr-3 pl-9 text-sm"
            placeholder="Search name, phone, email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <Select
          label="Payment"
          className="min-w-[9rem] w-full md:w-auto"
          value={paymentStatus}
          onChange={(e) => setPaymentStatus(e.target.value)}
          options={[
            { value: '', label: 'All payments' },
            { value: 'PENDING', label: 'Pending' },
            { value: 'PARTIAL', label: 'Partial' },
            { value: 'PAID', label: 'Paid' },
          ]}
        />
        <Select
          label="Ride"
          className="min-w-[12rem] w-full md:max-w-sm md:flex-1"
          value={rideId}
          onChange={(e) => setRideId(e.target.value)}
          options={[{ value: '', label: 'All rides' }, ...rideOptions.filter((o) => o.value)]}
        />
      </SearchFiltersBar>

      {isLoading ? <Skeleton className="h-40 w-full" /> : null}
      {isError ? <Alert tone="error">{getErrorMessage(error)}</Alert> : null}
      {!isLoading && !passengers.length ? (
        <EmptyState
          icon={Users}
          title="No manual passengers yet"
          description="Add walk-in passengers to a scheduled or active ride. App bookings also appear on each ride’s passenger list."
          action={
            <Button onClick={() => setModalOpen(true)}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add passenger
            </Button>
          }
        />
      ) : null}

      <ul className="space-y-3">
        {passengers.map((p) => {
          const ride = p.rideId;
          return (
            <li
              key={entityId(p)}
              className="rounded-2xl border-2 border-ink/10 bg-white p-4 shadow-[var(--shadow-soft)]"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="font-display text-lg font-bold text-ink">{p.name}</p>
                  <p className="text-sm text-ink-muted">
                    {[p.phone, p.email].filter(Boolean).join(' · ') || 'No contact'}
                  </p>
                  <p className="mt-1 text-xs text-ink-muted">
                    {ride
                      ? `${cityLabel(ride.routeId?.origin) || ride.sourceName || ride.pickupPoint} → ${cityLabel(ride.routeId?.destination) || ride.destinationName || ride.dropPoint}`
                      : 'Ride'}
                    {ride?.departureTime ? ` · ${formatDateTime(ride.departureTime)}` : ''}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={p.paymentStatus} type="payment" />
                  <span className="text-sm font-semibold text-ink">
                    {formatCurrency(p.amountCollected || 0)} / {formatCurrency(p.fareAmount || 0)}
                  </span>
                  {ride?._id ? (
                    <Link to={`/driver/rides/${ride._id}/passengers`}>
                      <Button size="sm" variant="outline">
                        Ride list
                      </Button>
                    </Link>
                  ) : null}
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <Modal
        open={modalOpen}
        onClose={() => !addPassenger.isPending && setModalOpen(false)}
        title="Add passenger"
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setModalOpen(false)} disabled={addPassenger.isPending}>
              Cancel
            </Button>
            <Button
              loading={addPassenger.isPending}
              onClick={() => {
                if (!form.rideId || !form.name.trim()) {
                  setFormError('Ride and passenger name are required');
                  return;
                }
                addPassenger.mutate();
              }}
            >
              Save passenger
            </Button>
          </>
        }
      >
        {formError ? <Alert tone="error" className="mb-3">{formError}</Alert> : null}
        <div className="grid gap-3 sm:grid-cols-2">
          <Select
            label="Ride"
            required
            className="sm:col-span-2"
            value={form.rideId}
            onChange={(e) => setForm((f) => ({ ...f, rideId: e.target.value }))}
            options={rideOptions}
          />
          <Input
            label="Full name"
            required
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="sm:col-span-2"
          />
          <Input
            label="Mobile"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
          />
          <Input
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          />
          <Input
            label="Seats"
            type="number"
            min={1}
            max={6}
            value={form.seatCount}
            onChange={(e) => setForm((f) => ({ ...f, seatCount: e.target.value }))}
          />
          <Input
            label="Fare amount"
            type="number"
            min={0}
            value={form.fareAmount}
            onChange={(e) => setForm((f) => ({ ...f, fareAmount: e.target.value }))}
            hint="Defaults to price × seats"
          />
          <Input
            label="Collected"
            type="number"
            min={0}
            value={form.amountCollected}
            onChange={(e) => setForm((f) => ({ ...f, amountCollected: e.target.value }))}
          />
          <Input
            label="Pickup"
            value={form.pickupName}
            onChange={(e) => setForm((f) => ({ ...f, pickupName: e.target.value }))}
          />
          <Input
            label="Drop-off"
            value={form.dropName}
            onChange={(e) => setForm((f) => ({ ...f, dropName: e.target.value }))}
          />
          <Input
            label="Notes"
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            className="sm:col-span-2"
          />
        </div>
      </Modal>
    </div>
  );
}
