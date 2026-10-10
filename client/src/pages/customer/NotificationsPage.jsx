import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { notificationService } from '../../services/notificationService';
import PageHeader from '../../components/common/PageHeader';
import Button from '../../components/ui/Button';

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationService.list(),
  });
  const markRead = useMutation({
    mutationFn: (id) => notificationService.markRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });
  const notifications = data?.notifications || [];

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <PageHeader title="Alerts" subtitle="Booking, payment, and ride updates" />
      {isLoading ? <p className="text-sm text-slate">Loading alerts…</p> : null}
      {!isLoading && !notifications.length ? <p className="text-sm text-slate">No alerts yet.</p> : null}
      <ul className="space-y-3">
        {notifications.map((note) => (
          <li key={note._id} className="rounded-2xl border border-line bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-coral">{note.type.replace(/_/g, ' ')}</p>
            <p className="mt-2 whitespace-pre-line text-sm text-navy">{note.message}</p>
            {!note.read ? (
              <Button className="mt-3" size="sm" variant="outline" onClick={() => markRead.mutate(note._id)}>
                Mark read
              </Button>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
