import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { driverService } from '../../services/driverService';
import { getErrorMessage } from '../../services/api';
import RideSummary from '../../components/rides/RideSummary';
import PageHeader from '../../components/common/PageHeader';
import Alert from '../../components/ui/Alert';
import Button from '../../components/ui/Button';
import Skeleton from '../../components/ui/Skeleton';

function toLocalInput(value) {
  if (!value) return '';
  const date = new Date(value);
  const pad = (part) => String(part).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

const EDITABLE = new Set(['DRAFT', 'PUBLISHED', 'SCHEDULED']);

const NEXT = {
  DRAFT: 'PUBLISHED',
  PUBLISHED: 'ACTIVE',
  ACTIVE: 'COMPLETED',
  SCHEDULED: 'ACTIVE',
  BOARDING: 'ACTIVE',
  STARTED: 'COMPLETED',
};

export default function DriverRideDetailPage() {
  const { rideId } = useParams();
  const queryClient = useQueryClient();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['driver', 'rides', rideId],
    queryFn: () => driverService.getRide(rideId),
  });

  const ride = data?.ride || data;
  const [editError, setEditError] = useState('');
  const [edit, setEdit] = useState(null);
  const form = edit || {
    departureTime: toLocalInput(ride?.departureTime),
    arrivalTime: toLocalInput(ride?.arrivalTime),
    pickupPoint: ride?.pickupPoint || '',
    dropPoint: ride?.dropPoint || '',
    pricePerSeat: ride?.pricePerSeat ? String(ride.pricePerSeat) : '',
  };

  const statusMutation = useMutation({
    mutationFn: (status) => driverService.updateStatus(rideId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver', 'rides', rideId] });
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
      queryClient.invalidateQueries({ queryKey: ['driver', 'rides', rideId] });
      queryClient.invalidateQueries({ queryKey: ['driver', 'rides'] });
    },
    onError: (err) => setEditError(getErrorMessage(err)),
  });

  if (isLoading) return <Skeleton className="h-48 w-full" />;
  if (isError || !ride) {
    return <Alert tone="error">{getErrorMessage(error, 'Ride not found')}</Alert>;
  }

  const next = NEXT[ride.status];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Trip detail"
        actions={
          <Link to={`/driver/rides/${rideId}/passengers`}>
            <Button size="sm">Passengers</Button>
          </Link>
        }
      />
      <RideSummary ride={ride} />
      {EDITABLE.has(ride.status) ? (
        <form
          className="grid gap-3 rounded-2xl border border-line bg-white p-4 sm:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            saveEdit.mutate();
          }}
        >
          <h2 className="font-display text-lg font-bold text-navy sm:col-span-2">Edit ride</h2>
          {editError ? <Alert tone="error" className="sm:col-span-2">{editError}</Alert> : null}
          <label className="block text-sm font-medium text-navy">
            Departure
            <input required type="datetime-local" className="mt-1 h-11 w-full rounded-xl border border-line px-3" value={form.departureTime} onChange={(event) => setEdit({ ...form, departureTime: event.target.value })} />
          </label>
          <label className="block text-sm font-medium text-navy">
            Arrival
            <input required type="datetime-local" className="mt-1 h-11 w-full rounded-xl border border-line px-3" value={form.arrivalTime} onChange={(event) => setEdit({ ...form, arrivalTime: event.target.value })} />
          </label>
          <label className="block text-sm font-medium text-navy">
            Pickup point
            <input required className="mt-1 h-11 w-full rounded-xl border border-line px-3" value={form.pickupPoint} onChange={(event) => setEdit({ ...form, pickupPoint: event.target.value })} />
          </label>
          <label className="block text-sm font-medium text-navy">
            Drop point
            <input required className="mt-1 h-11 w-full rounded-xl border border-line px-3" value={form.dropPoint} onChange={(event) => setEdit({ ...form, dropPoint: event.target.value })} />
          </label>
          <label className="block text-sm font-medium text-navy">
            Price per seat
            <input required type="number" min="1" className="mt-1 h-11 w-full rounded-xl border border-line px-3" value={form.pricePerSeat} onChange={(event) => setEdit({ ...form, pricePerSeat: event.target.value })} />
          </label>
          <div className="flex items-end">
            <Button type="submit" loading={saveEdit.isPending}>Save changes</Button>
          </div>
        </form>
      ) : null}
      {statusMutation.isError ? (
        <Alert tone="error">{getErrorMessage(statusMutation.error)}</Alert>
      ) : null}
      {next ? (
        <Button
          className="w-full"
          loading={statusMutation.isPending}
          onClick={() => statusMutation.mutate(next)}
        >
          Mark as {next}
        </Button>
      ) : (
        <Alert tone="info">No further status actions for this trip.</Alert>
      )}
    </div>
  );
}
