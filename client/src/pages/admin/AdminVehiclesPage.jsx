import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Car } from 'lucide-react';
import { adminService } from '../../services/adminService';
import { getErrorMessage } from '../../services/api';
import PageHeader from '../../components/common/PageHeader';
import Alert from '../../components/ui/Alert';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import Select from '../../components/ui/Select';
import Skeleton from '../../components/ui/Skeleton';
import Table from '../../components/ui/Table';
import { entityId } from '../../utils/format';

/** Generate A1/A2, B1/B2… seat layout for shared cabs */
export function generateSeatConfiguration(rows = 2, seatsPerRow = 2) {
  const positions =
    seatsPerRow === 2
      ? ['WINDOW', 'AISLE']
      : seatsPerRow === 3
        ? ['WINDOW', 'MIDDLE', 'AISLE']
        : Array.from({ length: seatsPerRow }, (_, i) => `POS${i + 1}`);

  const seats = [];
  for (let r = 1; r <= rows; r += 1) {
    const letter = String.fromCharCode(64 + r);
    for (let s = 1; s <= seatsPerRow; s += 1) {
      seats.push({
        seatNumber: `${letter}${s}`,
        row: r,
        position: positions[s - 1] || `POS${s}`,
      });
    }
  }
  return seats;
}

const emptyForm = {
  driverId: '',
  registrationNumber: '',
  make: 'Maruti',
  model: 'Ertiga',
  vehicleType: 'SUV',
  rows: 2,
  seatsPerRow: 2,
  features: 'AC, USB',
  status: 'ACTIVE',
};

