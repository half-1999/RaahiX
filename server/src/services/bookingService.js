import { Booking } from '../models/Booking.js';
import { Ride } from '../models/Ride.js';
import { Payment } from '../models/Payment.js';
import {
  BOOKABLE_RIDE_STATUSES,
  BOOKING_PAYMENT_STATUS,
  BOOKING_STATUS,
  PAYMENT_STATUS,
  RIDE_STATUS,
  REFUND_STATUS,
  ROLES,
  SEAT_STATUS,
} from '../constants/enums.js';
import { AppError } from '../utils/AppError.js';
import { ErrorCodes } from '../constants/errorCodes.js';
import { logger } from '../utils/logger.js';
import { holdSeats, releaseHold, releaseBookedSeats } from './seatService.js';
import {
  assertForwardSegment,
  holdSegment,
  orderedStops,
  usesSegmentInventory,
} from './segmentService.js';
import { requireReason, writeAudit } from './auditService.js';
import { applyObligation, obligationPercent } from './refundService.js';
import * as notificationService from './notificationService.js';
import { quoteSeats } from '../utils/fare.js';

function generateBookingNumber() {
  const ts = Date.now().toString(36).toUpperCase();
  const rnd = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `BK${ts}${rnd}`;
}

export async function hold(userId, { rideId, seatNumbers, pickupLocationId, dropLocationId, passengerCount }) {
  const uniqueSeats = [...new Set(seatNumbers)];
  if (passengerCount != null && Number(passengerCount) !== uniqueSeats.length) {
    throw new AppError(`Select exactly ${passengerCount} seats for this booking`, {
      code: ErrorCodes.VALIDATION_ERROR,
      statusCode: 400,
    });
  }
  const ride = await Ride.findById(rideId);
  if (!ride) {
    throw new AppError('Ride not found', { code: ErrorCodes.RIDE_NOT_FOUND, statusCode: 404 });
  }
  const openSeats = ride.seats.filter((seat) => seat.status === SEAT_STATUS.AVAILABLE).length;
  if (!usesSegmentInventory(ride) && uniqueSeats.length > openSeats) {
    throw new AppError('Not enough seats are available for this booking', {
      code: ErrorCodes.SEAT_UNAVAILABLE,
      statusCode: 409,
    });
  }
  if (usesSegmentInventory(ride)) {
    return holdSegment(userId, rideId, {
      seatCount: seatNumbers.length,
      pickupLocationId,
      dropLocationId,
    });
  }
  return holdSeats(userId, rideId, seatNumbers);
}

