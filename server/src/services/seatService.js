import { v4 as uuidv4 } from 'uuid';
import { Ride } from '../models/Ride.js';
import { Booking } from '../models/Booking.js';
import { config } from '../config/index.js';
import { BOOKING_STATUS, RIDE_STATUS, SEAT_STATUS } from '../constants/enums.js';
import { AppError } from '../utils/AppError.js';
import { ErrorCodes } from '../constants/errorCodes.js';
import { logger } from '../utils/logger.js';

export function recountAvailableSeats(seats) {
  return seats.filter((s) => s.status === SEAT_STATUS.AVAILABLE).length;
}

async function recountAndSave(rideId) {
  const ride = await Ride.findById(rideId);
  if (!ride) return null;
  ride.availableSeats = recountAvailableSeats(ride.seats);
  await ride.save();
  return ride;
}

/**
 * Atomically hold multiple seats with a shared holdId.
 * Uses query preconditions + arrayFilters so concurrent holds fail safely.
 */
export async function holdSeats(userId, rideId, seatNumbers) {
  const uniqueSeats = [...new Set(seatNumbers)];
  if (uniqueSeats.length === 0) {
    throw new AppError('At least one seat is required', {
      code: ErrorCodes.VALIDATION_ERROR,
      statusCode: 400,
    });
  }
  if (uniqueSeats.length !== seatNumbers.length) {
    throw new AppError('Duplicate seat numbers are not allowed', {
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

  const known = new Set(ride.seats.map((s) => s.seatNumber));
  for (const sn of uniqueSeats) {
    if (!known.has(sn)) {
      throw new AppError(`Seat ${sn} not found`, {
        code: ErrorCodes.SEAT_NOT_FOUND,
        statusCode: 404,
      });
    }
  }

  const holdId = uuidv4();
  const holdExpiresAt = new Date(Date.now() + config.holdDurationMinutes * 60 * 1000);

  const updated = await Ride.findOneAndUpdate(
    {
      _id: rideId,
      status: RIDE_STATUS.SCHEDULED,
      seats: {
        $all: uniqueSeats.map((seatNumber) => ({
          $elemMatch: { seatNumber, status: SEAT_STATUS.AVAILABLE },
        })),
      },
    },
    {
      $set: {
        'seats.$[s].status': SEAT_STATUS.HELD,
        'seats.$[s].holdId': holdId,
        'seats.$[s].holdExpiresAt': holdExpiresAt,
        'seats.$[s].holdUserId': userId,
      },
      $inc: { availableSeats: -uniqueSeats.length },
    },
    {
      new: true,
      arrayFilters: [
        {
          's.seatNumber': { $in: uniqueSeats },
          's.status': SEAT_STATUS.AVAILABLE,
        },
      ],
    }
  );

  if (!updated) {
    throw new AppError('Seat is no longer available', {
      code: ErrorCodes.SEAT_UNAVAILABLE,
      statusCode: 409,
    });
  }

  // Safety: ensure all requested seats were held under this holdId
  const held = updated.seats.filter((s) => s.holdId === holdId);
  if (held.length !== uniqueSeats.length) {
    await releaseHold(holdId);
    throw new AppError('Seat is no longer available', {
      code: ErrorCodes.SEAT_UNAVAILABLE,
      statusCode: 409,
    });
  }

  // Clamp availableSeats from recount to avoid drift
  const recounted = recountAvailableSeats(updated.seats);
  if (updated.availableSeats !== recounted) {
    updated.availableSeats = recounted;
    await updated.save();
  }

  logger.info('seat.held', {
    rideId: rideId.toString(),
    holdId,
    userId: userId.toString(),
    seats: uniqueSeats,
  });

  return {
    holdId,
    holdExpiresAt,
    rideId: updated._id.toString(),
    seats: held.map((s) => ({
      seatNumber: s.seatNumber,
      status: s.status,
      row: s.row,
      position: s.position,
    })),
  };
}

export async function releaseHold(holdId) {
  if (!holdId) return { released: 0 };

  const rides = await Ride.find({ 'seats.holdId': holdId, 'seats.status': SEAT_STATUS.HELD });
  let released = 0;

  for (const ride of rides) {
    let changed = 0;
    for (const seat of ride.seats) {
      if (seat.holdId === holdId && seat.status === SEAT_STATUS.HELD) {
        seat.status = SEAT_STATUS.AVAILABLE;
        seat.holdId = null;
        seat.holdExpiresAt = null;
        seat.holdUserId = null;
        seat.bookingId = null;
        changed += 1;
      }
    }
    if (changed > 0) {
      ride.availableSeats = recountAvailableSeats(ride.seats);
      await ride.save();
      released += changed;
    }
  }

  if (released > 0) {
    logger.info('seat.released', { holdId, released });
  }
  return { released };
}

export async function releaseExpiredHolds() {
  const now = new Date();
  const rides = await Ride.find({
    seats: {
      $elemMatch: {
        status: SEAT_STATUS.HELD,
        holdExpiresAt: { $lte: now },
      },
    },
  });

  let seatsReleased = 0;
  const expiredHoldIds = new Set();

  for (const ride of rides) {
    let changed = 0;
    for (const seat of ride.seats) {
      if (
        seat.status === SEAT_STATUS.HELD &&
        seat.holdExpiresAt &&
        seat.holdExpiresAt <= now
      ) {
        if (seat.holdId) expiredHoldIds.add(seat.holdId);
        seat.status = SEAT_STATUS.AVAILABLE;
        seat.holdId = null;
        seat.holdExpiresAt = null;
        seat.holdUserId = null;
        seat.bookingId = null;
        changed += 1;
      }
    }
    if (changed > 0) {
      ride.availableSeats = recountAvailableSeats(ride.seats);
      await ride.save();
      seatsReleased += changed;
    }
  }

  if (expiredHoldIds.size > 0) {
    await Booking.updateMany(
      {
        holdId: { $in: [...expiredHoldIds] },
        bookingStatus: BOOKING_STATUS.PENDING,
      },
      {
        $set: { bookingStatus: BOOKING_STATUS.EXPIRED },
      }
    );
  }

  if (seatsReleased > 0) {
    logger.info('seat.expired_released', {
      seatsReleased,
      holds: expiredHoldIds.size,
    });
  }

  return { seatsReleased, holdsExpired: expiredHoldIds.size };
}

export async function confirmSeatsBooked(holdId, bookingId, userId) {
  if (!holdId) {
    throw new AppError('Invalid seat hold', {
      code: ErrorCodes.SEAT_HOLD_INVALID,
      statusCode: 400,
    });
  }

  const ride = await Ride.findOne({ 'seats.holdId': holdId });
  if (!ride) {
    throw new AppError('Seat hold not found or expired', {
      code: ErrorCodes.SEAT_HOLD_INVALID,
      statusCode: 400,
    });
  }

  const heldSeats = ride.seats.filter((s) => s.holdId === holdId);
  if (heldSeats.length === 0) {
    // Idempotent: already booked under this booking?
    const already = ride.seats.filter(
      (s) => s.bookingId && s.bookingId.toString() === bookingId.toString()
    );
    if (already.length > 0) {
      return ride;
    }
    throw new AppError('Seat hold not found or expired', {
      code: ErrorCodes.SEAT_HOLD_INVALID,
      statusCode: 400,
    });
  }

  const now = new Date();
  for (const seat of heldSeats) {
    if (seat.status !== SEAT_STATUS.HELD) {
      throw new AppError('Seat hold is invalid', {
        code: ErrorCodes.SEAT_HOLD_INVALID,
        statusCode: 400,
      });
    }
    if (seat.holdExpiresAt && seat.holdExpiresAt < now) {
      throw new AppError('Seat hold has expired', {
        code: ErrorCodes.SEAT_HOLD_EXPIRED,
        statusCode: 400,
      });
    }
    if (userId && seat.holdUserId && seat.holdUserId.toString() !== userId.toString()) {
      throw new AppError('Seat hold does not belong to this user', {
        code: ErrorCodes.SEAT_HOLD_INVALID,
        statusCode: 403,
      });
    }
  }

  const updated = await Ride.findOneAndUpdate(
    {
      _id: ride._id,
      seats: {
        $all: heldSeats.map((s) => ({
          $elemMatch: {
            seatNumber: s.seatNumber,
            holdId,
            status: SEAT_STATUS.HELD,
          },
        })),
      },
    },
    {
      $set: {
        'seats.$[s].status': SEAT_STATUS.BOOKED,
        'seats.$[s].bookingId': bookingId,
        'seats.$[s].holdId': null,
        'seats.$[s].holdExpiresAt': null,
        'seats.$[s].holdUserId': null,
      },
    },
    {
      new: true,
      arrayFilters: [{ 's.holdId': holdId, 's.status': SEAT_STATUS.HELD }],
    }
  );

  if (!updated) {
    throw new AppError('Failed to confirm seats', {
      code: ErrorCodes.SEAT_HOLD_INVALID,
      statusCode: 400,
    });
  }

  updated.availableSeats = recountAvailableSeats(updated.seats);
  await updated.save();

  logger.info('seat.booked', {
    rideId: updated._id.toString(),
    holdId,
    bookingId: bookingId.toString(),
  });

  return updated;
}

export async function releaseBookedSeats(bookingId) {
  const rides = await Ride.find({ 'seats.bookingId': bookingId });
  let released = 0;

  for (const ride of rides) {
    let changed = 0;
    for (const seat of ride.seats) {
      if (seat.bookingId && seat.bookingId.toString() === bookingId.toString()) {
        seat.status = SEAT_STATUS.AVAILABLE;
        seat.bookingId = null;
        seat.holdId = null;
        seat.holdExpiresAt = null;
        seat.holdUserId = null;
        changed += 1;
      }
    }
    if (changed > 0) {
      ride.availableSeats = recountAvailableSeats(ride.seats);
      await ride.save();
      released += changed;
    }
  }

  return { released };
}

export { recountAndSave };
