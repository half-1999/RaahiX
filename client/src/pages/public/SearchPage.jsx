import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Bus } from 'lucide-react';
import { rideService } from '../../services/rideService';
import { getErrorMessage } from '../../services/api';
import RideSearchForm from '../../components/rides/RideSearchForm';
import RideCard from '../../components/rides/RideCard';
import Alert from '../../components/ui/Alert';
import EmptyState from '../../components/ui/EmptyState';
import Skeleton from '../../components/ui/Skeleton';
import PageHeader from '../../components/common/PageHeader';

export default function SearchPage() {
  const [params] = useSearchParams();
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

  const rides = data?.rides || data || [];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <PageHeader
        title="Available rides"
        subtitle={
          enabled
            ? `${query.originCity} → ${query.destinationCity} · ${query.date}`
            : 'Enter a route and date to see scheduled cabs'
        }
      />
      <RideSearchForm initial={query} className="mb-8" />

      {!enabled ? (
        <Alert tone="info">Choose origin, destination, and date to search.</Alert>
      ) : null}

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 w-full" />
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
          icon={Bus}
          title="No rides available for this route/date."
          description="Try another day or nearby city corridor."
        />
      ) : null}

      {rides.length ? (
        <div className="space-y-3">
          {rides.map((ride) => (
            <RideCard key={ride.id || ride._id} ride={ride} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
