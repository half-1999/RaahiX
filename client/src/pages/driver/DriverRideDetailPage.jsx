import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Users } from 'lucide-react';
import { driverService } from '../../services/driverService';
import { getErrorMessage } from '../../services/api';
import RideSummary from '../../components/rides/RideSummary';
import PageHeader from '../../components/common/PageHeader';
import StatusBadge from '../../components/common/StatusBadge';
import Alert from '../../components/ui/Alert';
import Button from '../../components/ui/Button';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import EmptyState from '../../components/ui/EmptyState';
import Skeleton from '../../components/ui/Skeleton';
import Table from '../../components/ui/Table';
import Badge from '../../components/ui/Badge';
import { cityLabel, formatCurrency, formatDateTime } from '../../utils/format';
import { isRideEditable, isRideReadOnly } from '../../utils/rideStatus';

function toLocalInput(value) {
  if (!value) return '';
  const date = new Date(value);
  const pad = (part) => String(part).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function DriverRideDetailPage() {
  const { rideId } = useParams();
  const queryClient = useQueryClient();

  const rideQuery = useQuery({
    queryKey: ['driver', 'rides', rideId],
    queryFn: () => driverService.getRide(rideId),
    refetchInterval: 30_000,
  });

  const passengersQuery = useQuery({
    queryKey: ['driver', 'rides', rideId, 'passengers'],
    queryFn: () => driverService.getPassengers(rideId),
  });

  const ride = rideQuery.data?.ride || rideQuery.data;
  const passengers = passengersQuery.data?.passengers || [];
  const seats = passengersQuery.data?.seats || [];

  const [editError, setEditError] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [edit, setEdit] = useState(null);
  const [confirmVoid, setConfirmVoid] = useState(false);
  const form = edit || {
    departureTime: toLocalInput(ride?.departureTime),
    arrivalTime: toLocalInput(ride?.arrivalTime || ride?.estimatedCompletionAt),
    pickupPoint: ride?.pickupPoint || '',
    dropPoint: ride?.dropPoint || '',
    pricePerSeat: ride?.pricePerSeat ? String(ride.pricePerSeat) : '',
  };
  const readOnly = ride ? isRideReadOnly(ride.status) || Boolean(ride.voidedAt) : false;
  const canEdit = ride ? isRideEditable(ride.status) && !ride.voidedAt : false;

  const statusMutation = useMutation({
    mutationFn: (status) => driverService.updateStatus(rideId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver', 'rides', rideId] });
      queryClient.invalidateQueries({ queryKey: ['driver', 'rides'] });
      queryClient.invalidateQueries({ queryKey: ['driver', 'dashboard'] });
    },
  });

  const voidMutation = useMutation({
    mutationFn: () => driverService.voidRide(rideId, 'Driver voided the ride'),
    onSuccess: () => {
      setConfirmVoid(false);
      queryClient.invalidateQueries({ queryKey: ['driver', 'rides', rideId] });
      queryClient.invalidateQueries({ queryKey: ['driver', 'rides'] });
      queryClient.invalidateQueries({ queryKey: ['driver', 'dashboard'] });
    },
  });

  const saveEdit = useMutation({
    mutationFn: () =>
      driverService.updateRide(rideId, {
        departureTime: new Date(form.departureTime).toISOString(),
        arrivalTime: new Date(form.arrivalTime).toISOString(),
        pickupPoint: form.pickupPoint,
        dropPoint: form.dropPoint,
        pricePerSeat: Number(form.pricePerSeat),
      }),
    onSuccess: () => {
      setEditError('');
      setEdit(null);
      setEditOpen(false);
      queryClient.invalidateQueries({ queryKey: ['driver', 'rides', rideId] });
      queryClient.invalidateQueries({ queryKey: ['driver', 'rides'] });
    },
    onError: (err) => setEditError(getErrorMessage(err)),
  });

  if (rideQuery.isLoading) return <Skeleton className="h-48 w-full" />;
  if (rideQuery.isError || !ride) {
    return <Alert tone="error">{getErrorMessage(rideQuery.error, 'Ride not found')}</Alert>;
  }

  return (
    <div className={`space-y-5 ${readOnly ? 'opacity-80' : ''}`}>
      <PageHeader
        title="Ride details"
        subtitle={`${cityLabel(ride.routeId?.origin) || ride.sourceName} → ${cityLabel(ride.routeId?.destination) || ride.destinationName}`}
        actions={
          <div className="flex flex-wrap justify-end gap-2">
            {canEdit ? (
              <Button
                size="sm"
                variant="outline"
                className="!px-2"
                aria-label="Edit ride"
                title="Edit ride"
                onClick={() => {
                  setEdit({
                    departureTime: toLocalInput(ride.departureTime),
                    arrivalTime: toLocalInput(ride.arrivalTime || ride.estimatedCompletionAt),
                    pickupPoint: ride.pickupPoint || '',
                    dropPoint: ride.dropPoint || '',
                    pricePerSeat: ride.pricePerSeat ? String(ride.pricePerSeat) : '',
                  });
                  setEditOpen(true);
                }}
              >
                <Pencil className="h-4 w-4" aria-hidden="true" />
              </Button>
            ) : null}
            <Link to={`/driver/rides/${rideId}/passengers`}>
              <Button size="sm" variant="outline">
                <Users className="h-4 w-4" aria-hidden="true" />
                Passengers
              </Button>
            </Link>
            <Link to="/driver/rides">
              <Button size="sm" variant="outline">
                All rides
              </Button>
            </Link>
          </div>
        }
      />

      <section className="rounded-2xl border-2 border-ink/10 bg-white p-4 shadow-[var(--shadow-soft)]">
        <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate">Ride ID</p>
            <p className="font-mono text-sm text-ink">{ride._id}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <StatusBadge status={ride.status} type="ride" />
            {ride.voidedAt ? <Badge tone="cancelled">Voided</Badge> : null}
          </div>
        </div>
        <RideSummary ride={ride} />
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="text-xs font-bold uppercase tracking-wide text-slate">Fare / seat</dt>
            <dd className="font-semibold text-ink">{formatCurrency(ride.pricePerSeat)}</dd>
          </div>
          <div>
            <dt className="text-xs font-bold uppercase tracking-wide text-slate">Departure</dt>
            <dd className="font-semibold text-ink">{formatDateTime(ride.departureTime)}</dd>
          </div>
          <div>
            <dt className="text-xs font-bold uppercase tracking-wide text-slate">Est. completion</dt>
            <dd className="font-semibold text-ink">
              {formatDateTime(ride.estimatedCompletionAt || ride.arrivalTime)}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-bold uppercase tracking-wide text-slate">Actual completed</dt>
            <dd className="font-semibold text-ink">
              {ride.actualCompletedAt ? formatDateTime(ride.actualCompletedAt) : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-bold uppercase tracking-wide text-slate">Duration</dt>
            <dd className="font-semibold text-ink">
              {ride.estimatedDurationMinutes
                ? `${ride.estimatedDurationMinutes} min`
                : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-bold uppercase tracking-wide text-slate">Started</dt>
            <dd className="font-semibold text-ink">
              {ride.actualStartedAt ? formatDateTime(ride.actualStartedAt) : '—'}
            </dd>
          </div>
        </dl>
      </section>

      {editError ? <Alert tone="error">{editError}</Alert> : null}
      {editOpen && canEdit ? (
        <form
          className="grid gap-3 rounded-2xl border-2 border-ink/10 bg-white p-4 sm:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (new Date(form.arrivalTime) <= new Date(form.departureTime)) {
              setEditError('Estimated arrival must be after departure');
              return;
            }
            saveEdit.mutate();
          }}
        >
          <label className="block text-sm font-medium text-ink">
            Departure
            <input
              required
              type="datetime-local"
              className="mt-1 h-11 w-full rounded-xl border border-line px-3"
              value={form.departureTime}
              onChange={(event) => setEdit({ ...form, departureTime: event.target.value })}
            />
          </label>
          <label className="block text-sm font-medium text-ink">
            Estimated arrival
            <input
              required
              type="datetime-local"
              className="mt-1 h-11 w-full rounded-xl border border-line px-3"
              value={form.arrivalTime}
              onChange={(event) => setEdit({ ...form, arrivalTime: event.target.value })}
            />
          </label>
          <label className="block text-sm font-medium text-ink">
            Pickup point
            <input
              required
              className="mt-1 h-11 w-full rounded-xl border border-line px-3"
              value={form.pickupPoint}
              onChange={(event) => setEdit({ ...form, pickupPoint: event.target.value })}
            />
          </label>
          <label className="block text-sm font-medium text-ink">
            Drop point
            <input
              required
              className="mt-1 h-11 w-full rounded-xl border border-line px-3"
              value={form.dropPoint}
              onChange={(event) => setEdit({ ...form, dropPoint: event.target.value })}
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
              onChange={(event) => setEdit({ ...form, pricePerSeat: event.target.value })}
            />
          </label>
          <div className="flex flex-wrap items-end gap-2 sm:col-span-2">
            <Button type="submit" loading={saveEdit.isPending}>
              Save changes
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setEditOpen(false);
                setEdit(null);
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      ) : null}

      {statusMutation.isError ? (
        <Alert tone="error">{getErrorMessage(statusMutation.error)}</Alert>
      ) : null}
      {voidMutation.isError ? (
        <Alert tone="error">{getErrorMessage(voidMutation.error)}</Alert>
      ) : null}

      {!readOnly ? (
        <div className="flex flex-col gap-2 sm:flex-row">
          {ride.status === 'ACTIVE' ? (
            <Button
              className="w-full sm:flex-1"
              loading={statusMutation.isPending}
              onClick={() => statusMutation.mutate('COMPLETED')}
            >
              Mark completed
            </Button>
          ) : ride.status === 'SCHEDULED' ? (
            <Alert tone="info" className="flex-1">
              This ride is scheduled. It becomes active automatically at departure (
              {formatDateTime(ride.departureTime)}), then completes after the estimated journey
              duration — or mark completed once it is active.
            </Alert>
          ) : null}
          {ride.status !== 'COMPLETED' && !ride.voidedAt ? (
            <Button className="w-full sm:w-auto" variant="danger" onClick={() => setConfirmVoid(true)}>
              Void ride
            </Button>
          ) : null}
        </div>
      ) : (
        <Alert tone="info">
          This ride is {ride.voidedAt ? 'voided' : 'completed'} and can no longer be modified.
        </Alert>
      )}

      <section className="rounded-2xl border-2 border-ink/10 bg-white p-4 shadow-[var(--shadow-soft)]">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="font-display text-lg font-bold text-ink">Passengers</h2>
          <Link to={`/driver/rides/${rideId}/passengers`} className="text-xs font-semibold text-brand-ink hover:underline">
            Manage
          </Link>
        </div>
        {!passengers.length ? (
          <EmptyState icon={Users} title="No passengers yet" description="Add guests or wait for bookings." />
        ) : (
          <Table
            columns={[
              { key: 'name', header: 'Name' },
              { key: 'phone', header: 'Phone', render: (p) => p.phone || '—' },
              {
                key: 'seats',
                header: 'Seats',
                render: (p) =>
                  p.seatNumber || (p.seatNumbers || []).join(', ') || p.seatCount || '—',
              },
              { key: 'source', header: 'Source', render: (p) => p.source || 'BOOKING' },
              { key: 'payment', header: 'Payment', render: (p) => p.paymentStatus || '—' },
            ]}
            rows={passengers.slice(0, 8)}
            keyField="_id"
          />
        )}
        {seats.length ? (
          <p className="mt-3 text-xs text-ink-muted">
            Seats: {seats.filter((s) => s.status === 'AVAILABLE').length} available of {seats.length}
          </p>
        ) : null}
      </section>

      <ConfirmDialog
        open={confirmVoid}
        onClose={() => setConfirmVoid(false)}
        title="Void this ride?"
        description="Voiding is for exceptional cases. Status stays scheduled/active historically with a void flag — not a fourth ride status."
        confirmLabel="Void ride"
        loading={voidMutation.isPending}
        onConfirm={() => voidMutation.mutate()}
      />
    </div>
  );
}
