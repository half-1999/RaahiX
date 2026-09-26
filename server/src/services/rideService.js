import { Ride } from '../models/Ride.js';
import { Route } from '../models/Route.js';
import { Driver } from '../models/Driver.js';
import { Vehicle } from '../models/Vehicle.js';
import { Booking } from '../models/Booking.js';
import {
  BOOKING_PAYMENT_STATUS,
  BOOKING_STATUS,
  DRIVER_STATUS,
  RIDE_STATUS,
  SEAT_STATUS,
  VEHICLE_STATUS,
} from '../constants/enums.js';
import { AppError } from '../utils/AppError.js';
import { ErrorCodes } from '../constants/errorCodes.js';
import { logger } from '../utils/logger.js';
import { config } from '../config/index.js';
import { writeAudit } from './auditService.js';
import { releaseHold, releaseBookedSeats, recountAvailableSeats } from './seatService.js';

function initSeatsFromVehicle(vehicle) {
  return vehicle.seatConfiguration.map((cfg) => ({
    seatNumber: cfg.seatNumber,
    row: cfg.row,
    position: cfg.position,
    status: SEAT_STATUS.AVAILABLE,
    holdId: null,
    holdExpiresAt: null,
    holdUserId: null,
    bookingId: null,
  }));
}

function startOfDay(dateStr) {
  const d = new Date(dateStr);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function endOfDay(dateStr) {
  const d = new Date(dateStr);
  d.setUTCHours(23, 59, 59, 999);
  return d;
}

async function validateAssignment(driverId, vehicleId, routeId) {
  const [driver, vehicle, route] = await Promise.all([
    Driver.findById(driverId),
    Vehicle.findById(vehicleId),
    Route.findById(routeId),
  ]);

  if (!driver) {
    throw new AppError('Driver not found', { code: ErrorCodes.DRIVER_NOT_FOUND, statusCode: 404 });
  }
  if (driver.status !== DRIVER_STATUS.ACTIVE) {
    throw new AppError('Driver must be ACTIVE', {
      code: ErrorCodes.VALIDATION_ERROR,
      statusCode: 400,
    });
  }
  if (!vehicle) {
    throw new AppError('Vehicle not found', { code: ErrorCodes.VEHICLE_NOT_FOUND, statusCode: 404 });
  }
  if (vehicle.status !== VEHICLE_STATUS.ACTIVE) {
    throw new AppError('Vehicle must be ACTIVE', {
      code: ErrorCodes.VALIDATION_ERROR,
      statusCode: 400,
    });
  }
  if (!route) {
    throw new AppError('Route not found', { code: ErrorCodes.ROUTE_NOT_FOUND, statusCode: 404 });
  }
  if (vehicle.capacity !== vehicle.seatConfiguration.length) {
    throw new AppError('Vehicle capacity must match seat configuration', {
      code: ErrorCodes.CONFLICT,
      statusCode: 409,
    });
  }

  return { driver, vehicle, route };
}

function toRideSummary(ride) {
  const route = ride.routeId;
  const vehicle = ride.vehicleId;
  return {
    id: ride._id.toString(),
    date: ride.date,
    departureTime: ride.departureTime,
    arrivalTime: ride.arrivalTime,
    pickupPoint: ride.pickupPoint,
    dropPoint: ride.dropPoint,
    pricePerSeat: ride.pricePerSeat,
    availableSeats: ride.availableSeats,
    totalSeats: ride.totalSeats,
    status: ride.status,
    route: route
      ? {
          id: route._id?.toString?.() || route.toString(),
          origin: route.origin,
          destination: route.destination,
          estimatedDuration: route.estimatedDuration,
        }
      : undefined,
    vehicleType: vehicle?.vehicleType,
  };
}

export async function createRide(payload, actor) {
  const {
    routeId,
    driverId,
    vehicleId,
    date,
    departureTime,
    arrivalTime,
    pickupPoint,
    dropPoint,
    pricePerSeat,
  } = payload;

  const { driver, vehicle, route } = await validateAssignment(driverId, vehicleId, routeId);
  const seats = initSeatsFromVehicle(vehicle);

  const ride = await Ride.create({
    routeId: route._id,
    driverId: driver._id,
    vehicleId: vehicle._id,
    date: startOfDay(date),
    departureTime: new Date(departureTime),
    arrivalTime: new Date(arrivalTime),
    pickupPoint,
    dropPoint,
    pricePerSeat,
    totalSeats: vehicle.capacity,
    availableSeats: seats.length,
    seats,
    status: RIDE_STATUS.SCHEDULED,
  });

  await writeAudit({
    actorId: actor._id,
    actorRole: actor.role,
    action: 'RIDE_CREATED',
    entityType: 'Ride',
    entityId: ride._id,
    newValue: {
      routeId: route._id,
      driverId: driver._id,
      vehicleId: vehicle._id,
      departureTime: ride.departureTime,
      pricePerSeat,
    },
  });

  logger.info('ride.created', { rideId: ride._id.toString() });
  return ride;
}

export async function updateRide(rideId, updates, actor) {
  const ride = await Ride.findById(rideId);
  if (!ride) {
    throw new AppError('Ride not found', { code: ErrorCodes.RIDE_NOT_FOUND, statusCode: 404 });
  }

  const oldValue = {
    driverId: ride.driverId,
    vehicleId: ride.vehicleId,
    pickupPoint: ride.pickupPoint,
    dropPoint: ride.dropPoint,
    pricePerSeat: ride.pricePerSeat,
    departureTime: ride.departureTime,
    arrivalTime: ride.arrivalTime,
    status: ride.status,
  };

  if (updates.status === RIDE_STATUS.CANCELLED) {
    return cancelRide(rideId, actor, updates.reason);
  }

  if (updates.driverId || updates.vehicleId) {
    const driverId = updates.driverId || ride.driverId;
    const vehicleId = updates.vehicleId || ride.vehicleId;
    await validateAssignment(driverId, vehicleId, ride.routeId);
  }

  const allowed = [
    'pickupPoint',
    'dropPoint',
    'pricePerSeat',
    'departureTime',
    'arrivalTime',
    'date',
    'driverId',
    'vehicleId',
  ];

  for (const key of allowed) {
    if (updates[key] !== undefined) {
      if (key === 'date') ride.date = startOfDay(updates.date);
      else if (key === 'departureTime' || key === 'arrivalTime') ride[key] = new Date(updates[key]);
      else ride[key] = updates[key];
    }
  }

  // If vehicle changed and no bookings, re-init seats
  if (updates.vehicleId && updates.vehicleId.toString() !== oldValue.vehicleId.toString()) {
    const bookingCount = await Booking.countDocuments({
      rideId: ride._id,
      bookingStatus: { $in: [BOOKING_STATUS.PENDING, BOOKING_STATUS.CONFIRMED] },
    });
    if (bookingCount > 0) {
      throw new AppError('Cannot change vehicle while bookings exist', {
        code: ErrorCodes.CONFLICT,
        statusCode: 409,
      });
    }
    const vehicle = await Vehicle.findById(updates.vehicleId);
    ride.seats = initSeatsFromVehicle(vehicle);
    ride.totalSeats = vehicle.capacity;
    ride.availableSeats = recountAvailableSeats(ride.seats);
  }

  await ride.save();

  const action =
    updates.driverId && updates.driverId.toString() !== oldValue.driverId.toString()
      ? 'RIDE_DRIVER_CHANGED'
      : 'RIDE_UPDATED';

  await writeAudit({
    actorId: actor._id,
    actorRole: actor.role,
    action,
    entityType: 'Ride',
    entityId: ride._id,
    oldValue,
    newValue: {
      driverId: ride.driverId,
      vehicleId: ride.vehicleId,
      pickupPoint: ride.pickupPoint,
      dropPoint: ride.dropPoint,
      pricePerSeat: ride.pricePerSeat,
      departureTime: ride.departureTime,
      arrivalTime: ride.arrivalTime,
      status: ride.status,
    },
  });

  logger.info('ride.updated', { rideId: ride._id.toString() });
  return ride;
}

export async function cancelRide(rideId, actor, reason) {
  const ride = await Ride.findById(rideId);
  if (!ride) {
    throw new AppError('Ride not found', { code: ErrorCodes.RIDE_NOT_FOUND, statusCode: 404 });
  }
  if (ride.status === RIDE_STATUS.CANCELLED) {
    return ride;
  }
  if (ride.status === RIDE_STATUS.COMPLETED || ride.status === RIDE_STATUS.STARTED) {
    throw new AppError('Cannot cancel a started or completed ride', {
      code: ErrorCodes.VALIDATION_ERROR,
      statusCode: 400,
    });
  }

  const oldStatus = ride.status;
  ride.status = RIDE_STATUS.CANCELLED;
  await ride.save();

  const bookings = await Booking.find({
    rideId: ride._id,
    bookingStatus: { $in: [BOOKING_STATUS.PENDING, BOOKING_STATUS.CONFIRMED] },
  });

  for (const booking of bookings) {
    const wasPaid = booking.paymentStatus === BOOKING_PAYMENT_STATUS.PAID;
    booking.bookingStatus = BOOKING_STATUS.CANCELLED;
    booking.cancelledAt = new Date();
    booking.cancellationReason = reason || 'Ride cancelled by admin';
    if (wasPaid) {
      booking.paymentStatus = BOOKING_PAYMENT_STATUS.REFUNDED;
      await releaseBookedSeats(booking._id);
    } else {
      await releaseHold(booking.holdId);
    }
    await booking.save();
  }

  // Release any remaining holds on the ride
  for (const seat of ride.seats) {
    if (seat.status === SEAT_STATUS.HELD) {
      await releaseHold(seat.holdId);
    }
  }

  await writeAudit({
    actorId: actor._id,
    actorRole: actor.role,
    action: 'RIDE_CANCELLED',
    entityType: 'Ride',
    entityId: ride._id,
    oldValue: { status: oldStatus },
    newValue: { status: RIDE_STATUS.CANCELLED, reason },
  });

  logger.info('ride.cancelled', { rideId: ride._id.toString() });
  return Ride.findById(rideId);
}

export async function search({ originCity, destinationCity, date, passengers = 1 }) {
  if (!originCity || !destinationCity || !date) {
    throw new AppError('originCity, destinationCity and date are required', {
      code: ErrorCodes.VALIDATION_ERROR,
      statusCode: 400,
    });
  }

  const pax = Math.max(1, Number(passengers) || 1);
  const routes = await Route.find({
    'origin.city': new RegExp(`^${escapeRegex(originCity)}$`, 'i'),
    'destination.city': new RegExp(`^${escapeRegex(destinationCity)}$`, 'i'),
    status: 'ACTIVE',
  }).select('_id');

  const routeIds = routes.map((r) => r._id);
  if (routeIds.length === 0) {
    return { rides: [] };
  }

  const now = new Date();
  const dayStart = startOfDay(date);
  const dayEnd = endOfDay(date);
  // Filter by departureTime calendar day (UTC) — avoid timezone skew on separate `date` field
  const rides = await Ride.find({
    routeId: { $in: routeIds },
    status: RIDE_STATUS.SCHEDULED,
    availableSeats: { $gte: pax },
    departureTime: { $gt: now, $gte: dayStart, $lte: dayEnd },
  })
    .populate('routeId')
    .populate('vehicleId', 'vehicleType make model')
    .sort({ departureTime: 1 })
    .lean();

  return { rides: rides.map(toRideSummary) };
}

function escapeRegex(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function getRide(rideId) {
  const ride = await Ride.findById(rideId)
    .populate('routeId')
    .populate({
      path: 'driverId',
      select: 'name phone rating totalTrips status',
    })
    .populate('vehicleId', 'vehicleType make model capacity features registrationNumber status');

  if (!ride) {
    throw new AppError('Ride not found', { code: ErrorCodes.RIDE_NOT_FOUND, statusCode: 404 });
  }

  return {
    id: ride._id.toString(),
    date: ride.date,
    departureTime: ride.departureTime,
    arrivalTime: ride.arrivalTime,
    pickupPoint: ride.pickupPoint,
    dropPoint: ride.dropPoint,
    pricePerSeat: ride.pricePerSeat,
    availableSeats: ride.availableSeats,
    totalSeats: ride.totalSeats,
    status: ride.status,
    route: ride.routeId,
    driver: ride.driverId
      ? {
          id: ride.driverId._id.toString(),
          name: ride.driverId.name,
          phone: ride.driverId.phone,
          rating: ride.driverId.rating,
          totalTrips: ride.driverId.totalTrips,
        }
      : null,
    vehicle: ride.vehicleId,
  };
}

export async function getSeats(rideId) {
  const ride = await Ride.findById(rideId).select('seats status');
  if (!ride) {
    throw new AppError('Ride not found', { code: ErrorCodes.RIDE_NOT_FOUND, statusCode: 404 });
  }

  const seats = ride.seats.map((s) => ({
    seatNumber: s.seatNumber,
    status: s.status === SEAT_STATUS.HELD ? SEAT_STATUS.HELD : s.status,
    row: s.row,
    position: s.position,
    // do not expose hold owner
  }));

  return { seats, holdMinutes: config.holdDurationMinutes };
}

export async function listRidesAdmin(filters = {}) {
  const query = {};
  if (filters.status) query.status = filters.status;
  if (filters.routeId) query.routeId = filters.routeId;
  if (filters.date) {
    query.date = { $gte: startOfDay(filters.date), $lte: endOfDay(filters.date) };
  }

  const rides = await Ride.find(query)
    .populate('routeId')
    .populate('driverId', 'name phone')
    .populate('vehicleId', 'registrationNumber vehicleType')
    .sort({ departureTime: -1 })
    .lean();

  return { rides };
}

export async function getRideAdmin(rideId) {
  const ride = await Ride.findById(rideId)
    .populate('routeId')
    .populate('driverId')
    .populate('vehicleId');
  if (!ride) {
    throw new AppError('Ride not found', { code: ErrorCodes.RIDE_NOT_FOUND, statusCode: 404 });
  }
  return ride;
}
