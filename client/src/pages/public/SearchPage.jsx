import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CarFront, ChevronDown, SlidersHorizontal } from 'lucide-react';
import { rideService } from '../../services/rideService';
import { getErrorMessage } from '../../services/api';
import RideSearchForm from '../../components/rides/RideSearchForm';
import RideCard from '../../components/rides/RideCard';
import Alert from '../../components/ui/Alert';
import EmptyState from '../../components/ui/EmptyState';
import Skeleton from '../../components/ui/Skeleton';
import Button from '../../components/ui/Button';
import Select from '../../components/ui/Select';
import { cn } from '../../utils/cn';
import {
  VEHICLE_TYPE_OPTIONS,
  normalizeVehicleType,
} from '../../utils/vehicleLayouts';

const SORTS = [
  { id: 'recommended', label: 'Recommended' },
  { id: 'price', label: 'Lowest price' },
  { id: 'departure', label: 'Earliest departure' },
  { id: 'rating', label: 'Highest rated' },
];

const TIME_FILTERS = [
  { id: 'any', label: 'Any time' },
  { id: 'morning', label: 'Morning (5am–11am)', min: 5, max: 11 },
  { id: 'afternoon', label: 'Afternoon (12pm–4pm)', min: 12, max: 16 },
  { id: 'evening', label: 'Evening (5pm–9pm)', min: 17, max: 21 },
];

export default function SearchPage() {
  const [params] = useSearchParams();
  const [sort, setSort] = useState('recommended');
  const [timeFilter, setTimeFilter] = useState('any');
  const [amenityFilter, setAmenityFilter] = useState('all');
  const [vehicleType, setVehicleType] = useState('all');
  const [filtersOpen, setFiltersOpen] = useState(false);

  const query = useMemo(
    () => ({
      originCity: params.get('originCity') || '',
      destinationCity: params.get('destinationCity') || '',
      date: params.get('date') || '',
      passengers: params.get('passengers') || '1',
    }),
    [params]
  );

  const enabled = Boolean(query.originCity && query.destinationCity && query.date);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['rides', 'search', query],
    queryFn: () => rideService.search(query),
    enabled,
  });

  const rides = useMemo(() => {
    let list = [...(data?.rides || data || [])];
    if (timeFilter !== 'any') {
      const bucket = TIME_FILTERS.find((t) => t.id === timeFilter);
      list = list.filter((r) => {
        const h = new Date(r.departureTime).getHours();
        return h >= bucket.min && h <= bucket.max;
      });
    }
    if (amenityFilter === 'ac') {
      list = list.filter((r) =>
        (r.vehicle?.features || r.features || ['AC']).some((f) => /ac/i.test(f))
      );
    }
    if (vehicleType !== 'all') {
      list = list.filter(
        (r) =>
          normalizeVehicleType(r.vehicle?.vehicleType || r.vehicleType) === vehicleType
      );
    }
    if (sort === 'price') {
      list.sort((a, b) => (a.pricePerSeat || 0) - (b.pricePerSeat || 0));
    } else if (sort === 'departure') {
      list.sort((a, b) => new Date(a.departureTime) - new Date(b.departureTime));
    } else if (sort === 'rating') {
      list.sort((a, b) => (b.driver?.rating || 0) - (a.driver?.rating || 0));
    }
    return list;
  }, [data, sort, timeFilter, amenityFilter, vehicleType]);

  const activeFilterCount = [
    sort !== 'recommended',
    timeFilter !== 'any',
    amenityFilter !== 'all',
    vehicleType !== 'all',
  ].filter(Boolean).length;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-coral">Search</p>
          <h1 className="mt-1 font-display text-3xl font-bold text-navy">Available cars</h1>
          <p className="mt-1 text-sm text-slate">
            {enabled
              ? `${query.originCity} → ${query.destinationCity} · ${query.date} · ${query.passengers} passenger(s)`
              : 'Enter a route and date to see scheduled cars'}
          </p>
        </div>

        {enabled ? (
          <div className="relative">
            <Button
              variant="outline"
              type="button"
              onClick={() => setFiltersOpen((v) => !v)}
              aria-expanded={filtersOpen}
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filters &amp; sort
              {activeFilterCount ? (
                <span className="rounded-full bg-brand px-1.5 py-0.5 text-[10px] text-ink">
                  {activeFilterCount}
                </span>
              ) : null}
              <ChevronDown className={cn('h-4 w-4 transition', filtersOpen && 'rotate-180')} />
            </Button>

            {filtersOpen ? (
              <>
                <button
                  type="button"
                  className="fixed inset-0 z-20 cursor-default"
                  aria-label="Close filters"
                  onClick={() => setFiltersOpen(false)}
                />
                <div className="absolute right-0 z-30 mt-2 w-[min(100vw-2rem,20rem)] rounded-2xl border border-line bg-white p-4 shadow-[var(--shadow-lift)]">
                  <Select
                    label="Sort by"
                    value={sort}
                    onChange={(e) => setSort(e.target.value)}
                    options={SORTS.map((s) => ({ value: s.id, label: s.label }))}
                  />
                  <div className="mt-3">
                    <Select
                      label="Departure time"
                      value={timeFilter}
                      onChange={(e) => setTimeFilter(e.target.value)}
                      options={TIME_FILTERS.map((t) => ({ value: t.id, label: t.label }))}
                    />
                  </div>
                  <div className="mt-3">
                    <Select
                      label="Vehicle type"
                      value={vehicleType}
                      onChange={(e) => setVehicleType(e.target.value)}
                      options={[
                        { value: 'all', label: 'All types' },
                        ...VEHICLE_TYPE_OPTIONS.map((o) => ({
                          value: o.value,
                          label: o.label,
                        })),
                      ]}
                    />
                  </div>
                  <div className="mt-3">
                    <Select
                      label="Amenities"
                      value={amenityFilter}
                      onChange={(e) => setAmenityFilter(e.target.value)}
                      options={[
                        { value: 'all', label: 'Any amenities' },
                        { value: 'ac', label: 'AC only' },
                      ]}
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-3 w-full"
                    onClick={() => {
                      setSort('recommended');
                      setTimeFilter('any');
                      setAmenityFilter('all');
                      setVehicleType('all');
                    }}
                  >
                    Reset
                  </Button>
                </div>
              </>
            ) : null}
          </div>
        ) : null}
      </div>

      <RideSearchForm initial={query} className="mb-6" />

      {!enabled ? (
        <Alert tone="info">Choose origin, destination, and date to search.</Alert>
      ) : null}

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40 w-full rounded-2xl" />
          ))}
        </div>
      ) : null}

      {isError ? (
        <Alert tone="error" title="Could not load rides">
          {getErrorMessage(error)}{' '}
          <button type="button" className="underline" onClick={() => refetch()}>
            Retry
          </button>
        </Alert>
      ) : null}

      {enabled && !isLoading && !isError && !rides.length ? (
        <EmptyState
          icon={CarFront}
          title="No rides found"
          description="Try changing your departure time or travel date."
          action={
            <Button variant="outline" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
              Change search
            </Button>
          }
        />
      ) : null}

      {rides.length ? (
        <div className="space-y-4">
          <p className="text-sm font-medium text-slate">{rides.length} car(s) match your search</p>
          {rides.map((ride) => (
            <RideCard key={ride.id || ride._id} ride={ride} passengers={query.passengers} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
