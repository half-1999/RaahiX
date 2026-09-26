import { Link } from 'react-router-dom';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ClipboardList } from 'lucide-react';
import { adminService } from '../../services/adminService';
import { getErrorMessage } from '../../services/api';
import PageHeader from '../../components/common/PageHeader';
import StatusBadge from '../../components/common/StatusBadge';
import Alert from '../../components/ui/Alert';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import Select from '../../components/ui/Select';
import Skeleton from '../../components/ui/Skeleton';
import Table from '../../components/ui/Table';
import { cityLabel, entityId, formatCurrency, formatDateTime } from '../../utils/format';

export default function AdminBookingsPage() {
  const [status, setStatus] = useState('');

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['admin', 'bookings', { status }],
    queryFn: () => adminService.listBookings(status ? { status } : {}),
  });

  const bookings = data?.bookings || [];

  return (
    <div>
      <PageHeader title="Bookings" subtitle="All customer reservations" />

      <div className="mb-4 max-w-xs">
        <Select
          label="Status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          options={[
            { value: '', label: 'All' },
            { value: 'PENDING', label: 'Pending' },
            { value: 'CONFIRMED', label: 'Confirmed' },
            { value: 'CANCELLED', label: 'Cancelled' },
            { value: 'EXPIRED', label: 'Expired' },
          ]}
        />
      </div>

      {isLoading ? <Skeleton className="h-48 w-full" /> : null}
      {isError ? <Alert tone="error">{getErrorMessage(error)}</Alert> : null}

      {!isLoading && !bookings.length ? (
        <EmptyState icon={ClipboardList} title="No bookings" />
      ) : (
        <Table
          keyField="_id"
          columns={[
            { key: 'bookingNumber', header: 'Booking #' },
            {
              key: 'customer',
              header: 'Customer',
              render: (row) => row.userId?.name || row.userId?.email || '—',
            },
            {
              key: 'route',
              header: 'Route',
              render: (row) => {
                const route = row.rideId?.routeId;
                return route
                  ? `${cityLabel(route.origin)} → ${cityLabel(route.destination)}`
                  : '—';
              },
            },
            {
              key: 'seats',
              header: 'Seats',
              render: (row) => (row.selectedSeats || []).join(', ') || '—',
            },
            {
              key: 'amount',
              header: 'Amount',
              render: (row) => formatCurrency(row.totalAmount),
            },
            {
              key: 'bookingStatus',
              header: 'Booking',
              render: (row) => <StatusBadge status={row.bookingStatus} type="booking" />,
            },
            {
              key: 'paymentStatus',
              header: 'Payment',
              render: (row) => <StatusBadge status={row.paymentStatus} type="payment" />,
            },
            {
              key: 'createdAt',
              header: 'Created',
              render: (row) => formatDateTime(row.createdAt),
            },
            {
              key: 'actions',
              header: '',
              render: (row) => (
                <Link to={`/booking/${entityId(row)}`}>
                  <Button size="sm" variant="outline">
                    View
                  </Button>
                </Link>
              ),
            },
          ]}
          rows={bookings}
        />
      )}
    </div>
  );
}
