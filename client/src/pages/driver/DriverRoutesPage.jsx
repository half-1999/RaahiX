import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { driverService } from '../../services/driverService';
import { getErrorMessage } from '../../services/api';
import PageHeader from '../../components/common/PageHeader';
import Alert from '../../components/ui/Alert';
import Button from '../../components/ui/Button';

export default function DriverRoutesPage() {
  const queryClient = useQueryClient();
  const [stopsText, setStopsText] = useState('Richha | Richha | Uttar Pradesh\nDelhi | Delhi | Delhi\nNoida | Noida | Uttar Pradesh\nGurugram | Gurugram | Haryana');
  const [error, setError] = useState('');
  const { data, isLoading } = useQuery({
    queryKey: ['driver', 'routes'],
    queryFn: () => driverService.listRoutes(),
  });
  const routes = data?.routes || [];

  const create = useMutation({
    mutationFn: () => {
      const stops = stopsText
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          const [name, city, state] = line.split('|').map((part) => part.trim());
          return { name, city: city || name, state: state || city || name };
        });
      return driverService.createRoute({ estimatedDuration: 420, stops });
    },
    onSuccess: () => {
      setError('');
      queryClient.invalidateQueries({ queryKey: ['driver', 'routes'] });
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  return (
    <div>
      <PageHeader title="Routes" subtitle="One stop per line: name | city | state. Order is the direction of travel." />
      {error ? <Alert tone="error" className="mb-4">{error}</Alert> : null}
      <form
        className="mb-6 rounded-2xl border border-line bg-white p-4"
        onSubmit={(event) => {
          event.preventDefault();
          create.mutate();
        }}
      >
        <label className="block text-sm font-medium text-navy">
          Stops
          <textarea
            className="mt-2 h-32 w-full rounded-xl border border-line p-3 text-sm"
            value={stopsText}
            onChange={(event) => setStopsText(event.target.value)}
          />
        </label>
        <Button className="mt-3" type="submit" loading={create.isPending}>Create route</Button>
      </form>
      {isLoading ? <p className="text-sm text-slate">Loading routes…</p> : null}
      <ul className="space-y-2">
        {routes.map((route) => (
          <li key={route._id} className="rounded-xl border border-line bg-white px-4 py-3 text-sm">
            <p className="font-semibold text-navy">
              {route.origin?.city} → {route.destination?.city}
            </p>
            <p className="text-slate">{(route.stops || []).map((stop) => stop.city).join(' · ') || 'Direct'}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
