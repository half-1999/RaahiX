import Badge from '../ui/Badge';

const bookingMap = {
  PENDING: { tone: 'pending', label: 'Pending' },
  CONFIRMED: { tone: 'success', label: 'Confirmed' },
  CANCELLED: { tone: 'cancelled', label: 'Cancelled' },
  EXPIRED: { tone: 'completed', label: 'Expired' },
};

const paymentMap = {
  PENDING: { tone: 'pending', label: 'Pending' },
  SUBMITTED: { tone: 'pending', label: 'Submitted' },
  APPROVED: { tone: 'success', label: 'Approved' },
  REJECTED: { tone: 'failed', label: 'Rejected' },
  PAID: { tone: 'success', label: 'Paid' },
  FAILED: { tone: 'failed', label: 'Failed' },
  REFUNDED: { tone: 'completed', label: 'Refunded' },
  CREATED: { tone: 'draft', label: 'Created' },
  SUCCESS: { tone: 'success', label: 'Success' },
  PARTIAL: { tone: 'pending', label: 'Partial' },
  COMPLETED: { tone: 'completed', label: 'Completed' },
  WAIVED: { tone: 'completed', label: 'Waived' },
  NOT_APPLICABLE: { tone: 'draft', label: 'N/A' },
};

const rideMap = {
  SCHEDULED: { tone: 'scheduled', label: 'Scheduled' },
  ACTIVE: { tone: 'active', label: 'Active' },
  COMPLETED: { tone: 'completed', label: 'Completed' },
  // Legacy labels still render safely if old data appears before migration
  DRAFT: { tone: 'scheduled', label: 'Scheduled' },
  PUBLISHED: { tone: 'scheduled', label: 'Scheduled' },
  BOARDING: { tone: 'active', label: 'Active' },
  STARTED: { tone: 'active', label: 'Active' },
  CANCELLED: { tone: 'cancelled', label: 'Voided' },
};

const maps = {
  booking: bookingMap,
  payment: paymentMap,
  ride: rideMap,
};

export default function StatusBadge({ status, type = 'booking', className }) {
  const map = maps[type] || bookingMap;
  const meta = map[status] || { tone: 'neutral', label: status || '—' };
  return (
    <Badge tone={meta.tone} className={className}>
      {meta.label}
    </Badge>
  );
}
