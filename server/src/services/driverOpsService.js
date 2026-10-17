import { Driver } from '../models/Driver.js';
import { Ride } from '../models/Ride.js';
import { Booking } from '../models/Booking.js';
import { Vehicle } from '../models/Vehicle.js';
import { Route } from '../models/Route.js';
import { Location } from '../models/Location.js';
import { RidePassenger } from '../models/RidePassenger.js';
import {
  BOOKING_PAYMENT_STATUS,
  BOOKING_STATUS,
  DRIVER_STATUS,
  DRIVER_VERIFICATION,
  GUEST_PAYMENT_STATUS,
  PROOF_STATUS,
  RIDE_STATUS,
  RIDE_STATUS_CHANGE_SOURCE,
  ROUTE_STATUS,
  SEAT_STATUS,
  VEHICLE_STATUS,
} from '../constants/enums.js';
import { legsFromStops, stopsFromRoute } from './segmentService.js';
import { transitionRide } from './rideLifecycleService.js';
import { resolveLocation } from './locationService.js';
import { attachFinanceToRides } from './rideFinanceService.js';
import { AppError } from '../utils/AppError.js';
import { ErrorCodes } from '../constants/errorCodes.js';
import { logger } from '../utils/logger.js';

const ALLOWED_TRANSITIONS = {
  [RIDE_STATUS.SCHEDULED]: [RIDE_STATUS.ACTIVE, RIDE_STATUS.COMPLETED],
  [RIDE_STATUS.ACTIVE]: [RIDE_STATUS.COMPLETED],
  [RIDE_STATUS.COMPLETED]: [],
};

const STATUS_SORT_RANK = {
  [RIDE_STATUS.ACTIVE]: 0,
  [RIDE_STATUS.SCHEDULED]: 1,
  [RIDE_STATUS.COMPLETED]: 2,
};

const notVoided = { voidedAt: null };

function sortRidesActiveFirst(rides) {
  return [...rides].sort((a, b) => {
    const ra = STATUS_SORT_RANK[a.status] ?? 5;
    const rb = STATUS_SORT_RANK[b.status] ?? 5;
    if (ra !== rb) return ra - rb;
    const ta = new Date(a.departureTime).getTime() || 0;
    const tb = new Date(b.departureTime).getTime() || 0;
    if (ta !== tb) return ta - tb;
    return String(a._id).localeCompare(String(b._id));
  });
}

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

