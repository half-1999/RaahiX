import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Bus, Search } from 'lucide-react';
import { rideService } from '../../services/rideService';
import { driverService } from '../../services/driverService';
import { getErrorMessage } from '../../services/api';
import PageHeader from '../../components/common/PageHeader';
import SearchFiltersBar from '../../components/common/SearchFiltersBar';
import StatusBadge from '../../components/common/StatusBadge';
import Alert from '../../components/ui/Alert';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import Select from '../../components/ui/Select';
import Skeleton from '../../components/ui/Skeleton';
import { cityLabel, entityId, formatCurrency, formatDate, formatTime } from '../../utils/format';

export default function PassengerRidesPage() {
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [date, setDate] = useState('');
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [sort, setSort] = useState('departure-asc');

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 250);
    return () => clearTimeout(t);
  }, [search]);

  const locationsQuery = useQuery({
    queryKey: ['locations'],
    queryFn: () => driverService.listLocations(),
  });

  const cities = useMemo(() => {
    const fromApi = (locationsQuery.data?.cities || []).filter(Boolean);
    if (fromApi.length) return fromApi;
    return [...new Set((locationsQuery.data?.locations || []).map((l) => l.city).filter(Boolean))].sort();
  }, [locationsQuery.data]);

  const searchQuery = useQuery({
    queryKey: ['rides', 'search', { origin, destination, date }],
    queryFn: () =>
      rideService.search({
        ...(origin ? { originCity: origin } : {}),
        ...(destination ? { destinationCity: destination } : {}),
        ...(date ? { date } : {}),
        passengers: 1,
      }),
    enabled: Boolean(origin && destination),
  });

  const catalogQuery = useQuery({
    queryKey: ['rides', 'catalog'],
    queryFn: () => rideService.catalog(),
    enabled: !(origin && destination),
  });

  const rides = useMemo(() => {
    let list = [];
    if (origin && destination) {
      list = searchQuery.data?.rides || [];
    } else {
      const catalog = catalogQuery.data || {};
      list = [...(catalog.today || []), ...(catalog.upcoming || [])];
    }
    const q = debounced.trim().toLowerCase();
    let filtered = list.filter((ride) => {
      if (!q) return true;
      return [
        cityLabel(ride.routeId?.origin || ride.route?.origin || ride.origin),
        cityLabel(ride.routeId?.destination || ride.route?.destination || ride.destination),
        entityId(ride),
        ride.driverId?.name || ride.driver?.name,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
    filtered = [...filtered].sort((a, b) => {
      if (sort === 'fare-asc') return (a.pricePerSeat || 0) - (b.pricePerSeat || 0);
      if (sort === 'fare-desc') return (b.pricePerSeat || 0) - (a.pricePerSeat || 0);
      if (sort === 'seats-desc') {
        return (b.availableSeats || b.segmentSeats || 0) - (a.availableSeats || a.segmentSeats || 0);
      }
      if (sort === 'departure-desc') return new Date(b.departureTime) - new Date(a.departureTime);
      return new Date(a.departureTime) - new Date(b.departureTime);
    });
    return filtered;
  }, [searchQuery.data, catalogQuery.data, origin, destination, debounced, sort]);

  const loading = origin && destination ? searchQuery.isLoading : catalogQuery.isLoading;
  const error = origin && destination ? searchQuery.error : catalogQuery.error;
  const isError = origin && destination ? searchQuery.isError : catalogQuery.isError;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Rides"
        subtitle="Browse available corridor rides"
        actions={
          <Link to="/search">
            <Button size="sm" variant="outline">
              Advanced search
            </Button>
          </Link>
        }
      />

      <SearchFiltersBar
        activeCount={
          [origin, destination, date, search].filter(Boolean).length +
          (sort !== 'departure-asc' ? 1 : 0)
        }
        onReset={() => {
          setOrigin('');
          setDestination('');
          setDate('');
          setSearch('');
          setSort('departure-asc');
        }}
      >
        <Select
          label="Source"
          className="min-w-[9rem] w-full md:w-auto"
          value={origin}
          onChange={(e) => setOrigin(e.target.value)}
          options={cities.map((c) => ({ value: c, label: c }))}
          placeholder="Any source"
        />
        <Select
          label="Destination"
          className="min-w-[9rem] w-full md:w-auto"
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          options={cities.filter((c) => c !== origin).map((c) => ({ value: c, label: c }))}
          placeholder="Any destination"
        />
        <label className="block w-full text-xs font-medium text-ink-muted md:w-auto">
          Date
          <input
            type="date"
            className="mt-1 h-11 w-full rounded-xl border border-line bg-white px-3 text-sm"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
        <label className="relative min-w-0 w-full md:max-w-xs md:flex-1">
          <span className="sr-only">Search</span>
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate" aria-hidden="true" />
          <input
            className="h-11 w-full rounded-xl border border-line bg-white py-2 pr-3 pl-9 text-sm"
            placeholder="Search city or ride…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <Select
          label="Sort"
          className="min-w-[10rem] w-full md:w-auto"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          options={[
            { value: 'departure-asc', label: 'Departure ↑' },
            { value: 'departure-desc', label: 'Departure ↓' },
            { value: 'fare-asc', label: 'Fare ↑' },
            { value: 'fare-desc', label: 'Fare ↓' },
            { value: 'seats-desc', label: 'Seats available' },
          ]}
        />
      </SearchFiltersBar>

      {origin && destination && !date ? (
        <Alert tone="info">Pick a date for a precise search, or browse the catalog below.</Alert>
      ) : null}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : null}
      {isError ? <Alert tone="error">{getErrorMessage(error)}</Alert> : null}
      {!loading && !rides.length ? (
        <EmptyState icon={Bus} title="No rides found" description="Try different cities or dates." />
      ) : null}

      <ul className="space-y-3">
        {rides.map((ride) => {
          const id = entityId(ride);
          return (
            <li key={id}>
              <Link
                to={`/rides/${id}`}
                className="block rounded-2xl border-2 border-ink/10 bg-white p-4 shadow-[var(--shadow-soft)] transition hover:border-brand"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-display text-[clamp(1rem,1.2vw+0.5rem,1.25rem)] font-bold text-ink">
                      {cityLabel(ride.routeId?.origin || ride.route?.origin || ride.origin)} →{' '}
                      {cityLabel(ride.routeId?.destination || ride.route?.destination || ride.destination)}
                    </p>
                    <p className="mt-1 text-sm text-ink-muted">
                      {formatDate(ride.departureTime)} · {formatTime(ride.departureTime)} ·{' '}
                      {formatCurrency(ride.pricePerSeat)}/seat
                    </p>
                    <p className="text-xs text-ink-muted">
                      {ride.availableSeats ?? ride.segmentSeats ?? '—'} seats left
                    </p>
                  </div>
                  <StatusBadge status={ride.status} type="ride" />
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
