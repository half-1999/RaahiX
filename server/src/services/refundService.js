import { RIDE_STATUS, REFUND_STATUS } from '../constants/enums.js';

const STARTED = new Set([RIDE_STATUS.ACTIVE, RIDE_STATUS.COMPLETED]);

export function obligationPercent({ departureTime, rideStatus, rideCancelled = false }) {
  if (rideCancelled) return 100;
  if (STARTED.has(rideStatus)) return 0;
  const hours = (new Date(departureTime).getTime() - Date.now()) / (60 * 60 * 1000);
  if (hours > 24) return 100;
  if (hours >= 6) return 50;
  return 0;
}

export function applyObligation(booking, percent) {
  const amount = Math.round((Number(booking.totalAmount) * percent) / 100);
  booking.refundAmount = amount;
  booking.refundStatus = amount > 0 ? REFUND_STATUS.PENDING : REFUND_STATUS.NOT_APPLICABLE;
  return booking;
}
