import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Car, Pencil, Plus, Search } from 'lucide-react';
import { driverService } from '../../services/driverService';
import { API_URL, getErrorMessage } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import PageHeader from '../../components/common/PageHeader';
import SearchFiltersBar from '../../components/common/SearchFiltersBar';
import StatusBadge from '../../components/common/StatusBadge';
import Alert from '../../components/ui/Alert';
import Button from '../../components/ui/Button';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import EmptyState from '../../components/ui/EmptyState';
import Modal from '../../components/ui/Modal';
import CabDetailsForm from '../../components/vehicles/CabDetailsForm';
import { capacityForType, seatConfigurationForType } from '../../utils/vehicleLayouts';
import { stockCabImage } from '../../utils/cabImages';

const empty = {
  registrationNumber: '',
  make: 'Maruti',
  model: 'Dzire',
  vehicleType: '5_SEATER',
  features: ['AC'],
  customMake: false,
  customModel: false,
};

export default function DriverVehiclesPage() {
  const queryClient = useQueryClient();
  const { refreshMe } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');
  const [deactivateTarget, setDeactivateTarget] = useState(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['driver', 'vehicles'],
    queryFn: () => driverService.listVehicles(),
  });
  const vehicles = data?.vehicles || [];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return vehicles;
    return vehicles.filter((v) =>
      `${v.registrationNumber} ${v.make} ${v.model} ${v.status}`.toLowerCase().includes(q)
    );
  }, [vehicles, search]);

  useEffect(() => {
    if (searchParams.get('new') === '1') {
      openCreate();
      searchParams.delete('new');
      setSearchParams(searchParams, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openCreate() {
    setEditing(null);
    setForm(empty);
    setError('');
    setModalOpen(true);
  }

  function openEdit(vehicle) {
    setEditing(vehicle);
    setForm({
      registrationNumber: vehicle.registrationNumber || '',
      make: vehicle.make || '',
      model: vehicle.model || '',
      vehicleType: vehicle.vehicleType || '5_SEATER',
      features: vehicle.features?.length ? [...vehicle.features] : ['AC'],
      customMake: false,
      customModel: false,
    });
    setError('');
    setModalOpen(true);
  }

  const save = useMutation({
    mutationFn: () => {
      const payload = {
        registrationNumber: form.registrationNumber.trim().toUpperCase(),
        make: form.make.trim(),
        model: form.model.trim(),
        vehicleType: form.vehicleType,
        capacity: capacityForType(form.vehicleType),
        seatConfiguration: seatConfigurationForType(form.vehicleType),
        features: form.features,
      };
      if (editing) return driverService.updateVehicle(editing._id, payload);
      return driverService.createVehicle(payload);
    },
    onSuccess: async () => {
      setError('');
      setSuccess(editing ? 'Vehicle updated' : 'Vehicle added');
      setModalOpen(false);
      setEditing(null);
      setForm(empty);
      queryClient.invalidateQueries({ queryKey: ['driver', 'vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['driver', 'dashboard'] });
      await refreshMe();
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  const deactivate = useMutation({
    mutationFn: (id) => driverService.deactivateVehicle(id),
    onSuccess: () => {
      setDeactivateTarget(null);
      setSuccess('Vehicle deactivated');
      queryClient.invalidateQueries({ queryKey: ['driver', 'vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['driver', 'dashboard'] });
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title="Vehicles"
        subtitle="Up to 6 bookable seats. Deactivate instead of deleting a vehicle with rides."
        actions={
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add vehicle
          </Button>
        }
      />

      {error && !modalOpen ? <Alert tone="error">{error}</Alert> : null}
      {success ? <Alert tone="success">{success}</Alert> : null}

      <SearchFiltersBar
        activeCount={search ? 1 : 0}
        onReset={() => setSearch('')}
      >
        <label className="relative min-w-0 w-full md:max-w-sm md:flex-1">
          <span className="sr-only">Search vehicles</span>
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate" aria-hidden="true" />
          <input
            className="h-11 w-full rounded-xl border border-line bg-white py-2 pr-3 pl-9 text-sm"
            placeholder="Search plate, make, model…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
      </SearchFiltersBar>

      {isLoading ? <p className="text-sm text-slate">Loading vehicles…</p> : null}
      {isError ? <Alert tone="error">Could not load vehicles.</Alert> : null}

      {!isLoading && !filtered.length ? (
        <EmptyState
          icon={Car}
          title="No vehicles yet"
          description="Add your first cab to start posting rides."
          action={
            <Button size="sm" onClick={openCreate}>
              Add vehicle
            </Button>
          }
        />
      ) : null}

      <ul className="grid gap-3 sm:grid-cols-2">
        {filtered.map((vehicle) => (
          <li
            key={vehicle._id}
            className="rounded-2xl border-2 border-ink/10 bg-white p-4 shadow-[var(--shadow-soft)]"
          >
            <div className="flex gap-3">
              <img
                src={
                  vehicle.images?.length
                    ? `${API_URL}/vehicles/${vehicle._id}/photo`
                    : stockCabImage(vehicle.make, vehicle.model, vehicle.vehicleType)
                }
                alt={`${vehicle.make} ${vehicle.model}`}
                className="h-20 w-28 shrink-0 rounded-lg object-cover"
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="font-semibold text-ink">{vehicle.registrationNumber}</p>
                  <StatusBadge status={vehicle.status} />
                </div>
                <p className="text-sm text-slate">
                  {vehicle.make} {vehicle.model} · {vehicle.capacity} seats
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => openEdit(vehicle)}>
                    <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                    Edit
                  </Button>
                  {vehicle.status !== 'INACTIVE' ? (
                    <Button size="sm" variant="danger" onClick={() => setDeactivateTarget(vehicle)}>
                      Deactivate
                    </Button>
                  ) : null}
                </div>
                {vehicle.images?.[0]?._id ? (
                  <button
                    type="button"
                    className="mt-2 block text-xs font-semibold text-danger"
                    onClick={async () => {
                      try {
                        await driverService.removeVehicleImage(vehicle._id, vehicle.images[0]._id);
                        queryClient.invalidateQueries({ queryKey: ['driver', 'vehicles'] });
                      } catch (err) {
                        setError(getErrorMessage(err, 'Could not remove the photo'));
                      }
                    }}
                  >
                    Remove photo
                  </button>
                ) : null}
                <label className="mt-2 inline-block text-xs font-semibold text-brand-ink">
                  Upload car photo
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="mt-1 block text-xs text-slate"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (!file) return;
                      if (file.size > 2 * 1024 * 1024) {
                        setError('Photo must be 2 MB or smaller');
                        return;
                      }
                      const reader = new FileReader();
                      reader.onload = async () => {
                        try {
                          await driverService.addVehicleImage(vehicle._id, String(reader.result));
                          queryClient.invalidateQueries({ queryKey: ['driver', 'vehicles'] });
                        } catch (err) {
                          setError(getErrorMessage(err, 'Could not upload the photo'));
                        }
                      };
                      reader.readAsDataURL(file);
                    }}
                  />
                </label>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <Modal
        open={modalOpen}
        onClose={() => !save.isPending && setModalOpen(false)}
        title={editing ? 'Edit vehicle' : 'Add vehicle'}
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setModalOpen(false)} disabled={save.isPending}>
              Cancel
            </Button>
            <Button
              loading={save.isPending}
              onClick={() => {
                if (!form.registrationNumber.trim() || !form.make.trim() || !form.model.trim() || !form.features.length) {
                  setError('Registration, company, model, and at least one feature are required');
                  return;
                }
                save.mutate();
              }}
            >
              {editing ? 'Save changes' : 'Save vehicle'}
            </Button>
          </>
        }
      >
        {error ? <Alert tone="error" className="mb-3">{error}</Alert> : null}
        <CabDetailsForm value={form} onChange={setForm} />
      </Modal>

      <ConfirmDialog
        open={Boolean(deactivateTarget)}
        onClose={() => setDeactivateTarget(null)}
        title="Deactivate vehicle?"
        description="This vehicle will no longer be available for new rides. Vehicles with upcoming rides cannot be deactivated."
        confirmLabel="Deactivate"
        loading={deactivate.isPending}
        onConfirm={() => deactivate.mutate(deactivateTarget._id)}
      />
    </div>
  );
}