export async function createFromHold(userId, { rideId, holdId, passengers, pickupLocationId, dropLocationId }) {
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
  if (!BOOKABLE_RIDE_STATUSES.includes(ride.status)) {
    throw new AppError('Ride is not available for booking', {
      code: ErrorCodes.RIDE_NOT_AVAILABLE,
      statusCode: 400,
    });
  }

  const segmentHold = (ride.segmentHolds || []).find((item) => item.holdId === holdId);
  if (segmentHold) {
    const existingSegmentBooking = await Booking.findOne({
      holdId,
      bookingStatus: { $in: [BOOKING_STATUS.PENDING, BOOKING_STATUS.CONFIRMED] },
    });
    if (existingSegmentBooking) {
      throw new AppError('A booking already exists for this hold', {
        code: ErrorCodes.CONFLICT,
        statusCode: 409,
      });
    }
    if (passengers.length !== segmentHold.seatCount) {
      throw new AppError('Passenger count must match held seats', {
        code: ErrorCodes.VALIDATION_ERROR,
        statusCode: 400,
      });
    }
    if (segmentHold.status !== 'ACTIVE' || String(segmentHold.userId) !== String(userId)) {
      throw new AppError('Invalid or expired seat hold', {
        code: ErrorCodes.SEAT_HOLD_INVALID,
        statusCode: 400,
      });
    }
    if (!segmentHold.holdExpiresAt || segmentHold.holdExpiresAt < new Date()) {
      throw new AppError('Seat hold has expired', {
        code: ErrorCodes.SEAT_HOLD_EXPIRED,
        statusCode: 400,
      });
    }
    const booking = await Booking.create({
      bookingNumber: generateBookingNumber(),
      userId,
      rideId: ride._id,
      pickupLocationId: segmentHold.pickupLocationId,
      dropLocationId: segmentHold.dropLocationId,
      pickupName: orderedStops(ride).find((stop) => stop.sequence === segmentHold.pickupSequence)?.name || null,
      dropName: orderedStops(ride).find((stop) => stop.sequence === segmentHold.dropSequence)?.name || null,
      passengers,
      selectedSeats: passengers.map((passenger) => passenger.seatNumber),
      passengerCount: passengers.length,
      ...(() => {
        const quote = quoteSeats(ride, passengers.map((passenger) => passenger.seatNumber));
        return {
          amountPerSeat: quote.amountPerSeat,
          totalAmount: quote.totalAmount,
          seatFares: quote.lines,
        };
      })(),
      currency: 'INR',
      holdId,
      holdExpiresAt: segmentHold.holdExpiresAt,
    });
    notificationService.notifyBookingCreated(booking).catch((err) => {
      logger.warn('notification.failed', { type: 'BOOKING_CREATED', message: err.message });
    });
    return booking;
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

  const segment = orderedStops(ride).some((stop) => stop.locationId)
    ? assertForwardSegment(orderedStops(ride), pickupLocationId, dropLocationId)
    : null;

  const quote = quoteSeats(ride, heldSeatNumbers);
  const amountPerSeat = quote.amountPerSeat;
  const passengerCount = passengers.length;
  const totalAmount = quote.totalAmount;
  const holdExpiresAt = heldSeats[0].holdExpiresAt;

  const booking = await Booking.create({
    bookingNumber: generateBookingNumber(),
    userId,
    rideId: ride._id,
    pickupLocationId: segment?.pickup.locationId || null,
    dropLocationId: segment?.drop.locationId || null,
    pickupName: segment?.pickup.name || null,
    dropName: segment?.drop.name || null,
    passengers,
    selectedSeats: heldSeatNumbers,
    passengerCount,
    amountPerSeat,
    totalAmount,
    seatFares: quote.lines,
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

  notificationService.notifyBookingCreated(booking).catch((err) => {
    logger.warn('notification.failed', { type: 'BOOKING_CREATED', message: err.message });
  });

  return Booking.findById(booking._id).populate({
    path: 'rideId',
    populate: [
      { path: 'routeId' },
      { path: 'vehicleId', select: 'vehicleType make model features registrationNumber capacity' },
      { path: 'driverId', select: 'name phone rating licenseNumber upiId qrCode paymentInstructions' },
    ],
  });
}

export async function listMine(userId, query = {}) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(query.limit) || 20));
  const filter = { userId };
  const [total, bookings, pendingPayments, upcoming] = await Promise.all([
    Booking.countDocuments(filter),
    Booking.find(filter)
      .populate({
        path: 'rideId',
        populate: { path: 'routeId' },
      })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Booking.countDocuments({ userId, bookingStatus: BOOKING_STATUS.PENDING }),
    Booking.countDocuments({
      userId,
      bookingStatus: { $in: [BOOKING_STATUS.PENDING, BOOKING_STATUS.CONFIRMED] },
    }),
  ]);
  return {
    bookings,
    total,
    page,
    limit,
    pages: Math.max(1, Math.ceil(total / limit)),
    counts: { total, pendingPayments, upcoming },
  };
}

