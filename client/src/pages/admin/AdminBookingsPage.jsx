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
import Pagination from '../../components/common/Pagination';
import { cityLabel, entityId, formatCurrency, formatDateTime } from '../../utils/format';

export default function AdminBookingsPage() {
  const [status, setStatus] = useState('');
  const [refundStatus, setRefundStatus] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['admin', 'bookings', { status, refundStatus, page }],
    queryFn: () =>
      adminService.listBookings({
        ...(status ? { status } : {}),
        ...(refundStatus ? { refundStatus } : {}),
        page,
        limit: 10,
      }),
  });

  const bookings = data?.bookings || [];

  return (
    <div>
      <PageHeader title="Bookings" subtitle="All customer reservations" />

      <div className="mb-4 grid max-w-2xl gap-3 sm:grid-cols-2">
        <Select
          label="Status"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          options={[
            { value: '', label: 'All' },
            { value: 'PENDING', label: 'Pending' },
            { value: 'CONFIRMED', label: 'Confirmed' },
            { value: 'CANCELLED', label: 'Cancelled' },
            { value: 'EXPIRED', label: 'Expired' },
          ]}
        />
        <Select
          label="Refund"
          value={refundStatus}
          onChange={(e) => {
            setRefundStatus(e.target.value);
            setPage(1);
          }}
          options={[
            { value: '', label: 'Any refund' },
            { value: 'PENDING', label: 'Refund required' },
            { value: 'PARTIAL', label: 'Partial' },
            { value: 'COMPLETED', label: 'Completed' },
            { value: 'NOT_APPLICABLE', label: 'Not applicable' },
          ]}
        />
      </div>

      {isLoading ? <Skeleton className="h-48 w-full" /> : null}
      {isError ? <Alert tone="error">{getErrorMessage(error)}</Alert> : null}

      {!isLoading && !bookings.length ? (
        <EmptyState icon={ClipboardList} title="No bookings" />
      ) : (
        <>
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
              key: 'proofStatus',
              header: 'Proof',
              render: (row) => row.proofStatus || '—',
            },
            {
              key: 'refund',
              header: 'Refund',
              render: (row) =>
                `${row.refundStatus || 'NOT_APPLICABLE'}${row.refundAmount ? ` ₹${row.refundAmount}` : ''}`,
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
        <Pagination page={data?.page || page} pages={data?.pages || 1} total={data?.total || 0} onPage={setPage} />
        </>
      )}
    </div>
  );
}
