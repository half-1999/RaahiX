import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarRange } from 'lucide-react';
import { adminService } from '../../services/adminService';
import { getErrorMessage } from '../../services/api';
import PageHeader from '../../components/common/PageHeader';
import StatusBadge from '../../components/common/StatusBadge';
import Alert from '../../components/ui/Alert';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import Select from '../../components/ui/Select';
import Skeleton from '../../components/ui/Skeleton';
import Table from '../../components/ui/Table';
import {
  cityLabel,
  entityId,
  formatCurrency,
  formatDate,
  formatTime,
  todayISODate,
} from '../../utils/format';

const emptyForm = {
  routeId: '',
  driverId: '',
  vehicleId: '',
  date: todayISODate(),
  departureTime: '08:00',
  arrivalTime: '14:00',
  pickupPoint: '',
  dropPoint: '',
  pricePerSeat: 799,
  reason: '',
};

export default function AdminRidesPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [cancelId, setCancelId] = useState(null);
  const [cancelReason, setCancelReason] = useState('');

  const ridesQuery = useQuery({
    queryKey: ['admin', 'rides'],
    queryFn: () => adminService.listRides(),
  });
  const routesQuery = useQuery({
    queryKey: ['admin', 'routes'],
    queryFn: () => adminService.listRoutes(),
  });
  const driversQuery = useQuery({
    queryKey: ['admin', 'drivers'],
    queryFn: () => adminService.listDrivers(),
  });
  const vehiclesQuery = useQuery({
    queryKey: ['admin', 'vehicles'],
    queryFn: () => adminService.listVehicles(),
  });

  const rides = ridesQuery.data?.rides || ridesQuery.data || [];
  const routes = routesQuery.data?.routes || routesQuery.data || [];
  const drivers = driversQuery.data?.drivers || driversQuery.data || [];
  const vehicles = vehiclesQuery.data?.vehicles || vehiclesQuery.data || [];

  const saveMutation = useMutation({
    mutationFn: () => {
      const toIso = (date, time) => {
        if (!time) return time;
        if (String(time).includes('T') || String(time).endsWith('Z')) return time;
        const d = new Date(`${date}T${time}:00`);
        return d.toISOString();
      };
      let departureTime = toIso(form.date, form.departureTime);
      let arrivalTime = toIso(form.date, form.arrivalTime);
      if (departureTime && arrivalTime && new Date(arrivalTime) <= new Date(departureTime)) {
        const next = new Date(arrivalTime);
        next.setDate(next.getDate() + 1);
        arrivalTime = next.toISOString();
      }
      const payload = {
        routeId: form.routeId,
        driverId: form.driverId,
        vehicleId: form.vehicleId,
        date: form.date,
        departureTime,
        arrivalTime,
        pickupPoint: form.pickupPoint,
        dropPoint: form.dropPoint,
        pricePerSeat: Number(form.pricePerSeat),
        ...(editing ? { reason: form.reason } : {}),
      };
      return editing
        ? adminService.updateRide(entityId(editing), payload)
        : adminService.createRide(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'rides'] });
      setOpen(false);
      setEditing(null);
      setForm(emptyForm);
      setError('');
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  const cancelMutation = useMutation({
    mutationFn: ({ id, reason }) => adminService.cancelRide(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'rides'] });
      setCancelId(null);
      setError('');
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setError('');
    setOpen(true);
  };

  const openEdit = (ride) => {
    setEditing(ride);
    setForm({
      routeId: entityId(ride.routeId || ride.route),
      driverId: entityId(ride.driverId || ride.driver),
      vehicleId: entityId(ride.vehicleId || ride.vehicle),
      date: (ride.date || '').toString().slice(0, 10) || todayISODate(),
      departureTime: ride.departureTime || '',
      arrivalTime: ride.arrivalTime || '',
      pickupPoint: ride.pickupPoint || '',
      dropPoint: ride.dropPoint || '',
      pricePerSeat: ride.pricePerSeat || '',
    });
    setError('');
    setOpen(true);
  };

  return (
    <div>
      <PageHeader
        title="Rides"
        subtitle="Schedule journeys and manage seat inventory"
        actions={
          <Button size="sm" onClick={openCreate}>
            Schedule ride
          </Button>
        }
      />
      {error ? <Alert tone="error" className="mb-3">{error}</Alert> : null}
      {ridesQuery.isLoading ? <Skeleton className="h-48 w-full" /> : null}
      {ridesQuery.isError ? (
        <Alert tone="error">{getErrorMessage(ridesQuery.error)}</Alert>
      ) : null}
      <Table
        rows={rides}
        empty={<EmptyState icon={CalendarRange} title="No rides scheduled" />}
        columns={[
          {
            key: 'route',
            header: 'Route',
            render: (r) =>
              `${cityLabel(r.routeId?.origin || r.route?.origin || r.origin)} → ${cityLabel(
                r.routeId?.destination || r.route?.destination || r.destination
              )}`,
          },
          {
            key: 'when',
            header: 'When',
            render: (r) =>
              `${formatDate(r.date || r.departureTime)} ${formatTime(r.departureTime)}`,
          },
          {
            key: 'price',
            header: 'Price',
            render: (r) => formatCurrency(r.pricePerSeat),
          },
          {
            key: 'seats',
            header: 'Seats',
            render: (r) => `${r.availableSeats ?? '—'}/${r.totalSeats ?? '—'}`,
          },
          {
            key: 'status',
            header: 'Status',
            render: (r) => <StatusBadge status={r.status} type="ride" />,
          },
          {
            key: 'actions',
            header: '',
            render: (r) => (
              <div className="flex gap-1">
                <Button size="sm" variant="outline" onClick={() => openEdit(r)}>
                  Edit
                </Button>
                {r.status !== 'CANCELLED' ? (
                  <Button size="sm" variant="danger" onClick={() => setCancelId(entityId(r))}>
                    Cancel
                  </Button>
                ) : null}
              </div>
            ),
          },
        ]}
      />

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? 'Edit ride' : 'Schedule ride'}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button loading={saveMutation.isPending} onClick={() => saveMutation.mutate()}>
              Save
            </Button>
          </>
        }
      >
        {error ? <Alert tone="error" className="mb-3">{error}</Alert> : null}
        <div className="grid gap-3 sm:grid-cols-2">
          <Select
            label="Route"
            value={form.routeId}
            onChange={(e) => setForm({ ...form, routeId: e.target.value })}
            placeholder="Select route"
            options={routes.map((r) => ({
              value: entityId(r),
              label: `${cityLabel(r.origin)} → ${cityLabel(r.destination)}`,
            }))}
          />
          <Select
            label="Driver"
            value={form.driverId}
            onChange={(e) => setForm({ ...form, driverId: e.target.value })}
            placeholder="Select driver"
            options={drivers.map((d) => ({ value: entityId(d), label: d.name }))}
          />
          <Select
            label="Vehicle"
            value={form.vehicleId}
            onChange={(e) => setForm({ ...form, vehicleId: e.target.value })}
            placeholder="Select vehicle"
            options={vehicles.map((v) => ({
              value: entityId(v),
              label: `${v.registrationNumber} · ${v.vehicleType || ''}`,
            }))}
          />
          <Input
            label="Date"
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
          />
          <Input
            label="Departure time"
            type="time"
            value={
              /^\d{1,2}:\d{2}/.test(String(form.departureTime))
                ? String(form.departureTime).slice(0, 5)
                : form.departureTime
                  ? new Date(form.departureTime).toTimeString().slice(0, 5)
                  : ''
            }
            onChange={(e) => setForm({ ...form, departureTime: e.target.value })}
          />
          <Input
            label="Arrival time"
            type="time"
            value={
              /^\d{1,2}:\d{2}/.test(String(form.arrivalTime))
                ? String(form.arrivalTime).slice(0, 5)
                : form.arrivalTime
                  ? new Date(form.arrivalTime).toTimeString().slice(0, 5)
                  : ''
            }
            onChange={(e) => setForm({ ...form, arrivalTime: e.target.value })}
          />
          <Input
            label="Pickup point"
            value={form.pickupPoint}
            onChange={(e) => setForm({ ...form, pickupPoint: e.target.value })}
          />
          <Input
            label="Drop point"
            value={form.dropPoint}
            onChange={(e) => setForm({ ...form, dropPoint: e.target.value })}
          />
          <Input
            label="Price per seat"
            type="number"
            value={form.pricePerSeat}
            onChange={(e) => setForm({ ...form, pricePerSeat: e.target.value })}
          />
          {editing ? (
            <Input
              label="Reason"
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
            />
          ) : null}
        </div>
      </Modal>

      <Modal
        open={Boolean(cancelId)}
        onClose={() => setCancelId(null)}
        title="Cancel ride?"
        footer={
          <>
            <Button variant="ghost" onClick={() => setCancelId(null)}>
              Keep ride
            </Button>
            <Button
              variant="danger"
              loading={cancelMutation.isPending}
              onClick={() => cancelMutation.mutate({ id: cancelId, reason: cancelReason })}
            >
              Confirm cancel
            </Button>
          </>
        }
      >
        <Input
          label="Reason"
          value={cancelReason}
          onChange={(e) => setCancelReason(e.target.value)}
          className="mb-3"
        />
        <p className="text-sm text-ink-muted">
          Soft-cancels the ride. Confirmed bookings stay in history with a full refund obligation.
        </p>
      </Modal>
    </div>
  );
}