export async function getById(bookingId, requester) {
  const booking = await Booking.findById(bookingId).populate({
    path: 'rideId',
    populate: [
      { path: 'routeId' },
      { path: 'vehicleId', select: 'vehicleType make model features registrationNumber capacity' },
      { path: 'driverId', select: 'name phone rating licenseNumber upiId qrCode paymentInstructions' },
    ],
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
      ride.status === RIDE_STATUS.BOARDING ||
      ride.status === RIDE_STATUS.ACTIVE)
  ) {
    throw new AppError('Booking cannot be cancelled after boarding has started', {
      code: ErrorCodes.BOOKING_NOT_CANCELLABLE,
      statusCode: 400,
    });
  }

  if (isAdmin) requireReason(reason);

  const percent = obligationPercent({
    departureTime: ride?.departureTime,
    rideStatus: ride?.status,
    rideCancelled: false,
  });
  applyObligation(booking, percent);

  booking.bookingStatus = BOOKING_STATUS.CANCELLED;
  booking.cancelledAt = new Date();
  booking.cancellationReason = reason || null;

  await releaseHold(booking.holdId);
  await releaseBookedSeats(booking._id);
  await Payment.updateMany(
    {
      bookingId: booking._id,
      status: { $in: [PAYMENT_STATUS.CREATED, PAYMENT_STATUS.PENDING] },
    },
    { $set: { status: PAYMENT_STATUS.FAILED } }
  );

  await booking.save();

  if (isAdmin) {
    await writeAudit({
      actorId: requester._id,
      actorRole: requester.role,
      action: 'BOOKING_CANCELLED',
      entityType: 'Booking',
      entityId: booking._id,
      oldValue: { bookingStatus: BOOKING_STATUS.PENDING },
      newValue: {
        bookingStatus: BOOKING_STATUS.CANCELLED,
        refundAmount: booking.refundAmount,
        refundStatus: booking.refundStatus,
      },
      reason: requireReason(reason),
    });
  }

  logger.info('booking.cancelled', {
    bookingId: booking._id.toString(),
    by: requester._id.toString(),
  });

  notificationService.notifyBookingCancelled(booking).catch((err) => {
    logger.warn('notification.failed', { type: 'BOOKING_CANCELLED', message: err.message });
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

export async function cancelBookingsForRide(ride, { reason, actor }) {
  const bookings = await Booking.find({
    rideId: ride._id,
    bookingStatus: { $in: [BOOKING_STATUS.PENDING, BOOKING_STATUS.CONFIRMED] },
  });

  for (const booking of bookings) {
    const paid = booking.bookingStatus === BOOKING_STATUS.CONFIRMED;
    booking.bookingStatus = BOOKING_STATUS.CANCELLED;
    booking.cancelledAt = new Date();
    booking.cancellationReason = reason || 'Ride cancelled';
    if (paid) {
      applyObligation(booking, obligationPercent({ rideCancelled: true }));
      await releaseBookedSeats(booking._id);
    } else {
      booking.refundAmount = 0;
      booking.refundStatus = REFUND_STATUS.NOT_APPLICABLE;
    }
    await releaseHold(booking.holdId);
    await booking.save();
    notificationService.notifyRideCancelled(booking).catch((err) => {
      logger.warn('notification.failed', { type: 'RIDE_CANCELLED', message: err.message });
    });
  }

  if (actor) {
    await writeAudit({
      actorId: actor._id,
      actorRole: actor.role,
      action: 'RIDE_CANCELLED',
      entityType: 'Ride',
      entityId: ride._id,
      newValue: { status: RIDE_STATUS.CANCELLED, bookings: bookings.length },
      reason: reason || null,
    });
  }

  return bookings;
}

export async function updateRefund(actor, bookingId, { refundStatus, refundReference, reason }) {
  const why = requireReason(reason);
  if (!Object.values(REFUND_STATUS).includes(refundStatus)) {
    throw new AppError('Invalid refund status', {
      code: ErrorCodes.VALIDATION_ERROR,
      statusCode: 400,
    });
  }
  const booking = await Booking.findById(bookingId);
  if (!booking) {
    throw new AppError('Booking not found', { code: ErrorCodes.BOOKING_NOT_FOUND, statusCode: 404 });
  }
  const oldValue = {
    refundStatus: booking.refundStatus,
    refundAmount: booking.refundAmount,
    refundReference: booking.refundReference,
  };
  booking.refundStatus = refundStatus;
  if (refundReference !== undefined) booking.refundReference = refundReference;
  if (refundStatus === REFUND_STATUS.COMPLETED || refundStatus === REFUND_STATUS.WAIVED || refundStatus === REFUND_STATUS.PARTIAL) {
    booking.refundProcessedAt = new Date();
    booking.refundProcessedBy = actor._id;
  }
  await booking.save();
  await writeAudit({
    actorId: actor._id,
    actorRole: actor.role,
    action: 'REFUND_STATUS_CHANGED',
    entityType: 'Booking',
    entityId: booking._id,
    oldValue,
    newValue: {
      refundStatus: booking.refundStatus,
      refundAmount: booking.refundAmount,
      refundReference: booking.refundReference,
    },
    reason: why,
  });
  notificationService.notifyRefundUpdated(booking).catch((err) => {
    logger.warn('notification.failed', { type: 'REFUND_STATUS_UPDATED', message: err.message });
  });
  return booking;
}

export async function listAllAdmin(filters = {}) {
  const query = {};
  if (filters.status) query.bookingStatus = filters.status;
  if (filters.userId) query.userId = filters.userId;
  if (filters.rideId) query.rideId = filters.rideId;
  if (filters.refundStatus) query.refundStatus = filters.refundStatus;
  if (filters.proofStatus) query.proofStatus = filters.proofStatus;

  const page = Math.max(1, Number(filters.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(filters.limit) || 10));
  const [total, bookings] = await Promise.all([
    Booking.countDocuments(query),
    Booking.find(query)
      .populate('userId', 'name email phone payoutUpi')
      .populate({ path: 'rideId', populate: [{ path: 'routeId' }, { path: 'driverId', select: 'name' }] })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
  ]);
  return { bookings, total, page, limit, pages: Math.max(1, Math.ceil(total / limit)) };
}
