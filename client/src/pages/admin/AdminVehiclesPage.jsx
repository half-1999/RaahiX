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
import {
  VEHICLE_TYPE_OPTIONS,
  VEHICLE_TYPES,
  capacityForType,
  normalizeVehicleType,
  seatConfigurationForType,
  vehicleTypeLabel,
} from '../../utils/vehicleLayouts';

const emptyForm = {
  driverId: '',
  registrationNumber: '',
  make: 'Maruti',
  model: 'Dzire',
  vehicleType: VEHICLE_TYPES.FIVE_SEATER,
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
    () => seatConfigurationForType(form.vehicleType),
    [form.vehicleType]
  );

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        driverId: form.driverId,
        registrationNumber: form.registrationNumber,
        make: form.make,
        model: form.model,
        vehicleType: form.vehicleType,
        capacity: capacityForType(form.vehicleType),
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
    setEditing(vehicle);
    setForm({
      driverId: entityId(vehicle.driverId) || vehicle.driverId?._id || '',
      registrationNumber: vehicle.registrationNumber || '',
      make: vehicle.make || '',
      model: vehicle.model || '',
      vehicleType: normalizeVehicleType(vehicle.vehicleType),
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
        subtitle="Fleet with 5-seater and 7-seater cabin layouts"
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
              render: (row) =>
                `${row.make} ${row.model} · ${vehicleTypeLabel(row.vehicleType)}`,
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
          <Select
            label="Vehicle type"
            value={form.vehicleType}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                vehicleType: e.target.value,
                model:
                  e.target.value === VEHICLE_TYPES.SIX_SEATER && f.model === 'Dzire'
                    ? 'Ertiga'
                    : e.target.value === VEHICLE_TYPES.FIVE_SEATER && f.model === 'Ertiga'
                      ? 'Dzire'
                      : f.model,
              }))
            }
            options={VEHICLE_TYPE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
          />
          <Input
            label="Features (comma-separated)"
            value={form.features}
            onChange={(e) => setForm((f) => ({ ...f, features: e.target.value }))}
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
            Cabin layout · {seatConfiguration.length} passenger seats
          </p>
          <p className="mt-1 text-xs text-ink-muted">
            {vehicleTypeLabel(form.vehicleType)} ·{' '}
            {seatConfiguration.map((s) => s.seatNumber).join(', ')}
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
