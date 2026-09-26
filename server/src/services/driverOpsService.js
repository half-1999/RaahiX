import { Driver } from '../models/Driver.js';
import { Ride } from '../models/Ride.js';
import { Booking } from '../models/Booking.js';
import { BOOKING_STATUS, RIDE_STATUS } from '../constants/enums.js';
import { AppError } from '../utils/AppError.js';
import { ErrorCodes } from '../constants/errorCodes.js';
import { logger } from '../utils/logger.js';

const ALLOWED_TRANSITIONS = {
  [RIDE_STATUS.SCHEDULED]: [RIDE_STATUS.BOARDING, RIDE_STATUS.CANCELLED],
  [RIDE_STATUS.BOARDING]: [RIDE_STATUS.STARTED, RIDE_STATUS.CANCELLED],
  [RIDE_STATUS.STARTED]: [RIDE_STATUS.COMPLETED],
  [RIDE_STATUS.COMPLETED]: [],
  [RIDE_STATUS.CANCELLED]: [],
};

async function resolveDriverProfile(userId) {
  const driver = await Driver.findOne({ userId });
  if (!driver) {
    throw new AppError('Driver profile not found', {
      code: ErrorCodes.DRIVER_NOT_FOUND,
      statusCode: 404,
    });
  }
  return driver;
}

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfToday() {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}

function startOfDay(dateStr) {
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(dateStr) {
  const d = new Date(dateStr);
  d.setHours(23, 59, 59, 999);
  return d;
}

export async function dashboard(userId) {
  const driver = await resolveDriverProfile(userId);
  const from = startOfToday();
  const to = endOfToday();

  const [todayRides, upcomingCount, completedToday] = await Promise.all([
    Ride.countDocuments({
      driverId: driver._id,
      departureTime: { $gte: from, $lte: to },
      status: { $ne: RIDE_STATUS.CANCELLED },
    }),
    Ride.countDocuments({
      driverId: driver._id,
      status: RIDE_STATUS.SCHEDULED,
      departureTime: { $gt: new Date() },
    }),
    Ride.countDocuments({
      driverId: driver._id,
      status: RIDE_STATUS.COMPLETED,
      updatedAt: { $gte: from, $lte: to },
    }),
  ]);

  return { todayRides, upcomingCount, completedToday };
}

export async function listRides(userId, { date, status } = {}) {
  const driver = await resolveDriverProfile(userId);
  const query = { driverId: driver._id };
  if (status) query.status = status;
  if (date) {
    query.departureTime = { $gte: startOfDay(date), $lte: endOfDay(date) };
  }

  const rides = await Ride.find(query)
    .populate('routeId')
    .populate('vehicleId', 'registrationNumber vehicleType')
    .sort({ departureTime: 1 });

  return { rides };
}

export async function getRide(userId, rideId) {
  const driver = await resolveDriverProfile(userId);
  const ride = await Ride.findById(rideId)
    .populate('routeId')
    .populate('vehicleId');

  if (!ride) {
    throw new AppError('Ride not found', { code: ErrorCodes.RIDE_NOT_FOUND, statusCode: 404 });
  }
  if (ride.driverId.toString() !== driver._id.toString()) {
    throw new AppError('You are not assigned to this ride', {
      code: ErrorCodes.AUTH_FORBIDDEN,
      statusCode: 403,
    });
  }
  return ride;
}

export async function getPassengers(userId, rideId) {
  const ride = await getRide(userId, rideId);

  const bookings = await Booking.find({
    rideId: ride._id,
    bookingStatus: BOOKING_STATUS.CONFIRMED,
  }).select('bookingNumber passengers selectedSeats');

  const passengers = [];
  for (const booking of bookings) {
    for (const p of booking.passengers) {
      passengers.push({
        name: p.name,
        phone: p.phone,
        seatNumber: p.seatNumber,
        bookingNumber: booking.bookingNumber,
      });
    }
  }

  return {
    passengers,
    seats: ride.seats.map((s) => ({
      seatNumber: s.seatNumber,
      status: s.status,
      row: s.row,
      position: s.position,
    })),
  };
}

export async function updateStatus(userId, rideId, status) {
  const ride = await getRide(userId, rideId);
  const allowed = ALLOWED_TRANSITIONS[ride.status] || [];

  // Drivers may advance BOARDING → STARTED → COMPLETED (and SCHEDULED → BOARDING)
  const driverAllowed = [
    RIDE_STATUS.BOARDING,
    RIDE_STATUS.STARTED,
    RIDE_STATUS.COMPLETED,
  ];
  if (!driverAllowed.includes(status)) {
    throw new AppError('Invalid status for driver update', {
      code: ErrorCodes.VALIDATION_ERROR,
      statusCode: 400,
    });
  }
  if (!allowed.includes(status)) {
    throw new AppError(`Cannot transition from ${ride.status} to ${status}`, {
      code: ErrorCodes.VALIDATION_ERROR,
      statusCode: 400,
    });
  }

  ride.status = status;
  await ride.save();

  if (status === RIDE_STATUS.COMPLETED) {
    const driver = await resolveDriverProfile(userId);
    driver.totalTrips = (driver.totalTrips || 0) + 1;
    await driver.save();
  }

  logger.info('ride.status_updated', {
    rideId: ride._id.toString(),
    status,
    driverUserId: userId.toString(),
  });

  return ride;
}