function startOfDay(dateInput = new Date()) {
  const d = dateInput instanceof Date ? new Date(dateInput) : new Date(dateInput);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(dateInput = new Date()) {
  const d = dateInput instanceof Date ? new Date(dateInput) : new Date(dateInput);
  d.setHours(23, 59, 59, 999);
  return d;
}

function computeDurationMinutes(departureTime, arrivalTime, explicit) {
  if (explicit != null && Number(explicit) > 0) return Math.round(Number(explicit));
  const ms = new Date(arrivalTime).getTime() - new Date(departureTime).getTime();
  if (!Number.isFinite(ms) || ms <= 0) {
    throw new AppError('Estimated duration must be positive', {
      code: ErrorCodes.VALIDATION_ERROR,
      statusCode: 400,
    });
  }
  return Math.max(1, Math.round(ms / 60000));
}

function estimatedCompletionFrom(departureTime, durationMinutes) {
  return new Date(new Date(departureTime).getTime() + durationMinutes * 60_000);
}

async function assertDriverProfileReady(driver) {
  const vehicleCount = await Vehicle.countDocuments({
    driverId: driver._id,
    status: VEHICLE_STATUS.ACTIVE,
  });

  if (!driver.isProfileComplete({ vehicleCount })) {
    throw new AppError(
      'Complete your driver profile (licence, UPI, and an active vehicle) before posting rides',
      {
        code: ErrorCodes.DRIVER_PROFILE_INCOMPLETE,
        statusCode: 403,
      }
    );
  }
  if (driver.verificationStatus !== DRIVER_VERIFICATION.VERIFIED) {
    throw new AppError('Only verified drivers can publish rides. Your account is pending review.', {
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

async function resolveOrCreateRoute(driver, payload) {
  if (payload.routeId) {
    const route = await Route.findById(payload.routeId);
    if (!route) {
      throw new AppError('Route not found', { code: ErrorCodes.ROUTE_NOT_FOUND, statusCode: 404 });
    }
    return route;
  }

  let originLoc;
  let destLoc;
  if (payload.sourceLocationId && payload.destinationLocationId) {
    originLoc = await Location.findById(payload.sourceLocationId);
    destLoc = await Location.findById(payload.destinationLocationId);
  } else if (payload.origin && payload.destination) {
    originLoc = await resolveLocation(payload.origin);
    destLoc = await resolveLocation(payload.destination);
  } else {
    throw new AppError('Provide a route or source and destination locations', {
      code: ErrorCodes.VALIDATION_ERROR,
      statusCode: 400,
    });
  }

  if (!originLoc || !destLoc) {
    throw new AppError('Source or destination location not found', {
      code: ErrorCodes.VALIDATION_ERROR,
      statusCode: 400,
    });
  }
  if (String(originLoc._id) === String(destLoc._id)) {
    throw new AppError('Source and destination must be different', {
      code: ErrorCodes.VALIDATION_ERROR,
      statusCode: 400,
    });
  }

  const existing = await Route.findOne({
    'origin.locationId': originLoc._id,
    'destination.locationId': destLoc._id,
    status: ROUTE_STATUS.ACTIVE,
  });
  if (existing) return existing;

  const duration =
    payload.estimatedDurationMinutes ||
    (payload.departureTime && payload.arrivalTime
      ? computeDurationMinutes(payload.departureTime, payload.arrivalTime)
      : 360);

  return Route.create({
    name: `${originLoc.city} → ${destLoc.city}`,
    origin: {
      name: originLoc.name,
      city: originLoc.city,
      state: originLoc.state,
      locationId: originLoc._id,
    },
    destination: {
      name: destLoc.name,
      city: destLoc.city,
      state: destLoc.state,
      locationId: destLoc._id,
    },
    stops: [],
    estimatedDuration: duration,
    status: ROUTE_STATUS.ACTIVE,
    createdByDriverId: driver._id,
  });
}

export async function dashboard(userId) {
  const driver = await resolveDriverProfile(userId);
  const from = startOfDay();
  const to = endOfDay();
  const rideIds = await Ride.find({ driverId: driver._id, ...notVoided }).distinct('_id');

  const [
    todayRides,
    upcomingCount,
    completedToday,
    totalRides,
    activeRides,
    completedRides,
    voidedRides,
    vehicleCount,
    pendingProofs,
    pendingRefunds,
    earningsAgg,
    todayEarningsAgg,
    recentRidesRaw,
    recentBookings,
    recentRefunds,
  ] = await Promise.all([
    Ride.countDocuments({
      driverId: driver._id,
      ...notVoided,
      departureTime: { $gte: from, $lte: to },
    }),
    Ride.countDocuments({
      driverId: driver._id,
      ...notVoided,
      status: RIDE_STATUS.SCHEDULED,
      departureTime: { $gt: new Date() },
    }),
    Ride.countDocuments({
      driverId: driver._id,
      ...notVoided,
      status: RIDE_STATUS.COMPLETED,
      actualCompletedAt: { $gte: from, $lte: to },
    }),
    Ride.countDocuments({ driverId: driver._id, ...notVoided }),
    Ride.countDocuments({
      driverId: driver._id,
      ...notVoided,
      status: RIDE_STATUS.ACTIVE,
    }),
    Ride.countDocuments({ driverId: driver._id, ...notVoided, status: RIDE_STATUS.COMPLETED }),
    Ride.countDocuments({ driverId: driver._id, voidedAt: { $ne: null } }),
    Vehicle.countDocuments({ driverId: driver._id, status: VEHICLE_STATUS.ACTIVE }),
    Booking.countDocuments({
      rideId: { $in: rideIds },
      proofStatus: PROOF_STATUS.SUBMITTED,
    }),
    Booking.countDocuments({
      rideId: { $in: rideIds },
      refundStatus: { $in: ['PENDING', 'PARTIAL'] },
    }),
    Booking.aggregate([
      {
        $match: {
          rideId: { $in: rideIds },
          bookingStatus: BOOKING_STATUS.CONFIRMED,
          proofStatus: PROOF_STATUS.APPROVED,
        },
      },
      {
        $group: {
          _id: null,
          totalEarnings: { $sum: '$totalAmount' },
          confirmedBookings: { $sum: 1 },
        },
      },
    ]),
    Booking.aggregate([
      {
        $match: {
          rideId: { $in: rideIds },
          bookingStatus: BOOKING_STATUS.CONFIRMED,
          proofStatus: PROOF_STATUS.APPROVED,
          updatedAt: { $gte: from, $lte: to },
        },
      },
      { $group: { _id: null, todayEarnings: { $sum: '$totalAmount' } } },
    ]),
    Ride.find({ driverId: driver._id, ...notVoided })
      .populate('routeId')
      .populate('vehicleId', 'registrationNumber make model')
      .limit(40),
    Booking.find({ rideId: { $in: rideIds } })
      .populate('userId', 'name phone')
      .populate({ path: 'rideId', populate: { path: 'routeId' } })
      .sort({ updatedAt: -1 })
      .limit(5),
    Booking.find({
      rideId: { $in: rideIds },
      refundStatus: { $in: ['PENDING', 'PARTIAL', 'COMPLETED'] },
    })
      .populate('userId', 'name phone payoutUpi')
      .populate({ path: 'rideId', populate: { path: 'routeId' } })
      .sort({ updatedAt: -1 })
      .limit(5),
  ]);

  const earnings = earningsAgg[0] || { totalEarnings: 0, confirmedBookings: 0 };
  const todayEarnings = todayEarningsAgg[0]?.todayEarnings || 0;
  const recentRides = sortRidesActiveFirst(recentRidesRaw).slice(0, 5);
  const todayReport = await todayReportForDriver(driver, from);

  return {
    todayRides,
    upcomingCount,
    completedToday,
    totalRides,
    activeRides,
    completedRides,
    cancelledRides: voidedRides,
    voidedRides,
    vehicleCount,
    pendingProofs,
    pendingRefunds,
    totalEarnings: earnings.totalEarnings || 0,
    todayEarnings,
    confirmedBookings: earnings.confirmedBookings || 0,
    recentRides,
    recentBookings,
    recentRefunds,
    todayReport,
  };
}

async function todayReportForDriver(driver, dayStart, dayEnd = endOfDay(dayStart)) {
  const rides = await Ride.find({
    driverId: driver._id,
    ...notVoided,
    $or: [
      { departureTime: { $gte: dayStart, $lte: dayEnd } },
      {
        status: RIDE_STATUS.COMPLETED,
        actualCompletedAt: { $gte: dayStart, $lte: dayEnd },
      },
      {
        status: RIDE_STATUS.ACTIVE,
        departureTime: { $lte: dayEnd },
        $or: [
          { estimatedCompletionAt: { $gte: dayStart } },
          { arrivalTime: { $gte: dayStart } },
        ],
      },
    ],
  })
    .populate('routeId')
    .populate('vehicleId', 'registrationNumber make model capacity')
    .lean();

  const rideIds = rides.map((r) => r._id);
  const [bookings, guests] = await Promise.all([
    Booking.find({
      rideId: { $in: rideIds },
      bookingStatus: { $in: [BOOKING_STATUS.CONFIRMED, BOOKING_STATUS.PENDING] },
    }).lean(),
    RidePassenger.find({ rideId: { $in: rideIds } }).lean(),
  ]);

  const bookingsByRide = new Map();
  for (const b of bookings) {
    const key = String(b.rideId);
    if (!bookingsByRide.has(key)) bookingsByRide.set(key, []);
    bookingsByRide.get(key).push(b);
  }
  const guestsByRide = new Map();
  for (const g of guests) {
    const key = String(g.rideId);
    if (!guestsByRide.has(key)) guestsByRide.set(key, []);
    guestsByRide.get(key).push(g);
  }

  const scheduledToday = rides.filter(
    (r) =>
      r.status === RIDE_STATUS.SCHEDULED &&
      new Date(r.departureTime) >= dayStart &&
      new Date(r.departureTime) <= dayEnd
  ).length;
  const activeNow = rides.filter((r) => r.status === RIDE_STATUS.ACTIVE).length;
  const completedToday = rides.filter(
    (r) =>
      r.status === RIDE_STATUS.COMPLETED &&
      r.actualCompletedAt &&
      new Date(r.actualCompletedAt) >= dayStart &&
      new Date(r.actualCompletedAt) <= dayEnd
  ).length;

  let totalPassengers = 0;
  let expectedFare = 0;
  let collected = 0;
  let seatsBooked = 0;
  let seatsRemaining = 0;

  const rows = sortRidesActiveFirst(rides).map((ride) => {
    const rideBookings = bookingsByRide.get(String(ride._id)) || [];
    const rideGuests = guestsByRide.get(String(ride._id)) || [];
    const bookingPassengers = rideBookings.reduce((s, b) => s + (b.passengerCount || 0), 0);
    const guestPassengers = rideGuests.reduce((s, g) => s + (g.seatCount || 0), 0);
    const passengerCount = bookingPassengers + guestPassengers;
    const bookingExpected = rideBookings.reduce((s, b) => s + Number(b.totalAmount || 0), 0);
    const guestExpected = rideGuests.reduce((s, g) => s + Number(g.fareAmount || 0), 0);
    const rideExpected = bookingExpected + guestExpected;
    const bookingCollected = rideBookings
      .filter((b) => b.proofStatus === PROOF_STATUS.APPROVED || b.paymentStatus === 'PAID')
      .reduce((s, b) => s + Number(b.totalAmount || 0), 0);
    const guestCollected = rideGuests.reduce((s, g) => s + Number(g.amountCollected || 0), 0);
    const rideCollected = bookingCollected + guestCollected;
    const outstanding = Math.max(0, rideExpected - rideCollected);

    totalPassengers += passengerCount;
    expectedFare += rideExpected;
    collected += rideCollected;
    seatsBooked += passengerCount;
    seatsRemaining += Math.max(0, (ride.availableSeats ?? ride.totalSeats) - 0);

    return {
      _id: ride._id,
      status: ride.status,
      source: ride.sourceName || ride.routeId?.origin?.city || ride.pickupPoint,
      destination: ride.destinationName || ride.routeId?.destination?.city || ride.dropPoint,
      departureTime: ride.departureTime,
      estimatedCompletionAt: ride.estimatedCompletionAt || ride.arrivalTime,
      actualCompletedAt: ride.actualCompletedAt,
      passengerCount,
      vehicle: ride.vehicleId,
      expectedFare: rideExpected,
      collected: rideCollected,
      outstanding,
      totalSeats: ride.totalSeats,
      availableSeats: ride.availableSeats,
    };
  });

  return {
    date: dayStart.toISOString().slice(0, 10),
    summary: {
      scheduledToday,
      activeNow,
      completedToday,
      totalPassengers,
      expectedFare,
      collected,
      outstanding: Math.max(0, expectedFare - collected),
      seatsBooked,
      seatsRemaining: rides.reduce((s, r) => s + (r.availableSeats || 0), 0),
      rideCount: rides.length,
    },
    rides: rows,
  };
}

export async function todayReport(userId, { date } = {}) {
  const driver = await resolveDriverProfile(userId);
  const day = date ? startOfDay(date) : startOfDay();
  return todayReportForDriver(driver, day, endOfDay(day));
}

export async function listRides(userId, { date, status } = {}) {
  const driver = await resolveDriverProfile(userId);
  const query = { driverId: driver._id, ...notVoided };
  if (status) query.status = status;
  if (date) {
    query.departureTime = { $gte: startOfDay(date), $lte: endOfDay(date) };
  }

  const rides = await Ride.find(query)
    .populate('routeId')
    .populate('vehicleId', 'registrationNumber vehicleType make model')
    .populate('sourceLocationId')
    .populate('destinationLocationId');

  const sorted = sortRidesActiveFirst(rides);
  const withFinance = await attachFinanceToRides(sorted);
  return { rides: withFinance };
}

export async function getRide(userId, rideId) {
  const driver = await resolveDriverProfile(userId);
  const ride = await Ride.findById(rideId)
    .populate('routeId')
    .populate('vehicleId')
    .populate('sourceLocationId')
    .populate('destinationLocationId');

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
  const driver = await resolveDriverProfile(userId);

  const [bookings, guests] = await Promise.all([
    Booking.find({
      rideId: ride._id,
      bookingStatus: { $in: [BOOKING_STATUS.CONFIRMED, BOOKING_STATUS.PENDING] },
    }).select(
      'bookingNumber passengers selectedSeats totalAmount proofStatus paymentStatus bookingStatus'
    ),
    RidePassenger.find({ rideId: ride._id, driverId: driver._id }).sort({ createdAt: -1 }),
  ]);

  const passengers = [];
  for (const booking of bookings) {
    for (const p of booking.passengers) {
      const paid =
        booking.proofStatus === PROOF_STATUS.APPROVED ||
        booking.paymentStatus === BOOKING_PAYMENT_STATUS.PAID;
      passengers.push({
        _id: `${booking._id}-${p.seatNumber}`,
        source: 'BOOKING',
        name: p.name,
        phone: p.phone,
        seatNumber: p.seatNumber,
        bookingNumber: booking.bookingNumber,
        bookingStatus: booking.bookingStatus,
        fareAmount: booking.totalAmount,
        paymentStatus: paid
          ? 'PAID'
          : booking.proofStatus === PROOF_STATUS.SUBMITTED
            ? 'PENDING_VERIFICATION'
            : booking.paymentStatus,
      });
    }
  }
  for (const g of guests) {
    passengers.push({
      source: 'MANUAL',
      _id: g._id,
      name: g.name,
      phone: g.phone,
      email: g.email,
      seatNumbers: g.seatNumbers,
      seatCount: g.seatCount,
      pickupName: g.pickupName,
      dropName: g.dropName,
      fareAmount: g.fareAmount,
      amountCollected: g.amountCollected,
      paymentStatus: g.paymentStatus,
      notes: g.notes,
    });
  }

  return {
    passengers,
    guests,
    seats: ride.seats.map((s) => ({
      seatNumber: s.seatNumber,
      status: s.status,
      row: s.row,
      position: s.position,
    })),
  };
}

export async function listAllPassengers(userId, { q, rideId, paymentStatus } = {}) {
  const driver = await resolveDriverProfile(userId);
  const query = { driverId: driver._id };
  if (rideId) query.rideId = rideId;
  if (paymentStatus) query.paymentStatus = paymentStatus;
  if (q) {
    const re = new RegExp(String(q).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    query.$or = [{ name: re }, { phone: re }, { email: re }];
  }

  const guests = await RidePassenger.find(query)
    .populate({
      path: 'rideId',
      populate: { path: 'routeId' },
      select: 'departureTime status sourceName destinationName routeId pickupPoint dropPoint',
    })
    .sort({ createdAt: -1 })
    .limit(200);

  return { passengers: guests };
}

export async function addPassenger(userId, rideId, payload) {
  const ride = await getRide(userId, rideId);
  const driver = await resolveDriverProfile(userId);

  if (ride.voidedAt) {
    throw new AppError('Cannot add passengers to a voided ride', {
      code: ErrorCodes.VALIDATION_ERROR,
      statusCode: 400,
    });
  }
  if (ride.status === RIDE_STATUS.COMPLETED) {
    throw new AppError('Cannot add passengers to a completed ride', {
      code: ErrorCodes.VALIDATION_ERROR,
      statusCode: 400,
    });
  }

  const seatCount = Math.max(1, Number(payload.seatCount || 1));
  const guestSeats = await RidePassenger.aggregate([
    { $match: { rideId: ride._id } },
    { $group: { _id: null, seats: { $sum: '$seatCount' } } },
  ]);
  const bookedGuestSeats = guestSeats[0]?.seats || 0;
  const bookedAppSeats = ride.totalSeats - ride.availableSeats;
  if (bookedAppSeats + bookedGuestSeats + seatCount > ride.totalSeats) {
    throw new AppError('Not enough seats remaining on this ride', {
      code: ErrorCodes.RIDE_CAPACITY_INVALID,
      statusCode: 400,
    });
  }

  let pickupName = payload.pickupName || null;
  let dropName = payload.dropName || null;
  let pickupLocationId = payload.pickupLocationId || null;
  let dropLocationId = payload.dropLocationId || null;

  if (payload.pickup) {
    const loc = await resolveLocation(payload.pickup);
    pickupLocationId = loc._id;
    pickupName = `${loc.name}, ${loc.city}`;
  }
  if (payload.drop) {
    const loc = await resolveLocation(payload.drop);
    dropLocationId = loc._id;
    dropName = `${loc.name}, ${loc.city}`;
  }

  const fareAmount =
    payload.fareAmount != null
      ? Number(payload.fareAmount)
      : Number(ride.pricePerSeat) * seatCount;
  const amountCollected = Number(payload.amountCollected || 0);
  let paymentStatus = payload.paymentStatus || GUEST_PAYMENT_STATUS.PENDING;
  if (amountCollected <= 0) paymentStatus = GUEST_PAYMENT_STATUS.PENDING;
  else if (amountCollected < fareAmount) paymentStatus = GUEST_PAYMENT_STATUS.PARTIAL;
  else paymentStatus = GUEST_PAYMENT_STATUS.PAID;

  const guest = await RidePassenger.create({
    rideId: ride._id,
    driverId: driver._id,
    name: String(payload.name).trim(),
    phone: payload.phone ? String(payload.phone).trim() : null,
    email: payload.email ? String(payload.email).trim().toLowerCase() : null,
    pickupLocationId,
    dropLocationId,
    pickupName,
    dropName,
    seatNumbers: Array.isArray(payload.seatNumbers) ? payload.seatNumbers : [],
    seatCount,
    fareAmount,
    amountCollected,
    paymentStatus,
    paymentMethod: payload.paymentMethod || null,
    paymentReference: payload.paymentReference || null,
    paymentAt: amountCollected > 0 ? new Date() : null,
    notes: payload.notes || null,
  });

  try {
    const { notifyPassengerAdded } = await import('./notificationService.js');
    await notifyPassengerAdded(userId, ride, guest);
  } catch {
    /* non-blocking */
  }

  return guest;
}

export async function updatePassenger(userId, passengerId, payload) {
  const driver = await resolveDriverProfile(userId);
  const guest = await RidePassenger.findById(passengerId);
  if (!guest || guest.driverId.toString() !== driver._id.toString()) {
    throw new AppError('Passenger not found', {
      code: ErrorCodes.VALIDATION_ERROR,
      statusCode: 404,
    });
  }

  const ride = await Ride.findById(guest.rideId);
  if (!ride || ride.status === RIDE_STATUS.COMPLETED || ride.voidedAt) {
    throw new AppError('This passenger record is read-only', {
      code: ErrorCodes.VALIDATION_ERROR,
      statusCode: 409,
    });
  }

  if (payload.name != null) guest.name = String(payload.name).trim();
  if (payload.phone !== undefined) guest.phone = payload.phone ? String(payload.phone).trim() : null;
  if (payload.email !== undefined) guest.email = payload.email ? String(payload.email).trim().toLowerCase() : null;
  if (payload.notes !== undefined) guest.notes = payload.notes;
  if (payload.seatCount != null) guest.seatCount = Math.max(1, Number(payload.seatCount));
  if (payload.fareAmount != null) guest.fareAmount = Number(payload.fareAmount);
  if (payload.amountCollected != null) {
    guest.amountCollected = Number(payload.amountCollected);
    guest.paymentAt = new Date();
  }
  if (payload.paymentMethod !== undefined) guest.paymentMethod = payload.paymentMethod;
  if (payload.paymentReference !== undefined) guest.paymentReference = payload.paymentReference;
  if (payload.seatNumbers) guest.seatNumbers = payload.seatNumbers;

  if (guest.amountCollected <= 0) guest.paymentStatus = GUEST_PAYMENT_STATUS.PENDING;
  else if (guest.amountCollected < guest.fareAmount) guest.paymentStatus = GUEST_PAYMENT_STATUS.PARTIAL;
  else guest.paymentStatus = GUEST_PAYMENT_STATUS.PAID;

  await guest.save();
  return guest;
}

export async function updateStatus(userId, rideId, status) {
  const ride = await getRide(userId, rideId);
  if (ride.voidedAt) {
    throw new AppError('This ride was voided and cannot change status', {
      code: ErrorCodes.VALIDATION_ERROR,
      statusCode: 400,
    });
  }

  const allowed = ALLOWED_TRANSITIONS[ride.status] || [];
  if (!allowed.includes(status)) {
    throw new AppError(`Cannot transition from ${ride.status} to ${status}`, {
      code: ErrorCodes.VALIDATION_ERROR,
      statusCode: 400,
    });
  }

  // Manual completion from SCHEDULED is allowed only if departure has passed (edge case)
  if (ride.status === RIDE_STATUS.SCHEDULED && status === RIDE_STATUS.COMPLETED) {
    throw new AppError('Activate the ride before completing it, or wait for automatic activation', {
      code: ErrorCodes.VALIDATION_ERROR,
      statusCode: 400,
    });
  }

  const now = new Date();
  const extra = {};
  if (status === RIDE_STATUS.ACTIVE) {
    extra.actualStartedAt = ride.actualStartedAt || now;
  }
  if (status === RIDE_STATUS.COMPLETED) {
    extra.actualCompletedAt = now;
  }

  const updated = await transitionRide(ride._id, ride.status, status, {
    source: RIDE_STATUS_CHANGE_SOURCE.MANUAL,
    note: 'Driver status update',
    extra,
  });

  if (!updated) {
    throw new AppError('Ride status was already updated', {
      code: ErrorCodes.VALIDATION_ERROR,
      statusCode: 409,
    });
  }

  if (status === RIDE_STATUS.COMPLETED) {
    const driver = await resolveDriverProfile(userId);
    driver.totalTrips = (driver.totalTrips || 0) + 1;
    await driver.save();
  }

  logger.info('ride.status_updated', {
    rideId: ride._id.toString(),
    status,
    source: RIDE_STATUS_CHANGE_SOURCE.MANUAL,
    driverUserId: userId.toString(),
  });

  return updated;
}

/** Void a ride without introducing a fourth canonical status. */
export async function voidRide(userId, rideId, reason = 'Driver voided the ride') {
  const ride = await getRide(userId, rideId);
  if (ride.voidedAt) return ride;
  if (ride.status === RIDE_STATUS.COMPLETED) {
    throw new AppError('Completed rides cannot be voided', {
      code: ErrorCodes.VALIDATION_ERROR,
      statusCode: 400,
    });
  }

  ride.voidedAt = new Date();
  ride.voidedReason = reason;
  ride.statusHistory.push({
    fromStatus: ride.status,
    toStatus: ride.status,
    source: RIDE_STATUS_CHANGE_SOURCE.MANUAL,
    at: new Date(),
    note: `Voided: ${reason}`,
  });
  await ride.save();

  const { cancelBookingsForRide } = await import('./bookingService.js');
  await cancelBookingsForRide(ride, { reason });

  return ride;
}

export async function createRide(userId, payload) {
  const driver = await resolveDriverProfile(userId);
  await assertDriverProfileReady(driver);

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

  const route = await resolveOrCreateRoute(driver, payload);
  const capacity = payload.capacity || vehicle.capacity;
  if (capacity > vehicle.capacity) {
    throw new AppError('Ride capacity cannot exceed vehicle capacity', {
      code: ErrorCodes.RIDE_CAPACITY_INVALID,
      statusCode: 400,
    });
  }

  const departureTime = new Date(payload.departureTime);
  let arrivalTime;
  let durationMinutes;
  if (payload.estimatedDurationMinutes != null) {
    durationMinutes = computeDurationMinutes(departureTime, null, payload.estimatedDurationMinutes);
    arrivalTime = estimatedCompletionFrom(departureTime, durationMinutes);
  } else {
    arrivalTime = new Date(payload.arrivalTime);
    durationMinutes = computeDurationMinutes(departureTime, arrivalTime);
  }
  if (!(arrivalTime > departureTime)) {
    throw new AppError('Arrival must be after departure', {
      code: ErrorCodes.VALIDATION_ERROR,
      statusCode: 400,
    });
  }

  const sourceLoc = route.origin?.locationId
    ? await Location.findById(route.origin.locationId)
    : null;
  const destLoc = route.destination?.locationId
    ? await Location.findById(route.destination.locationId)
    : null;

  const seats = buildSeats(vehicle.seatConfiguration.slice(0, capacity));
  const estimatedCompletionAt = arrivalTime;
  const ride = await Ride.create({
    routeId: route._id,
    driverId: driver._id,
    vehicleId: vehicle._id,
    sourceLocationId: sourceLoc?._id || null,
    destinationLocationId: destLoc?._id || null,
    sourceName: sourceLoc
      ? `${sourceLoc.name}, ${sourceLoc.city}`
      : route.origin?.city || payload.pickupPoint,
    destinationName: destLoc
      ? `${destLoc.name}, ${destLoc.city}`
      : route.destination?.city || payload.dropPoint,
    date: new Date(
      Date.UTC(departureTime.getUTCFullYear(), departureTime.getUTCMonth(), departureTime.getUTCDate())
    ),
    departureTime,
    arrivalTime,
    estimatedDurationMinutes: durationMinutes,
    estimatedCompletionAt,
    pickupPoint: payload.pickupPoint || payload.pickupPoints?.[0] || route.origin?.city || 'Pickup',
    dropPoint: payload.dropPoint || payload.dropPoints?.[0] || route.destination?.city || 'Drop',
    pickupPoints: [...new Set([payload.pickupPoint, ...(payload.pickupPoints || [])].filter(Boolean))].slice(0, 2),
    dropPoints: [...new Set([payload.dropPoint, ...(payload.dropPoints || [])].filter(Boolean))].slice(0, 2),
    rideStops: stopsFromRoute(route),
    legs: legsFromStops(stopsFromRoute(route), seats.length),
    pricePerSeat: payload.pricePerSeat,
    frontSeatPrice: payload.frontSeatPrice ?? null,
    notes: payload.notes || null,
    totalSeats: seats.length,
    availableSeats: seats.length,
    seats,
    status: RIDE_STATUS.SCHEDULED,
    statusHistory: [
      {
        fromStatus: null,
        toStatus: RIDE_STATUS.SCHEDULED,
        source: RIDE_STATUS_CHANGE_SOURCE.MANUAL,
        at: new Date(),
        note: 'Ride created',
      },
    ],
  });

  logger.info('ride.scheduled_created', { rideId: ride._id.toString(), driverId: driver._id.toString() });
  try {
    const { notifyUpcomingRide } = await import('./notificationService.js');
    await notifyUpcomingRide(userId, ride);
  } catch {
    /* non-blocking */
  }
  return ride;
}

const EDITABLE_RIDE_STATUSES = new Set([RIDE_STATUS.SCHEDULED]);

export async function updateRide(userId, rideId, payload) {
  const ride = await getRide(userId, rideId);
  if (ride.voidedAt || !EDITABLE_RIDE_STATUSES.has(ride.status)) {
    throw new AppError('This ride can no longer be edited', {
      code: ErrorCodes.VALIDATION_ERROR,
      statusCode: 409,
    });
  }

  if (payload.departureTime) ride.departureTime = new Date(payload.departureTime);
  if (payload.estimatedDurationMinutes != null) {
    ride.estimatedDurationMinutes = computeDurationMinutes(
      ride.departureTime,
      null,
      payload.estimatedDurationMinutes
    );
    ride.estimatedCompletionAt = estimatedCompletionFrom(
      ride.departureTime,
      ride.estimatedDurationMinutes
    );
    ride.arrivalTime = ride.estimatedCompletionAt;
  } else if (payload.arrivalTime) {
    ride.arrivalTime = new Date(payload.arrivalTime);
    ride.estimatedDurationMinutes = computeDurationMinutes(ride.departureTime, ride.arrivalTime);
    ride.estimatedCompletionAt = ride.arrivalTime;
  }
  if (payload.pickupPoint) ride.pickupPoint = payload.pickupPoint.trim();
  if (payload.dropPoint) ride.dropPoint = payload.dropPoint.trim();
  if (payload.pricePerSeat != null) ride.pricePerSeat = Number(payload.pricePerSeat);
  if (payload.frontSeatPrice !== undefined) {
    ride.frontSeatPrice = payload.frontSeatPrice === null ? null : Number(payload.frontSeatPrice);
  }
  if (payload.pickupPoints) ride.pickupPoints = payload.pickupPoints.slice(0, 2);
  if (payload.dropPoints) ride.dropPoints = payload.dropPoints.slice(0, 2);
  if (payload.notes !== undefined) ride.notes = payload.notes;
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
  if (ride.status === RIDE_STATUS.COMPLETED || ride.voidedAt) {
    throw new AppError('Cannot change capacity of a completed or voided ride', {
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
