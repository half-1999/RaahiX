import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Route } from 'lucide-react';
import { adminService } from '../../services/adminService';
import { getErrorMessage } from '../../services/api';
import PageHeader from '../../components/common/PageHeader';
import Alert from '../../components/ui/Alert';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import Select from '../../components/ui/Select';
import Skeleton from '../../components/ui/Skeleton';
import Table from '../../components/ui/Table';
import { cityLabel, entityId, formatDuration } from '../../utils/format';

const emptyForm = {
  originCity: '',
  originState: '',
  destinationCity: '',
  destinationState: '',
  estimatedDuration: 360,
  stopsText: '',
  status: 'ACTIVE',
};

function parseStops(text) {
  if (!text.trim()) return [];
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, idx) => {
      const [name, city, state] = line.split(',').map((s) => s.trim());
      return {
        name: name || city || `Stop ${idx + 1}`,
        city: city || name || '',
        state: state || '',
        sequence: idx + 1,
      };
    });
}

export default function AdminRoutesPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');

  const { data, isLoading, isError, error: qError } = useQuery({
    queryKey: ['admin', 'routes'],
    queryFn: () => adminService.listRoutes(),
  });

  const routes = data?.routes || [];

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        origin: { city: form.originCity, state: form.originState },
        destination: { city: form.destinationCity, state: form.destinationState },
        estimatedDuration: Number(form.estimatedDuration),
        stops: parseStops(form.stopsText),
        status: form.status,
      };
      if (editing) return adminService.updateRoute(entityId(editing), payload);
      return adminService.createRoute(payload);
    },
    onSuccess: () => {
      setOpen(false);
      setEditing(null);
      setForm(emptyForm);
      setError('');
      queryClient.invalidateQueries({ queryKey: ['admin', 'routes'] });
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setError('');
    setOpen(true);
  }

  function openEdit(route) {
    setEditing(route);
    setForm({
      originCity: route.origin?.city || '',
      originState: route.origin?.state || '',
      destinationCity: route.destination?.city || '',
      destinationState: route.destination?.state || '',
      estimatedDuration: route.estimatedDuration || 60,
      stopsText: (route.stops || [])
        .map((s) => [s.name, s.city, s.state].filter(Boolean).join(', '))
        .join('\n'),
      status: route.status || 'ACTIVE',
    });
    setError('');
    setOpen(true);
  }

  return (
    <div>
      <PageHeader
        title="Routes"
        subtitle="Origin → destination corridors"
        actions={
          <Button size="sm" onClick={openCreate}>
            Add route
          </Button>
        }
      />

      {isLoading ? <Skeleton className="h-48 w-full" /> : null}
      {isError ? <Alert tone="error">{getErrorMessage(qError)}</Alert> : null}

      {!isLoading && !routes.length ? (
        <EmptyState
          icon={Route}
          title="No routes"
          action={<Button onClick={openCreate}>Add route</Button>}
        />
      ) : (
        <Table
          keyField="_id"
          columns={[
            {
              key: 'corridor',
              header: 'Corridor',
              render: (row) => `${cityLabel(row.origin)} → ${cityLabel(row.destination)}`,
            },
            {
              key: 'stops',
              header: 'Stops',
              render: (row) => (row.stops || []).map((s) => s.name).join(' · ') || '—',
            },
            {
              key: 'estimatedDuration',
              header: 'Duration',
              render: (row) => formatDuration(row.estimatedDuration),
            },
            {
              key: 'status',
              header: 'Status',
              render: (row) => (
                <Badge tone={row.status === 'ACTIVE' ? 'success' : 'neutral'}>{row.status}</Badge>
              ),
            },
            {
              key: 'actions',
              header: '',
              render: (row) => (
                <Button size="sm" variant="outline" onClick={() => openEdit(row)}>
                  Edit
                </Button>
              ),
            },
          ]}
          rows={routes}
        />
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? 'Edit route' : 'Add route'}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button loading={saveMutation.isPending} onClick={() => saveMutation.mutate()}>
              Save
            </Button>
          </>
        }
      >
        {error ? <Alert tone="error" className="mb-3">{error}</Alert> : null}
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            label="Origin city"
            value={form.originCity}
            onChange={(e) => setForm((f) => ({ ...f, originCity: e.target.value }))}
          />
          <Input
            label="Origin state"
            value={form.originState}
            onChange={(e) => setForm((f) => ({ ...f, originState: e.target.value }))}
          />
          <Input
            label="Destination city"
            value={form.destinationCity}
            onChange={(e) => setForm((f) => ({ ...f, destinationCity: e.target.value }))}
          />
          <Input
            label="Destination state"
            value={form.destinationState}
            onChange={(e) => setForm((f) => ({ ...f, destinationState: e.target.value }))}
          />
          <Input
            label="Estimated duration (minutes)"
            type="number"
            min={1}
            value={form.estimatedDuration}
            onChange={(e) => setForm((f) => ({ ...f, estimatedDuration: e.target.value }))}
          />
          <Select
            label="Status"
            value={form.status}
            onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
            options={[
              { value: 'ACTIVE', label: 'Active' },
              { value: 'INACTIVE', label: 'Inactive' },
            ]}
          />
        </div>
        <label className="mt-3 block space-y-1.5">
          <span className="text-sm font-medium text-ink">Stops (one per line: name, city, state)</span>
          <textarea
            className="min-h-[96px] w-full rounded-lg border border-line bg-white px-3 py-2 text-sm"
            value={form.stopsText}
            onChange={(e) => setForm((f) => ({ ...f, stopsText: e.target.value }))}
            placeholder="Ghaziabad, Ghaziabad, Uttar Pradesh"
          />
        </label>
      </Modal>
    </div>
  );
}
