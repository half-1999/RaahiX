import { Booking } from '../models/Booking.js';
import { Ride } from '../models/Ride.js';
import { Payment } from '../models/Payment.js';
import {
  BOOKING_PAYMENT_STATUS,
  BOOKING_STATUS,
  PAYMENT_STATUS,
  RIDE_STATUS,
  ROLES,
  SEAT_STATUS,
} from '../constants/enums.js';
import { AppError } from '../utils/AppError.js';
import { ErrorCodes } from '../constants/errorCodes.js';
import { logger } from '../utils/logger.js';
import { holdSeats, releaseHold, releaseBookedSeats } from './seatService.js';
import { writeAudit } from './auditService.js';
import * as notificationService from './notificationService.js';

function generateBookingNumber() {
  const ts = Date.now().toString(36).toUpperCase();
  const rnd = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `BK${ts}${rnd}`;
}

export async function hold(userId, { rideId, seatNumbers }) {
  return holdSeats(userId, rideId, seatNumbers);
}

export async function createFromHold(userId, { rideId, holdId, passengers }) {
  if (!holdId || !rideId || !Array.isArray(passengers) || passengers.length === 0) {
    throw new AppError('rideId, holdId and passengers are required', {
      code: ErrorCodes.VALIDATION_ERROR,
      statusCode: 400,
    });
  }

  const ride = await Ride.findById(rideId);
  if (!ride) {
    throw new AppError('Ride not found', { code: ErrorCodes.RIDE_NOT_FOUND, statusCode: 404 });
  }
  if (ride.status !== RIDE_STATUS.SCHEDULED) {
    throw new AppError('Ride is not available for booking', {
      code: ErrorCodes.RIDE_NOT_AVAILABLE,
      statusCode: 400,
    });
  }

  const heldSeats = ride.seats.filter((s) => s.holdId === holdId);
  if (heldSeats.length === 0) {
    throw new AppError('Invalid or expired seat hold', {
      code: ErrorCodes.SEAT_HOLD_INVALID,
      statusCode: 400,
    });
  }

  const now = new Date();
  for (const seat of heldSeats) {
    if (seat.status !== SEAT_STATUS.HELD) {
      throw new AppError('Invalid seat hold', {
        code: ErrorCodes.SEAT_HOLD_INVALID,
        statusCode: 400,
      });
    }
    if (!seat.holdExpiresAt || seat.holdExpiresAt < now) {
      throw new AppError('Seat hold has expired', {
        code: ErrorCodes.SEAT_HOLD_EXPIRED,
        statusCode: 400,
      });
    }
    if (!seat.holdUserId || seat.holdUserId.toString() !== userId.toString()) {
      throw new AppError('Seat hold does not belong to this user', {
        code: ErrorCodes.SEAT_HOLD_INVALID,
        statusCode: 403,
      });
    }
  }

  const heldSeatNumbers = heldSeats.map((s) => s.seatNumber).sort();
  const passengerSeatNumbers = passengers.map((p) => p.seatNumber).sort();

  if (heldSeatNumbers.length !== passengerSeatNumbers.length) {
    throw new AppError('Passenger count must match held seats', {
      code: ErrorCodes.VALIDATION_ERROR,
      statusCode: 400,
    });
  }
  for (let i = 0; i < heldSeatNumbers.length; i += 1) {
    if (heldSeatNumbers[i] !== passengerSeatNumbers[i]) {
      throw new AppError('Passenger seats must match held seats', {
        code: ErrorCodes.VALIDATION_ERROR,
        statusCode: 400,
      });
    }
  }

  const existing = await Booking.findOne({
    holdId,
    bookingStatus: { $in: [BOOKING_STATUS.PENDING, BOOKING_STATUS.CONFIRMED] },
  });
  if (existing) {
    throw new AppError('A booking already exists for this hold', {
      code: ErrorCodes.CONFLICT,
      statusCode: 409,
    });
  }

  const amountPerSeat = ride.pricePerSeat;
  const passengerCount = passengers.length;
  const totalAmount = amountPerSeat * passengerCount;
  const holdExpiresAt = heldSeats[0].holdExpiresAt;

  const booking = await Booking.create({
    bookingNumber: generateBookingNumber(),
    userId,
    rideId: ride._id,
    passengers,
    selectedSeats: heldSeatNumbers,
    passengerCount,
    amountPerSeat,
    totalAmount,
    currency: 'INR',
    paymentStatus: BOOKING_PAYMENT_STATUS.PENDING,
    bookingStatus: BOOKING_STATUS.PENDING,
    holdId,
    holdExpiresAt,
  });

  logger.info('booking.created', {
    bookingId: booking._id.toString(),
    bookingNumber: booking.bookingNumber,
    userId: userId.toString(),
  });

  return booking;
}

export async function listMine(userId) {
  const bookings = await Booking.find({ userId })
    .populate({
      path: 'rideId',
      populate: { path: 'routeId' },
    })
    .sort({ createdAt: -1 });
  return { bookings };
}

