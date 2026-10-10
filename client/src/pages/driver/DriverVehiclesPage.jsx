import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { driverService } from '../../services/driverService';
import { API_URL, getErrorMessage } from '../../services/api';
import PageHeader from '../../components/common/PageHeader';
import Alert from '../../components/ui/Alert';
import Button from '../../components/ui/Button';
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
  const [form, setForm] = useState(empty);
  const [error, setError] = useState('');
  const { data, isLoading } = useQuery({
    queryKey: ['driver', 'vehicles'],
    queryFn: () => driverService.listVehicles(),
  });
  const vehicles = data?.vehicles || [];

  const create = useMutation({
    mutationFn: () =>
      driverService.createVehicle({
        registrationNumber: form.registrationNumber,
        make: form.make,
        model: form.model,
        vehicleType: form.vehicleType,
        capacity: capacityForType(form.vehicleType),
        seatConfiguration: seatConfigurationForType(form.vehicleType),
        features: form.features,
      }),
    onSuccess: () => {
      setForm(empty);
      setError('');
      queryClient.invalidateQueries({ queryKey: ['driver', 'vehicles'] });
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  return (
    <div>
      <PageHeader title="Vehicles" subtitle="Up to 6 seats. Deactivate instead of deleting a vehicle that has rides." />
      {error ? <Alert tone="error" className="mb-4">{error}</Alert> : null}
      <form
        className="mb-6 space-y-3 rounded-2xl border border-line bg-white p-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (!form.make.trim() || !form.model.trim() || !form.features.length) {
            setError('Choose a company, model, and at least one feature');
            return;
          }
          create.mutate();
        }}
      >
        <CabDetailsForm value={form} onChange={setForm} />
        <Button type="submit" loading={create.isPending}>Add vehicle</Button>
      </form>
      {isLoading ? <p className="text-sm text-slate">Loading vehicles…</p> : null}
      <ul className="space-y-3">
        {vehicles.map((vehicle) => (
          <li key={vehicle._id} className="rounded-xl border border-line bg-white p-4 text-sm">
            <div className="flex gap-3">
              {vehicle.images?.length ? (
                <img
                  src={`${API_URL}/vehicles/${vehicle._id}/photo`}
                  alt={`${vehicle.make} ${vehicle.model}`}
                  className="h-20 w-28 rounded-lg object-cover"
                />
              ) : (
                <img
                  src={stockCabImage(vehicle.make, vehicle.model, vehicle.vehicleType)}
                  alt={`${vehicle.make} ${vehicle.model}`}
                  className="h-20 w-28 rounded-lg object-cover"
                />
              )}
              <div>
                <p className="font-semibold text-navy">{vehicle.registrationNumber}</p>
                <p className="text-slate">{vehicle.make} {vehicle.model} · {vehicle.capacity} bookable seats · {vehicle.status}</p>
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
                <label className="mt-2 inline-block text-xs font-semibold text-brand">
                  Upload cab photo
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
    </div>
  );
}
