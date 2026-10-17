import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarDays, Search } from 'lucide-react';
import { driverService } from '../../services/driverService';
import { getErrorMessage } from '../../services/api';
import PageHeader from '../../components/common/PageHeader';
import SearchFiltersBar from '../../components/common/SearchFiltersBar';
import DriverRideListItem from '../../components/rides/DriverRideListItem';
import Alert from '../../components/ui/Alert';
import EmptyState from '../../components/ui/EmptyState';
import Select from '../../components/ui/Select';
import Skeleton from '../../components/ui/Skeleton';
import { cityLabel, entityId } from '../../utils/format';
import {
  TRIP_SECTIONS,
  bucketRideBySchedule,
  sortRidesActiveFirst,
} from '../../utils/rideStatus';
import { cn } from '../../utils/cn';

export default function DriverTripsPage() {
  const queryClient = useQueryClient();
  const [section, setSection] = useState('today');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['driver', 'rides', { trips: true }],
    queryFn: () => driverService.listRides({}),
  });

  const cancelRide = useMutation({
    mutationFn: (rideId) => driverService.updateStatus(rideId, 'CANCELLED'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver', 'rides'] });
      queryClient.invalidateQueries({ queryKey: ['driver', 'dashboard'] });
    },
  });

  const grouped = useMemo(() => {
    const rides = data?.rides || [];
    const q = search.trim().toLowerCase();
    const filtered = rides.filter((ride) => {
      if (status && ride.status !== status) return false;
      if (!q) return true;
      return [
        cityLabel(ride.routeId?.origin),
        cityLabel(ride.routeId?.destination),
        entityId(ride),
        ride.vehicleId?.registrationNumber,
        ride.status,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(q);
    });

    const buckets = Object.fromEntries(TRIP_SECTIONS.map((s) => [s.id, []]));
    for (const ride of filtered) {
      const key = bucketRideBySchedule(ride);
      if (buckets[key]) buckets[key].push(ride);
    }
    for (const key of Object.keys(buckets)) {
      buckets[key] = sortRidesActiveFirst(buckets[key]);
    }
    return buckets;
  }, [data, search, status]);

  const visible = grouped[section] || [];
  const counts = Object.fromEntries(
    TRIP_SECTIONS.map((s) => [s.id, (grouped[s.id] || []).length])
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title="Trips"
        subtitle="Today, tomorrow, and upcoming — organized by schedule. Same rides as Rides, grouped by date."
        inline
      />

      <div className="flex gap-1 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:flex-wrap md:overflow-visible">
        {TRIP_SECTIONS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setSection(s.id)}
            className={cn(
              'shrink-0 rounded-xl px-3 py-2 text-xs font-bold transition sm:text-sm',
              section === s.id
                ? 'bg-brand text-ink shadow-sm'
                : 'bg-white text-ink-muted hover:bg-surface'
            )}
          >
            {s.label}
            <span className="ml-1 opacity-70">({counts[s.id] || 0})</span>
          </button>
        ))}
      </div>

      <SearchFiltersBar
        activeCount={[search, status].filter(Boolean).length}
        onReset={() => {
          setSearch('');
          setStatus('');
        }}
      >
        <label className="relative min-w-0 w-full md:max-w-xs md:flex-1">
          <span className="sr-only">Search trips</span>
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate" aria-hidden="true" />
          <input
            className="h-11 w-full rounded-xl border border-line bg-white py-2 pr-3 pl-9 text-sm"
            placeholder="Search city, plate, status…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <Select
          label="Status"
          className="min-w-[9rem] w-full md:w-auto"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          options={[
            { value: '', label: 'All statuses' },
            { value: 'PUBLISHED', label: 'Published' },
            { value: 'SCHEDULED', label: 'Scheduled' },
            { value: 'ACTIVE', label: 'Active' },
            { value: 'BOARDING', label: 'Boarding' },
            { value: 'STARTED', label: 'Started' },
            { value: 'COMPLETED', label: 'Completed' },
            { value: 'CANCELLED', label: 'Cancelled' },
          ]}
        />
      </SearchFiltersBar>

      {cancelRide.isError ? (
        <Alert tone="error">{getErrorMessage(cancelRide.error)}</Alert>
      ) : null}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : null}
      {isError ? <Alert tone="error">{getErrorMessage(error)}</Alert> : null}
      {!isLoading && !visible.length ? (
        <EmptyState
          icon={CalendarDays}
          title={`No ${TRIP_SECTIONS.find((s) => s.id === section)?.label.toLowerCase() || 'trips'}`}
          description="Publish a ride draft to see it appear in the matching schedule section."
        />
      ) : null}

      <ul className="space-y-3">
        {visible.map((ride) => (
          <DriverRideListItem
            key={entityId(ride)}
            ride={ride}
            detailBase="/driver/trips"
            onCancel={(rideId) => cancelRide.mutate(rideId)}
          />
        ))}
      </ul>
    </div>
  );
}