export default function AdminVehiclesPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');

  const vehiclesQuery = useQuery({
    queryKey: ['admin', 'vehicles'],
    queryFn: () => adminService.listVehicles(),
  });
  const driversQuery = useQuery({
    queryKey: ['admin', 'drivers', 'options'],
    queryFn: () => adminService.listDrivers(),
  });

  const vehicles = vehiclesQuery.data?.vehicles || [];
  const drivers = driversQuery.data?.drivers || [];

  const seatConfiguration = useMemo(
    () => generateSeatConfiguration(Number(form.rows) || 1, Number(form.seatsPerRow) || 2),
    [form.rows, form.seatsPerRow]
  );

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        driverId: form.driverId,
        registrationNumber: form.registrationNumber,
        make: form.make,
        model: form.model,
        vehicleType: form.vehicleType,
        capacity: seatConfiguration.length,
        seatConfiguration,
        features: form.features
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        status: form.status,
      };
      if (editing) return adminService.updateVehicle(entityId(editing), payload);
      return adminService.createVehicle(payload);
    },
    onSuccess: () => {
      setOpen(false);
      setEditing(null);
      setForm(emptyForm);
      setError('');
      queryClient.invalidateQueries({ queryKey: ['admin', 'vehicles'] });
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setError('');
    setOpen(true);
  }

  function openEdit(vehicle) {
    const seats = vehicle.seatConfiguration || [];
    const rows = seats.length ? Math.max(...seats.map((s) => s.row)) : 2;
    const seatsPerRow = seats.length ? Math.round(seats.length / rows) : 2;
    setEditing(vehicle);
    setForm({
      driverId: entityId(vehicle.driverId) || vehicle.driverId?._id || '',
      registrationNumber: vehicle.registrationNumber || '',
      make: vehicle.make || '',
      model: vehicle.model || '',
      vehicleType: vehicle.vehicleType || 'SUV',
      rows,
      seatsPerRow,
      features: (vehicle.features || []).join(', '),
      status: vehicle.status || 'ACTIVE',
    });
    setError('');
    setOpen(true);
  }

  return (
    <div>
      <PageHeader
        title="Vehicles"
        subtitle="Fleet with seat map configuration"
        actions={
          <Button size="sm" onClick={openCreate}>
            Add vehicle
          </Button>
        }
      />

      {vehiclesQuery.isLoading ? <Skeleton className="h-48 w-full" /> : null}
      {vehiclesQuery.isError ? (
        <Alert tone="error">{getErrorMessage(vehiclesQuery.error)}</Alert>
      ) : null}

      {!vehiclesQuery.isLoading && !vehicles.length ? (
        <EmptyState
          icon={Car}
          title="No vehicles"
          action={<Button onClick={openCreate}>Add vehicle</Button>}
        />
      ) : (
        <Table
          keyField="_id"
          columns={[
            { key: 'registrationNumber', header: 'Reg. no' },
            {
              key: 'vehicle',
              header: 'Vehicle',
              render: (row) => `${row.make} ${row.model} · ${row.vehicleType}`,
            },
            {
              key: 'driver',
              header: 'Driver',
              render: (row) => row.driverId?.name || '—',
            },
            {
              key: 'capacity',
              header: 'Seats',
              render: (row) =>
                `${row.capacity} (${(row.seatConfiguration || []).map((s) => s.seatNumber).join(', ')})`,
            },
            {
              key: 'status',
              header: 'Status',
              render: (row) => (
                <Badge tone={row.status === 'ACTIVE' ? 'success' : 'neutral'}>{row.status}</Badge>
              ),
            },
            {
              key: 'actions',
              header: '',
              render: (row) => (
                <Button size="sm" variant="outline" onClick={() => openEdit(row)}>
                  Edit
                </Button>
              ),
            },
          ]}
          rows={vehicles}
        />
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? 'Edit vehicle' : 'Add vehicle'}
        size="xl"
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
            label="Driver"
            value={form.driverId}
            onChange={(e) => setForm((f) => ({ ...f, driverId: e.target.value }))}
            placeholder="Select driver"
            options={drivers.map((d) => ({
              value: entityId(d),
              label: `${d.name} (${d.phone})`,
            }))}
          />
          <Input
            label="Registration number"
            value={form.registrationNumber}
            onChange={(e) => setForm((f) => ({ ...f, registrationNumber: e.target.value }))}
          />
          <Input
            label="Make"
            value={form.make}
            onChange={(e) => setForm((f) => ({ ...f, make: e.target.value }))}
          />
          <Input
            label="Model"
            value={form.model}
            onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))}
          />
          <Input
            label="Vehicle type"
            value={form.vehicleType}
            onChange={(e) => setForm((f) => ({ ...f, vehicleType: e.target.value }))}
          />
          <Input
            label="Features (comma-separated)"
            value={form.features}
            onChange={(e) => setForm((f) => ({ ...f, features: e.target.value }))}
          />
          <Input
            label="Rows"
            type="number"
            min={1}
            max={8}
            value={form.rows}
            onChange={(e) => setForm((f) => ({ ...f, rows: e.target.value }))}
          />
          <Input
            label="Seats per row"
            type="number"
            min={1}
            max={4}
            value={form.seatsPerRow}
            onChange={(e) => setForm((f) => ({ ...f, seatsPerRow: e.target.value }))}
          />
          <Select
            label="Status"
            value={form.status}
            onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
            options={[
              { value: 'ACTIVE', label: 'Active' },
              { value: 'INACTIVE', label: 'Inactive' },
              { value: 'MAINTENANCE', label: 'Maintenance' },
            ]}
          />
        </div>

        <div className="mt-4 rounded-lg border border-line bg-surface p-3">
          <p className="text-sm font-medium text-ink">
            Seat config preview · capacity {seatConfiguration.length}
          </p>
          <p className="mt-1 text-xs text-ink-muted">
            Generated labels: {seatConfiguration.map((s) => s.seatNumber).join(', ')}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {seatConfiguration.map((s) => (
              <Badge key={s.seatNumber} tone="brand">
                {s.seatNumber} · R{s.row} · {s.position}
              </Badge>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );
}
