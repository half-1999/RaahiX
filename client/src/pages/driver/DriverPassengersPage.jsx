import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Users } from 'lucide-react';
import { driverService } from '../../services/driverService';
import { getErrorMessage } from '../../services/api';
import PageHeader from '../../components/common/PageHeader';
import Alert from '../../components/ui/Alert';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import Skeleton from '../../components/ui/Skeleton';
import Table from '../../components/ui/Table';
import Badge from '../../components/ui/Badge';
import { formatCurrency } from '../../utils/format';

const PASSENGER_COLUMNS = [
  { key: 'name', header: 'Name' },
  {
    key: 'contact',
    header: 'Contact',
    render: (p) => [p.phone, p.email].filter(Boolean).join(' · ') || '—',
  },
  {
    key: 'seats',
    header: 'Seats',
    render: (p) => p.seatNumber || (p.seatNumbers || []).join(', ') || p.seatCount || '—',
  },
  {
    key: 'source',
    header: 'Source',
    render: (p) => p.source || 'BOOKING',
  },
  {
    key: 'fare',
    header: 'Fare',
    render: (p) => (p.fareAmount != null ? formatCurrency(p.fareAmount) : '—'),
  },
  {
    key: 'payment',
    header: 'Payment',
    render: (p) => (
      <Badge tone={p.paymentStatus === 'PAID' || p.paymentStatus === 'APPROVED' ? 'success' : 'pending'}>
        {p.paymentStatus || '—'}
      </Badge>
    ),
  },
];

export default function DriverPassengersPage() {
  const { rideId } = useParams();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [formError, setFormError] = useState('');
  const [form, setForm] = useState({
    name: '',
    phone: '',
    seatCount: '1',
    fareAmount: '',
    amountCollected: '0',
    notes: '',
  });

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['driver', 'rides', rideId, 'passengers'],
    queryFn: () => driverService.getPassengers(rideId),
  });

  const passengers = data?.passengers || [];
  const seats = data?.seats || [];

  const addPassenger = useMutation({
    mutationFn: () =>
      driverService.addPassenger(rideId, {
        name: form.name.trim(),
        phone: form.phone.trim() || undefined,
        seatCount: Number(form.seatCount) || 1,
        fareAmount: form.fareAmount === '' ? undefined : Number(form.fareAmount),
        amountCollected: Number(form.amountCollected) || 0,
        notes: form.notes.trim() || undefined,
      }),
    onSuccess: () => {
      setModalOpen(false);
      setFormError('');
      queryClient.invalidateQueries({ queryKey: ['driver', 'rides', rideId, 'passengers'] });
      queryClient.invalidateQueries({ queryKey: ['driver', 'passengers'] });
    },
    onError: (err) => setFormError(getErrorMessage(err)),
  });

  return (
    <div className="space-y-4">
      <PageHeader
        title="Ride passengers"
        subtitle="App bookings (confirmed or held) and manually added guests"
        actions={
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => setModalOpen(true)}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add guest
            </Button>
            <Link to={`/driver/rides/${rideId}`}>
              <Button variant="outline" size="sm">
                Back to ride
              </Button>
            </Link>
          </div>
        }
      />

      {isLoading ? <Skeleton className="h-40 w-full" /> : null}
      {isError ? <Alert tone="error">{getErrorMessage(error)}</Alert> : null}

      {!isLoading && !isError && !passengers.length ? (
        <EmptyState
          icon={Users}
          title="No passengers yet"
          description="Add a walk-in guest or wait for confirmed bookings."
          action={
            <Button onClick={() => setModalOpen(true)}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add guest
            </Button>
          }
        />
      ) : null}

      {passengers.length ? (
        <Table columns={PASSENGER_COLUMNS} rows={passengers} keyField="_id" />
      ) : null}

      {seats.length ? (
        <p className="text-sm text-ink-muted">
          Seat map: {seats.filter((s) => s.status === 'AVAILABLE').length} available / {seats.length} total
        </p>
      ) : null}

      <Modal
        open={modalOpen}
        onClose={() => !addPassenger.isPending && setModalOpen(false)}
        title="Add guest passenger"
        footer={
          <>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button
              loading={addPassenger.isPending}
              onClick={() => {
                if (!form.name.trim()) {
                  setFormError('Name is required');
                  return;
                }
                addPassenger.mutate();
              }}
            >
              Save
            </Button>
          </>
        }
      >
        {formError ? <Alert tone="error" className="mb-3">{formError}</Alert> : null}
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            label="Full name"
            required
            className="sm:col-span-2"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
          <Input
            label="Mobile"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
          />
          <Input
            label="Seats"
            type="number"
            min={1}
            max={6}
            value={form.seatCount}
            onChange={(e) => setForm((f) => ({ ...f, seatCount: e.target.value }))}
          />
          <Input
            label="Fare"
            type="number"
            min={0}
            value={form.fareAmount}
            onChange={(e) => setForm((f) => ({ ...f, fareAmount: e.target.value }))}
          />
          <Input
            label="Collected"
            type="number"
            min={0}
            value={form.amountCollected}
            onChange={(e) => setForm((f) => ({ ...f, amountCollected: e.target.value }))}
          />
          <Input
            label="Notes"
            className="sm:col-span-2"
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          />
        </div>
      </Modal>
    </div>
  );
}