export async function getById(bookingId, requester) {
  const booking = await Booking.findById(bookingId).populate({
    path: 'rideId',
    populate: [{ path: 'routeId' }, { path: 'vehicleId', select: 'vehicleType make model' }],
  });

  if (!booking) {
    throw new AppError('Booking not found', {
      code: ErrorCodes.BOOKING_NOT_FOUND,
      statusCode: 404,
    });
  }

  const isOwner = booking.userId.toString() === requester._id.toString();
  const isAdmin = requester.role === ROLES.ADMIN;
  if (!isOwner && !isAdmin) {
    throw new AppError('You do not have permission to view this booking', {
      code: ErrorCodes.AUTH_FORBIDDEN,
      statusCode: 403,
    });
  }

  return booking;
}

export async function cancel(bookingId, requester, { reason } = {}) {
  const booking = await Booking.findById(bookingId).populate('rideId');
  if (!booking) {
    throw new AppError('Booking not found', {
      code: ErrorCodes.BOOKING_NOT_FOUND,
      statusCode: 404,
    });
  }

  const isOwner = booking.userId.toString() === requester._id.toString();
  const isAdmin = requester.role === ROLES.ADMIN;
  if (!isOwner && !isAdmin) {
    throw new AppError('You do not have permission to cancel this booking', {
      code: ErrorCodes.AUTH_FORBIDDEN,
      statusCode: 403,
    });
  }

  if (booking.bookingStatus === BOOKING_STATUS.CANCELLED) {
    throw new AppError('Booking is already cancelled', {
      code: ErrorCodes.BOOKING_ALREADY_CANCELLED,
      statusCode: 400,
    });
  }
  if (booking.bookingStatus === BOOKING_STATUS.EXPIRED) {
    throw new AppError('Booking has expired', {
      code: ErrorCodes.BOOKING_EXPIRED,
      statusCode: 400,
    });
  }

  const ride = booking.rideId;
  if (
    ride &&
    (ride.status === RIDE_STATUS.STARTED ||
      ride.status === RIDE_STATUS.COMPLETED ||
      ride.status === RIDE_STATUS.BOARDING)
  ) {
    throw new AppError('Booking cannot be cancelled after boarding has started', {
      code: ErrorCodes.BOOKING_NOT_CANCELLABLE,
      statusCode: 400,
    });
  }

  const wasPaid = booking.paymentStatus === BOOKING_PAYMENT_STATUS.PAID;

  booking.bookingStatus = BOOKING_STATUS.CANCELLED;
  booking.cancelledAt = new Date();
  booking.cancellationReason = reason || null;

  if (wasPaid) {
    booking.paymentStatus = BOOKING_PAYMENT_STATUS.REFUNDED;
    await releaseBookedSeats(booking._id);
    await Payment.updateMany(
      { bookingId: booking._id, status: PAYMENT_STATUS.SUCCESS },
      { $set: { status: PAYMENT_STATUS.REFUNDED, refundedAt: new Date(), refundAmount: booking.totalAmount } }
    );
  } else {
    await releaseHold(booking.holdId);
    await Payment.updateMany(
      {
        bookingId: booking._id,
        status: { $in: [PAYMENT_STATUS.CREATED, PAYMENT_STATUS.PENDING] },
      },
      { $set: { status: PAYMENT_STATUS.FAILED } }
    );
  }

  await booking.save();

  if (isAdmin) {
    await writeAudit({
      actorId: requester._id,
      actorRole: requester.role,
      action: 'BOOKING_CANCELLED',
      entityType: 'Booking',
      entityId: booking._id,
      newValue: { reason, bookingStatus: BOOKING_STATUS.CANCELLED },
    });
  }

  logger.info('booking.cancelled', {
    bookingId: booking._id.toString(),
    by: requester._id.toString(),
  });

  notificationService.sendBookingCancellation(booking).catch((err) => {
    logger.warn('notification.failed', { type: 'BOOKING_CANCELLATION', message: err.message });
  });

  return booking;
}

export async function expirePending() {
  const now = new Date();
  const expired = await Booking.find({
    bookingStatus: BOOKING_STATUS.PENDING,
    holdExpiresAt: { $lte: now },
  });

  let count = 0;
  for (const booking of expired) {
    booking.bookingStatus = BOOKING_STATUS.EXPIRED;
    await booking.save();
    await releaseHold(booking.holdId);
    count += 1;
  }

  if (count > 0) {
    logger.info('booking.expired', { count });
  }
  return { expired: count };
}

export async function listAllAdmin(filters = {}) {
  const query = {};
  if (filters.status) query.bookingStatus = filters.status;
  if (filters.userId) query.userId = filters.userId;
  if (filters.rideId) query.rideId = filters.rideId;

  const bookings = await Booking.find(query)
    .populate('userId', 'name email phone')
    .populate({ path: 'rideId', populate: { path: 'routeId' } })
    .sort({ createdAt: -1 });
  return { bookings };
}
