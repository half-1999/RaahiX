import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { driverService } from '../../services/driverService';
import { getErrorMessage } from '../../services/api';
import RideSummary from '../../components/rides/RideSummary';
import PageHeader from '../../components/common/PageHeader';
import Alert from '../../components/ui/Alert';
import Button from '../../components/ui/Button';
import Skeleton from '../../components/ui/Skeleton';

const NEXT = {
  SCHEDULED: 'BOARDING',
  BOARDING: 'STARTED',
  STARTED: 'COMPLETED',
};

export default function DriverRideDetailPage() {
  const { rideId } = useParams();
  const queryClient = useQueryClient();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['driver', 'rides', rideId],
    queryFn: () => driverService.getRide(rideId),
  });

  const ride = data?.ride || data;

  const statusMutation = useMutation({
    mutationFn: (status) => driverService.updateStatus(rideId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver', 'rides', rideId] });
      queryClient.invalidateQueries({ queryKey: ['driver', 'dashboard'] });
    },
  });

  if (isLoading) return <Skeleton className="h-48 w-full" />;
  if (isError || !ride) {
    return <Alert tone="error">{getErrorMessage(error, 'Ride not found')}</Alert>;
  }

  const next = NEXT[ride.status];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Trip detail"
        actions={
          <Link to={`/driver/rides/${rideId}/passengers`}>
            <Button size="sm">Passengers</Button>
          </Link>
        }
      />
      <RideSummary ride={ride} />
      {statusMutation.isError ? (
        <Alert tone="error">{getErrorMessage(statusMutation.error)}</Alert>
      ) : null}
      {next ? (
        <Button
          className="w-full"
          loading={statusMutation.isPending}
          onClick={() => statusMutation.mutate(next)}
        >
          Mark as {next}
        </Button>
      ) : (
        <Alert tone="info">No further status actions for this trip.</Alert>
      )}
    </div>
  );
}
