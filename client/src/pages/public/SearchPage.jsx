import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CalendarDays, MapPinned, RotateCcw, Search, SlidersHorizontal } from 'lucide-react';
import { rideService } from '../../services/rideService';
import { getErrorMessage } from '../../services/api';
import RideSearchForm from '../../components/rides/RideSearchForm';
import RideCard from '../../components/rides/RideCard';
import SearchEmptyIllustration from '../../components/rides/SearchEmptyIllustration';
import Alert from '../../components/ui/Alert';
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
  { id: 'availability', label: 'Most seats left' },
];

const TIME_FILTERS = [
  { id: 'any', label: 'Any time' },
  { id: 'morning', label: 'Morning (5am–11am)', min: 5, max: 11 },
  { id: 'afternoon', label: 'Afternoon (12pm–4pm)', min: 12, max: 16 },
  { id: 'evening', label: 'Evening (5pm–9pm)', min: 17, max: 21 },
];

function tomorrowLocal() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function addDaysLocal(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function applyClientFilters(list, { timeFilter, amenityFilter, vehicleType }) {
  let next = [...list];
  if (timeFilter !== 'any') {
    const bucket = TIME_FILTERS.find((t) => t.id === timeFilter);
    next = next.filter((r) => {
      const h = new Date(r.departureTime).getHours();
      return h >= bucket.min && h <= bucket.max;
    });
  }
  if (amenityFilter === 'ac') {
    next = next.filter((r) =>
      (r.vehicle?.features || r.features || ['AC']).some((f) => /ac/i.test(f))
    );
  }
  if (vehicleType !== 'all') {
    next = next.filter(
      (r) => normalizeVehicleType(r.vehicle?.vehicleType || r.vehicleType) === vehicleType
    );
  }
  return next;
}

export default function SearchPage() {
  const navigate = useNavigate();
  const [params, setSearchParams] = useSearchParams();
  const [sort, setSort] = useState(params.get('sort') || 'recommended');
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
      sort: params.get('sort') || sort,
    }),
    [params, sort]
  );

  const enabled = Boolean(query.originCity && query.destinationCity && query.date);

  const { data, isLoading, isError, error, isFetching, refetch } = useQuery({
    queryKey: ['rides', 'search', query],
    queryFn: () => rideService.search(query),
    enabled,
  });

  const filterOpts = { timeFilter, amenityFilter, vehicleType };
  const available = useMemo(
    () => applyClientFilters(data?.available || data?.rides || [], filterOpts),
    [data, timeFilter, amenityFilter, vehicleType]
  );
  const fullyBooked = useMemo(
    () => applyClientFilters(data?.fullyBooked || [], filterOpts),
    [data, timeFilter, amenityFilter, vehicleType]
  );
  const demo = useMemo(
    () => applyClientFilters(data?.demo || [], filterOpts),
    [data, timeFilter, amenityFilter, vehicleType]
  );
  const meta = data?.meta;
  const showingDemo =
    meta?.inventoryKind === 'demo' ||
    meta?.inventoryKind === 'fallback' ||
    (demo.length > 0 && !(data?.meta?.counts?.genuineAvailable > 0));
  const showingFallback = Boolean(meta?.guaranteedFallback);

  const activeFilterCount = [
    sort !== 'recommended',
    timeFilter !== 'any',
    amenityFilter !== 'all',
    vehicleType !== 'all',
  ].filter(Boolean).length;

  const searchCompletedEmpty =
    enabled &&
    !isLoading &&
    !isFetching &&
    !isError &&
    data != null &&
    !available.length &&
    !fullyBooked.length &&
    !demo.length;

  function patchQuery(patch) {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([key, value]) => {
      if (value == null || value === '') next.delete(key);
      else next.set(key, String(value));
    });
    setSearchParams(next);
  }

  function clearFilters() {
    setSort('recommended');
    setTimeFilter('any');
    setAmenityFilter('all');
    setVehicleType('all');
    patchQuery({ sort: 'recommended' });
  }

  function scrollToForm() {
    document.getElementById('ride-search-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function scrollToId(id) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <div className="rx-search-page min-h-[calc(100dvh-4rem)]">
      <div className="mx-auto max-w-6xl px-4 py-8 md:py-10">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-ink">Search</p>
            <h1 className="mt-1 font-display text-3xl font-bold text-ink">Find your ride</h1>
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
                  <span className="ml-1 rounded-full bg-brand px-1.5 text-xs font-bold text-ink">
                    {activeFilterCount}
                  </span>
                ) : null}
                <ChevronHint open={filtersOpen} />
              </Button>
              <div
                className={cn(
                  'absolute right-0 z-20 mt-2 w-[min(100vw-2rem,18rem)] rounded-2xl border-2 border-ink/10 bg-white p-3 shadow-[var(--shadow-lift)]',
                  filtersOpen ? 'block' : 'hidden'
                )}
              >
                <Select
                  label="Sort"
                  value={sort}
                  onChange={(e) => {
                    const value = e.target.value;
                    setSort(value);
                    patchQuery({ sort: value });
                  }}
                  options={SORTS.map((s) => ({ value: s.id, label: s.label }))}
                />
                <Select
                  label="Time of day"
                  className="mt-2"
                  value={timeFilter}
                  onChange={(e) => setTimeFilter(e.target.value)}
                  options={TIME_FILTERS.map((t) => ({ value: t.id, label: t.label }))}
                />
                <Select
                  label="Amenities"
                  className="mt-2"
                  value={amenityFilter}
                  onChange={(e) => setAmenityFilter(e.target.value)}
                  options={[
                    { value: 'all', label: 'Any' },
                    { value: 'ac', label: 'AC preferred' },
                  ]}
                />
                <Select
                  label="Vehicle"
                  className="mt-2"
                  value={vehicleType}
                  onChange={(e) => setVehicleType(e.target.value)}
                  options={[
                    { value: 'all', label: 'Any type' },
                    ...VEHICLE_TYPE_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
                  ]}
                />
                <div className="mt-3 flex justify-end">
                  <Button type="button" size="sm" variant="ghost" onClick={clearFilters}>
                    Reset
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <div id="ride-search-form" className="scroll-mt-24">
          <RideSearchForm
            initial={query}
            className="mb-6 rounded-2xl border border-line bg-white p-4 shadow-[var(--shadow-soft)] md:p-5"
          />
        </div>

        {!enabled ? (
          <Alert tone="info">Choose origin, destination, and date to search.</Alert>
        ) : null}

        {isLoading || (enabled && isFetching && !data) ? (
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

        {showingFallback && available.length ? (
          <Alert tone="info" title="Closest matches for you" className="mb-4">
            {meta?.fallbackNote ||
              'No exact seats for that search — showing the nearest alternatives so you always have options.'}
          </Alert>
        ) : null}

        {showingDemo && !showingFallback && available.length ? (
          <Alert tone="warning" title="Demonstration rides" className="mb-4">
            {meta?.demoNote ||
              'These rides use fictional demo drivers. They are not live marketplace offers.'}
            {meta?.allowDemoBooking
              ? ' Local demo booking is enabled for workflow testing.'
              : ' Booking is disabled for demo inventory.'}
          </Alert>
        ) : null}

        {searchCompletedEmpty ? (
          <div className="overflow-hidden rounded-[1.5rem] border border-line bg-white shadow-[var(--shadow-soft)]">
            <div className="border-b border-line bg-surface/80 px-4 pt-6 sm:px-8">
              <SearchEmptyIllustration />
            </div>
            <div className="px-5 py-8 text-center sm:px-8">
              <h2 className="font-display text-2xl font-bold text-ink">No rides found</h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate">
                We couldn&apos;t find a ride matching your search just yet. Try another date or explore
                nearby travel options.
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
                <Button
                  type="button"
                  onClick={() => {
                    patchQuery({ date: tomorrowLocal() });
                    scrollToForm();
                  }}
                >
                  <CalendarDays className="h-4 w-4" aria-hidden="true" />
                  Try tomorrow
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    patchQuery({
                      originCity: query.destinationCity,
                      destinationCity: query.originCity,
                    });
                  }}
                >
                  <RotateCcw className="h-4 w-4" aria-hidden="true" />
                  Reverse route
                </Button>
                <Button type="button" variant="outline" onClick={scrollToForm}>
                  <MapPinned className="h-4 w-4" aria-hidden="true" />
                  Edit route
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    clearFilters();
                    refetch();
                  }}
                >
                  Clear filters
                </Button>
                <Button type="button" variant="ghost" onClick={() => refetch()}>
                  <Search className="h-4 w-4" aria-hidden="true" />
                  Search again
                </Button>
              </div>
              <p className="mt-4 text-xs text-ink-muted">
                Looking for inspiration?{' '}
                <button
                  type="button"
                  className="font-semibold text-brand-ink underline-offset-2 hover:underline"
                  onClick={() => navigate('/#search-rides')}
                >
                  Browse popular corridors
                </button>
              </p>
            </div>
          </div>
        ) : null}

        {available.length ? (
          <section className="space-y-4" aria-labelledby="available-rides-heading">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2 id="available-rides-heading" className="font-display text-xl font-bold text-ink">
                  {showingDemo ? 'Sample rides' : 'Available rides'}
                </h2>
                <p className="text-sm text-slate">{available.length} match your search</p>
              </div>
            </div>
            {available.map((ride) => (
              <RideCard
                key={ride.id || ride._id}
                ride={ride}
                passengers={query.passengers}
                variant={showingDemo ? 'demo' : 'available'}
              />
            ))}
          </section>
        ) : null}

        {fullyBooked.length ? (
          <section id="fully-booked" className="mt-10 space-y-4 scroll-mt-24" aria-labelledby="full-rides-heading">
            <div>
              <h2 id="full-rides-heading" className="font-display text-xl font-bold text-ink">
                Fully booked rides
              </h2>
              <p className="text-sm text-slate">
                These rides are currently full. Try another departure time or check back later.
              </p>
            </div>
            {fullyBooked.map((ride) => (
              <RideCard
                key={`full-${ride.id || ride._id}`}
                ride={ride}
                passengers={query.passengers}
                variant="full"
              />
            ))}
          </section>
        ) : null}

        {!available.length && !searchCompletedEmpty && fullyBooked.length ? (
          <div className="mt-6 flex flex-wrap gap-2">
            <Button type="button" onClick={() => patchQuery({ date: addDaysLocal(1) })}>
              Search tomorrow
            </Button>
            <Button type="button" variant="outline" onClick={() => scrollToId('fully-booked')}>
              View fully booked
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ChevronHint({ open }) {
  return (
    <span className={cn('ml-1 inline-block transition', open && 'rotate-180')} aria-hidden="true">
      ▾
    </span>
  );
}
