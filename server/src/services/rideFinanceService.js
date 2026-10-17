import { Booking } from '../models/Booking.js';
import { RidePassenger } from '../models/RidePassenger.js';
import {
  BOOKING_STATUS,
  PROOF_STATUS,
  REFUND_STATUS,
} from '../constants/enums.js';

/**
 * Shared financial summary for a ride — used by listings and dashboards.
 * Collected = approved proofs + paid bookings + guest amountCollected.
 * Refunded = completed/partial refund amounts only.
 */
export async function summarizeRideFinance(rideId) {
  const [bookings, guests] = await Promise.all([
    Booking.find({
      rideId,
      bookingStatus: { $in: [BOOKING_STATUS.CONFIRMED, BOOKING_STATUS.PENDING, BOOKING_STATUS.CANCELLED] },
    }).lean(),
    RidePassenger.find({ rideId }).lean(),
  ]);

  let grossFare = 0;
  let collected = 0;
  let refunded = 0;
  let passengerCount = 0;

  for (const b of bookings) {
    passengerCount += Number(b.passengerCount || 0);
    const fare = Number(b.totalAmount || 0);
    if (b.bookingStatus === BOOKING_STATUS.CONFIRMED || b.proofStatus === PROOF_STATUS.APPROVED) {
      grossFare += fare;
    } else if (b.bookingStatus === BOOKING_STATUS.PENDING && b.proofStatus === PROOF_STATUS.SUBMITTED) {
      // Expected but not yet verified — count toward gross expectation only
      grossFare += fare;
    }

    if (b.proofStatus === PROOF_STATUS.APPROVED || b.paymentStatus === 'PAID') {
      collected += fare;
    }

    if (
      b.refundStatus === REFUND_STATUS.COMPLETED ||
      b.refundStatus === REFUND_STATUS.PARTIAL
    ) {
      refunded += Number(b.refundAmount || 0);
    }
  }

  for (const g of guests) {
    passengerCount += Number(g.seatCount || 0);
    grossFare += Number(g.fareAmount || 0);
    collected += Number(g.amountCollected || 0);
  }

  const outstanding = Math.max(0, grossFare - collected);
  const netCollected = Math.max(0, collected - refunded);

  return {
    grossFare,
    collected,
    outstanding,
    refunded,
    netCollected,
    passengerCount,
    bookingCount: bookings.length,
    guestCount: guests.length,
  };
}

export async function attachFinanceToRides(rides) {
  const list = Array.isArray(rides) ? rides : [];
  const results = await Promise.all(
    list.map(async (ride) => {
      const finance = await summarizeRideFinance(ride._id);
      const plain = typeof ride.toObject === 'function' ? ride.toObject() : { ...ride };
      return { ...plain, finance };
    })
  );
  return results;
}
