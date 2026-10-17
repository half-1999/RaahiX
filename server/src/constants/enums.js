export const ROLES = Object.freeze({
  CUSTOMER: 'CUSTOMER',
  DRIVER: 'DRIVER',
  ADMIN: 'ADMIN',
});

export const USER_STATUS = Object.freeze({
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  BLOCKED: 'BLOCKED',
});

export const DRIVER_VERIFICATION = Object.freeze({
  PENDING: 'PENDING',
  VERIFIED: 'VERIFIED',
  REJECTED: 'REJECTED',
});

export const DRIVER_STATUS = Object.freeze({
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  SUSPENDED: 'SUSPENDED',
});

export const VEHICLE_STATUS = Object.freeze({
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  MAINTENANCE: 'MAINTENANCE',
});

export const ROUTE_STATUS = Object.freeze({
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
});

/** Canonical ride statuses only — UI and automation use these three. */
export const RIDE_STATUS = Object.freeze({
  SCHEDULED: 'SCHEDULED',
  ACTIVE: 'ACTIVE',
  COMPLETED: 'COMPLETED',
});

export const BOOKABLE_RIDE_STATUSES = Object.freeze([RIDE_STATUS.SCHEDULED]);

export const RIDE_STATUS_CHANGE_SOURCE = Object.freeze({
  AUTOMATIC: 'AUTOMATIC',
  MANUAL: 'MANUAL',
});

/** Map legacy statuses (pre three-status model) onto the canonical set. */
export function mapLegacyRideStatus(status) {
  switch (String(status || '').toUpperCase()) {
    case 'ACTIVE':
    case 'BOARDING':
    case 'STARTED':
    case 'IN_PROGRESS':
    case 'IN-PROGRESS':
      return RIDE_STATUS.ACTIVE;
    case 'COMPLETED':
    case 'FINISHED':
      return RIDE_STATUS.COMPLETED;
    case 'CANCELLED':
    case 'CANCELED':
      return RIDE_STATUS.COMPLETED;
    case 'DRAFT':
    case 'PUBLISHED':
    case 'PENDING':
    case 'UPCOMING':
    case 'SCHEDULED':
    default:
      return RIDE_STATUS.SCHEDULED;
  }
}

export function wasLegacyCancelled(status) {
  const s = String(status || '').toUpperCase();
  return s === 'CANCELLED' || s === 'CANCELED';
}

export const SEAT_STATUS = Object.freeze({
  AVAILABLE: 'AVAILABLE',
  HELD: 'HELD',
  BOOKED: 'BOOKED',
  BLOCKED: 'BLOCKED',
});

export const BOOKING_STATUS = Object.freeze({
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  CANCELLED: 'CANCELLED',
  EXPIRED: 'EXPIRED',
});

export const BOOKING_PAYMENT_STATUS = Object.freeze({
  PENDING: 'PENDING',
  PAID: 'PAID',
  FAILED: 'FAILED',
  REFUNDED: 'REFUNDED',
});

export const PROOF_STATUS = Object.freeze({
  NOT_SUBMITTED: 'NOT_SUBMITTED',
  SUBMITTED: 'SUBMITTED',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
});

export const REFUND_STATUS = Object.freeze({
  NOT_APPLICABLE: 'NOT_APPLICABLE',
  PENDING: 'PENDING',
  PARTIAL: 'PARTIAL',
  COMPLETED: 'COMPLETED',
  WAIVED: 'WAIVED',
});

export const PAYMENT_STATUS = Object.freeze({
  CREATED: 'CREATED',
  PENDING: 'PENDING',
  SUCCESS: 'SUCCESS',
  FAILED: 'FAILED',
  REFUNDED: 'REFUNDED',
});

export const GUEST_PAYMENT_STATUS = Object.freeze({
  PENDING: 'PENDING',
  PARTIAL: 'PARTIAL',
  PAID: 'PAID',
});

export const NOTIFICATION_CHANNEL = Object.freeze({
  EMAIL: 'EMAIL',
  WHATSAPP: 'WHATSAPP',
  SMS: 'SMS',
  IN_APP: 'IN_APP',
});

export const NOTIFICATION_STATUS = Object.freeze({
  PENDING: 'PENDING',
  SENT: 'SENT',
  FAILED: 'FAILED',
});
