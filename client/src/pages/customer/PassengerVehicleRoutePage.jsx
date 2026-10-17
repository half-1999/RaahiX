import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Route, Search } from 'lucide-react';
import { driverService } from '../../services/driverService';
import PageHeader from '../../components/common/PageHeader';
import SearchFiltersBar from '../../components/common/SearchFiltersBar';
import Alert from '../../components/ui/Alert';
import EmptyState from '../../components/ui/EmptyState';
import Skeleton from '../../components/ui/Skeleton';

export default function PassengerVehicleRoutePage() {
  const [search, setSearch] = useState('');
  const locationsQuery = useQuery({
    queryKey: ['locations'],
    queryFn: () => driverService.listLocations(),
  });

  const locations = useMemo(() => {
    const list = locationsQuery.data?.locations || [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((loc) =>
      `${loc.city} ${loc.state} ${loc.name}`.toLowerCase().includes(q)
    );
  }, [locationsQuery.data, search]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Vehicle & Route"
        subtitle="Corridor locations you can travel between. Vehicle management is for drivers only."
      />

      <Alert tone="info">
        Passengers browse published rides and book seats. Drivers manage vehicles and create routes from
        their dashboard.
      </Alert>

      <SearchFiltersBar activeCount={search ? 1 : 0} onReset={() => setSearch('')}>
        <label className="relative min-w-0 w-full md:max-w-sm md:flex-1">
          <span className="sr-only">Search locations</span>
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate" aria-hidden="true" />
          <input
            className="h-11 w-full rounded-xl border border-line bg-white py-2 pr-3 pl-9 text-sm"
            placeholder="Search cities…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
      </SearchFiltersBar>

      {locationsQuery.isLoading ? <Skeleton className="h-32 w-full" /> : null}
      {locationsQuery.isError ? <Alert tone="error">Could not load locations.</Alert> : null}
      {!locationsQuery.isLoading && !locations.length ? (
        <EmptyState icon={Route} title="No locations yet" description="Check back soon for corridor cities." />
      ) : null}

      <ul className="grid gap-2 sm:grid-cols-2">
        {locations.map((loc) => (
          <li
            key={loc._id || `${loc.city}-${loc.state}`}
            className="rounded-xl border border-line bg-white px-4 py-3"
          >
            <p className="font-semibold text-ink">
              {loc.city} · {loc.state}
            </p>
            {loc.name && loc.name !== loc.city ? (
              <p className="text-xs text-slate">{loc.name}</p>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
