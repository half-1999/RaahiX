import { Driver } from '../models/Driver.js';
import { Ride } from '../models/Ride.js';
import { Booking } from '../models/Booking.js';
import { Vehicle } from '../models/Vehicle.js';
import { Route } from '../models/Route.js';
import {
  BOOKING_STATUS,
  DRIVER_STATUS,
  DRIVER_VERIFICATION,
  RIDE_STATUS,
  SEAT_STATUS,
  VEHICLE_STATUS,
} from '../constants/enums.js';
import { legsFromStops, stopsFromRoute } from './segmentService.js';
import { AppError } from '../utils/AppError.js';
import { ErrorCodes } from '../constants/errorCodes.js';
import { logger } from '../utils/logger.js';

const ALLOWED_TRANSITIONS = {
  [RIDE_STATUS.DRAFT]: [RIDE_STATUS.PUBLISHED, RIDE_STATUS.CANCELLED],
  [RIDE_STATUS.PUBLISHED]: [RIDE_STATUS.ACTIVE, RIDE_STATUS.CANCELLED],
  [RIDE_STATUS.ACTIVE]: [RIDE_STATUS.COMPLETED, RIDE_STATUS.CANCELLED],
  [RIDE_STATUS.SCHEDULED]: [RIDE_STATUS.BOARDING, RIDE_STATUS.ACTIVE, RIDE_STATUS.CANCELLED],
  [RIDE_STATUS.BOARDING]: [RIDE_STATUS.STARTED, RIDE_STATUS.ACTIVE, RIDE_STATUS.CANCELLED],
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

  if (status === RIDE_STATUS.PUBLISHED) {
    const driver = await resolveDriverProfile(userId);
    assertDriverCanPublish(driver);
  }
  if (!allowed.includes(status)) {
    throw new AppError(`Cannot transition from ${ride.status} to ${status}`, {
      code: ErrorCodes.VALIDATION_ERROR,
      statusCode: 400,
    });
  }

  ride.status = status;
  await ride.save();

  if (status === RIDE_STATUS.CANCELLED) {
    const { cancelBookingsForRide } = await import('./bookingService.js');
    await cancelBookingsForRide(ride, { reason: 'Driver cancelled the ride' });
  }

  if (status === RIDE_STATUS.PUBLISHED) {
    const driver = await resolveDriverProfile(userId);
    const { notifyUpcomingRide } = await import('./notificationService.js');
    notifyUpcomingRide(driver.userId, ride).catch(() => {});
  }

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

function assertDriverCanPublish(driver) {
  if (driver.verificationStatus !== DRIVER_VERIFICATION.VERIFIED) {
    throw new AppError('Only verified drivers can publish rides', {
      code: ErrorCodes.DRIVER_NOT_VERIFIED,
      statusCode: 403,
    });
  }
  if (driver.status !== DRIVER_STATUS.ACTIVE) {
    throw new AppError('Suspended drivers cannot publish rides', {
      code: ErrorCodes.DRIVER_SUSPENDED,
      statusCode: 403,
    });
  }
}

function buildSeats(seatConfiguration) {
  return seatConfiguration.map((seat) => ({
    seatNumber: seat.seatNumber,
    row: seat.row,
    position: seat.position,
    status: SEAT_STATUS.AVAILABLE,
    holdId: null,
    holdExpiresAt: null,
    holdUserId: null,
    bookingId: null,
  }));
}

function committedSeats(ride) {
  return ride.seats.filter(
    (seat) => seat.status === SEAT_STATUS.HELD || seat.status === SEAT_STATUS.BOOKED
  ).length;
}

export async function createRide(userId, payload) {
  const driver = await resolveDriverProfile(userId);
  assertDriverCanPublish(driver);

  const vehicle = await Vehicle.findById(payload.vehicleId);
  if (!vehicle || vehicle.driverId.toString() !== driver._id.toString()) {
    throw new AppError('Choose one of your own vehicles', {
      code: ErrorCodes.VEHICLE_NOT_FOUND,
      statusCode: 404,
    });
  }
  if (vehicle.status !== VEHICLE_STATUS.ACTIVE) {
    throw new AppError('Vehicle must be active', {
      code: ErrorCodes.VALIDATION_ERROR,
      statusCode: 400,
    });
  }

  const route = await Route.findById(payload.routeId);
  if (!route) {
    throw new AppError('Route not found', { code: ErrorCodes.ROUTE_NOT_FOUND, statusCode: 404 });
  }

  const capacity = payload.capacity || vehicle.capacity;
  if (capacity > vehicle.capacity) {
    throw new AppError('Ride capacity cannot exceed vehicle capacity', {
      code: ErrorCodes.RIDE_CAPACITY_INVALID,
      statusCode: 400,
    });
  }

  const departureTime = new Date(payload.departureTime);
  const arrivalTime = new Date(payload.arrivalTime);
  const seats = buildSeats(vehicle.seatConfiguration.slice(0, capacity));
  const ride = await Ride.create({
    routeId: route._id,
    driverId: driver._id,
    vehicleId: vehicle._id,
    date: new Date(
      Date.UTC(departureTime.getUTCFullYear(), departureTime.getUTCMonth(), departureTime.getUTCDate())
    ),
    departureTime,
    arrivalTime,
    pickupPoint: payload.pickupPoint || payload.pickupPoints?.[0] || route.origin?.city || 'Pickup',
    dropPoint: payload.dropPoint || payload.dropPoints?.[0] || route.destination?.city || 'Drop',
    pickupPoints: [...new Set([payload.pickupPoint, ...(payload.pickupPoints || [])].filter(Boolean))].slice(0, 2),
    dropPoints: [...new Set([payload.dropPoint, ...(payload.dropPoints || [])].filter(Boolean))].slice(0, 2),
    rideStops: stopsFromRoute(route),
    legs: legsFromStops(stopsFromRoute(route), seats.length),
    pricePerSeat: payload.pricePerSeat,
    frontSeatPrice: payload.frontSeatPrice ?? null,
    totalSeats: seats.length,
    availableSeats: seats.length,
    seats,
    status: RIDE_STATUS.DRAFT,
  });

  logger.info('ride.draft_created', { rideId: ride._id.toString(), driverId: driver._id.toString() });
  return ride;
}

const EDITABLE_RIDE_STATUSES = new Set([
  RIDE_STATUS.DRAFT,
  RIDE_STATUS.PUBLISHED,
  RIDE_STATUS.SCHEDULED,
]);

export async function updateRide(userId, rideId, payload) {
  const ride = await getRide(userId, rideId);
  if (!EDITABLE_RIDE_STATUSES.has(ride.status)) {
    throw new AppError('This ride can no longer be edited', {
      code: ErrorCodes.VALIDATION_ERROR,
      statusCode: 409,
    });
  }

  if (payload.departureTime) ride.departureTime = new Date(payload.departureTime);
  if (payload.arrivalTime) ride.arrivalTime = new Date(payload.arrivalTime);
  if (payload.pickupPoint) ride.pickupPoint = payload.pickupPoint.trim();
  if (payload.dropPoint) ride.dropPoint = payload.dropPoint.trim();
  if (payload.pricePerSeat != null) ride.pricePerSeat = Number(payload.pricePerSeat);
  if (payload.frontSeatPrice !== undefined) {
    ride.frontSeatPrice = payload.frontSeatPrice === null ? null : Number(payload.frontSeatPrice);
  }
  if (payload.pickupPoints) ride.pickupPoints = payload.pickupPoints.slice(0, 2);
  if (payload.dropPoints) ride.dropPoints = payload.dropPoints.slice(0, 2);
  if (!(ride.arrivalTime > ride.departureTime)) {
    throw new AppError('Arrival must be after departure', {
      code: ErrorCodes.VALIDATION_ERROR,
      statusCode: 400,
    });
  }
  ride.date = new Date(
    Date.UTC(
      ride.departureTime.getUTCFullYear(),
      ride.departureTime.getUTCMonth(),
      ride.departureTime.getUTCDate()
    )
  );
  await ride.save();
  return ride;
}

export async function updateCapacity(userId, rideId, capacity) {
  const ride = await getRide(userId, rideId);
  if ([RIDE_STATUS.COMPLETED, RIDE_STATUS.CANCELLED].includes(ride.status)) {
    throw new AppError(`Cannot change capacity of a ${ride.status} ride`, {
      code: ErrorCodes.VALIDATION_ERROR,
      statusCode: 400,
    });
  }

  const vehicle = await Vehicle.findById(ride.vehicleId);
  if (!vehicle || capacity > vehicle.capacity) {
    throw new AppError('Ride capacity cannot exceed vehicle capacity', {
      code: ErrorCodes.RIDE_CAPACITY_INVALID,
      statusCode: 400,
    });
  }

  const legCommitted = (ride.legs || []).reduce((max, leg) => Math.max(max, leg.committed || 0), 0);
  if (capacity < committedSeats(ride) || capacity < legCommitted) {
    throw new AppError('Ride capacity cannot drop below seats already committed', {
      code: ErrorCodes.RIDE_CAPACITY_INVALID,
      statusCode: 400,
    });
  }
  if (ride.legs?.length) {
    ride.legs.forEach((leg) => {
      leg.capacity = capacity;
    });
  }

  if (capacity < ride.seats.length) {
    const available = ride.seats.filter((seat) => seat.status === SEAT_STATUS.AVAILABLE);
    const removeCount = ride.seats.length - capacity;
    if (available.length < removeCount) {
      throw new AppError('Ride capacity cannot drop below seats already committed', {
        code: ErrorCodes.RIDE_CAPACITY_INVALID,
        statusCode: 400,
      });
    }
    const remove = new Set(available.slice(-removeCount).map((seat) => seat.seatNumber));
    ride.seats = ride.seats.filter((seat) => !remove.has(seat.seatNumber));
  }

  ride.totalSeats = ride.seats.length;
  ride.availableSeats = ride.seats.filter((seat) => seat.status === SEAT_STATUS.AVAILABLE).length;
  await ride.save();
  return ride;
}
