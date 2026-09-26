import Badge from '../ui/Badge';

const bookingMap = {
  PENDING: { tone: 'warning', label: 'Pending' },
  CONFIRMED: { tone: 'success', label: 'Confirmed' },
  CANCELLED: { tone: 'danger', label: 'Cancelled' },
  EXPIRED: { tone: 'neutral', label: 'Expired' },
};

const paymentMap = {
  PENDING: { tone: 'warning', label: 'Pending' },
  PAID: { tone: 'success', label: 'Paid' },
  FAILED: { tone: 'danger', label: 'Failed' },
  REFUNDED: { tone: 'neutral', label: 'Refunded' },
  CREATED: { tone: 'neutral', label: 'Created' },
  SUCCESS: { tone: 'success', label: 'Success' },
};

const rideMap = {
  SCHEDULED: { tone: 'brand', label: 'Scheduled' },
  BOARDING: { tone: 'accent', label: 'Boarding' },
  STARTED: { tone: 'warning', label: 'Started' },
  COMPLETED: { tone: 'success', label: 'Completed' },
  CANCELLED: { tone: 'danger', label: 'Cancelled' },
};

const maps = {
  booking: bookingMap,
  payment: paymentMap,
  ride: rideMap,
};

export default function StatusBadge({ status, type = 'booking' }) {
  const map = maps[type] || bookingMap;
  const meta = map[status] || { tone: 'neutral', label: status || '—' };
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}
