import { useAuth } from '../../context/AuthContext';
import PageHeader from '../../components/common/PageHeader';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';

export default function ProfilePage() {
  const { user, logout } = useAuth();

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <PageHeader title="Profile" subtitle="Your RouteSeat account" />
      <div className="rounded-xl border border-line bg-white p-5">
        <dl className="space-y-3 text-sm">
          <div>
            <dt className="text-ink-muted">Name</dt>
            <dd className="font-medium">{user?.name}</dd>
          </div>
          <div>
            <dt className="text-ink-muted">Email</dt>
            <dd className="font-medium">{user?.email}</dd>
          </div>
          <div>
            <dt className="text-ink-muted">Phone</dt>
            <dd className="font-medium">{user?.phone || '—'}</dd>
          </div>
          <div>
            <dt className="text-ink-muted">Role</dt>
            <dd>
              <Badge tone="brand">{user?.role}</Badge>
            </dd>
          </div>
          <div>
            <dt className="text-ink-muted">Status</dt>
            <dd>
              <Badge tone={user?.status === 'ACTIVE' ? 'success' : 'warning'}>
                {user?.status || '—'}
              </Badge>
            </dd>
          </div>
        </dl>
        <Button variant="outline" className="mt-6" onClick={() => logout()}>
          Log out
        </Button>
      </div>
    </div>
  );
}
