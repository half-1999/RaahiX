import bcrypt from 'bcryptjs';
import { config } from '../config/index.js';
import { User } from '../models/User.js';
import { Driver } from '../models/Driver.js';
import { Vehicle } from '../models/Vehicle.js';
import { Route } from '../models/Route.js';
import { Ride } from '../models/Ride.js';
import { Booking } from '../models/Booking.js';
import { Payment } from '../models/Payment.js';
import { Notification } from '../models/Notification.js';
import { AuditLog } from '../models/AuditLog.js';
import { Location } from '../models/Location.js';
import { Review } from '../models/Review.js';
import { Counter, nextPaymentReference } from '../models/Counter.js';
import { resolveLocation } from '../services/locationService.js';
import { legsFromStops, stopsFromRoute } from '../services/segmentService.js';
import {
  BOOKING_PAYMENT_STATUS,
  BOOKING_STATUS,
  PROOF_STATUS,
  REFUND_STATUS,
  DRIVER_STATUS,
  DRIVER_VERIFICATION,
  PAYMENT_STATUS,
  ROLES,
  ROUTE_STATUS,
  RIDE_STATUS,
  SEAT_STATUS,
  USER_STATUS,
  VEHICLE_STATUS,
} from '../constants/enums.js';
import { logger } from '../utils/logger.js';
import { connectDb, disconnectDb } from '../config/db.js';
import { seatConfigurationForType, VEHICLE_TYPES } from '../utils/vehicleLayouts.js';

function buildSeats(seatConfig) {
  return seatConfig.map((s) => ({
    ...s,
    status: SEAT_STATUS.AVAILABLE,
    holdId: null,
    holdExpiresAt: null,
    holdUserId: null,
    bookingId: null,
  }));
}

/** Demo calendar day-0: 18 Oct of the current year while that date is still upcoming; otherwise today (keeps reseeds fresh). */
function seedStartDate() {
  const now = new Date();
  const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const oct18Utc = Date.UTC(now.getUTCFullYear(), 9, 18); // month 9 = October
  return new Date(oct18Utc >= todayUtc ? oct18Utc : todayUtc);
}

function daysFromNow(days, hour = 8, minute = 0) {
  const d = new Date(seedStartDate());
  d.setUTCDate(d.getUTCDate() + days);
  d.setUTCHours(hour, minute, 0, 0);
  return d;
}

/** Wall-clock relative dates for ACTIVE / COMPLETED demos (must reflect “now”, not the seed calendar). */
function daysFromToday(days, hour = 8, minute = 0) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  d.setUTCHours(hour, minute, 0, 0);
  return d;
}

function bookingNumber(suffix) {
  return `BKSEED${String(suffix).padStart(4, '0')}`;
}

export async function runSeed({ disconnect = true, connect = true, force = false } = {}) {
  if (connect) {
    await connectDb();
  }

  const allow =
    force ||
    process.env.ALLOW_SEED_RESET === 'true' ||
    process.env.NODE_ENV !== 'production';
  if (!allow) {
    throw new Error(
      'Seed reset blocked: set ALLOW_SEED_RESET=true for non-production resets, or NODE_ENV!=production'
    );
  }

  logger.info('seed.start', { env: process.env.NODE_ENV || 'development' });

  // Wipe demo collections — intended for local/test only (guarded above).
  await Promise.all([
    User.deleteMany({}),
    Driver.deleteMany({}),
    Vehicle.deleteMany({}),
    Route.deleteMany({}),
    Ride.deleteMany({}),
    Booking.deleteMany({}),
    Payment.deleteMany({}),
    Notification.deleteMany({}),
    AuditLog.deleteMany({}),
    Location.deleteMany({}),
    Review.deleteMany({}),
  ]);
  await Counter.deleteMany({});

  const passwordHash = {
    admin: await bcrypt.hash(config.seed.adminPassword, 10),
    driver: await bcrypt.hash('Driver@12345', 10),
    customer: await bcrypt.hash('Customer@12345', 10),
  };

  const admin = await User.create({
    name: 'Ops Admin',
    username: 'opsadmin',
    email: config.seed.adminEmail.toLowerCase(),
    phone: '9000000001',
    passwordHash: passwordHash.admin,
    role: ROLES.ADMIN,
    status: USER_STATUS.ACTIVE,
    emailVerified: true,
  });

  const driverSpecs = [
    { name: 'Raj Kumar', phone: '9000001001', email: 'raj.driver@localcab.dev', license: 'DL-07-2024001', username: 'rajkumar' },
    { name: 'Amit Singh', phone: '9000001002', email: 'amit.driver@localcab.dev', license: 'UP-25-2024002', username: 'amitsingh' },
  ];

  const drivers = [];
  for (const spec of driverSpecs) {
    const user = await User.create({
      name: spec.name,
      username: spec.username,
      email: spec.email,
      phone: spec.phone,
      passwordHash: passwordHash.driver,
      role: ROLES.DRIVER,
      status: USER_STATUS.ACTIVE,
      emailVerified: true,
      city: 'Delhi',
      state: 'Delhi',
    });
    drivers.push(
      await Driver.create({
        userId: user._id,
        name: spec.name,
        phone: spec.phone,
        licenseNumber: spec.license,
        verificationStatus: DRIVER_VERIFICATION.VERIFIED,
        status: DRIVER_STATUS.ACTIVE,
        upiId: spec.email.split('@')[0].replace('.', '') + '@upi',
        paymentInstructions: 'Pay the exact fare, then upload the screenshot.',
        rating: 4.6,
        totalTrips: 12,
      })
    );
  }

  const vehicleSpecs = [
    {
      make: 'Maruti',
      model: 'Dzire',
      type: VEHICLE_TYPES.FIVE_SEATER,
      reg: 'DL01AB1001',
    },
    {
      make: 'Maruti',
      model: 'Ertiga',
      type: VEHICLE_TYPES.SIX_SEATER,
      reg: 'UP25CD2002',
    },
  ];

  const vehicles = [];
  for (let i = 0; i < vehicleSpecs.length; i += 1) {
    const v = vehicleSpecs[i];
    const seats = seatConfigurationForType(v.type);
    vehicles.push(
      await Vehicle.create({
        driverId: drivers[i]._id,
        registrationNumber: v.reg,
        make: v.make,
        model: v.model,
        vehicleType: v.type,
        capacity: seats.length,
        seatConfiguration: seats,
        features: ['AC', 'Charging'],
        status: VEHICLE_STATUS.ACTIVE,
      })
    );
  }

  const routeDefs = [
    { origin: { city: 'Delhi', state: 'Delhi' }, destination: { city: 'Chandigarh', state: 'Chandigarh' }, stops: [], estimatedDuration: 300 },
    { origin: { city: 'Chandigarh', state: 'Chandigarh' }, destination: { city: 'Delhi', state: 'Delhi' }, stops: [], estimatedDuration: 300 },
    { origin: { city: 'Delhi', state: 'Delhi' }, destination: { city: 'Jaipur', state: 'Rajasthan' }, stops: [], estimatedDuration: 330 },
    { origin: { city: 'Jaipur', state: 'Rajasthan' }, destination: { city: 'Delhi', state: 'Delhi' }, stops: [], estimatedDuration: 330 },
    { origin: { city: 'Delhi', state: 'Delhi' }, destination: { city: 'Agra', state: 'Uttar Pradesh' }, stops: [], estimatedDuration: 240 },
    { origin: { city: 'Agra', state: 'Uttar Pradesh' }, destination: { city: 'Delhi', state: 'Delhi' }, stops: [], estimatedDuration: 240 },
    { origin: { city: 'Delhi', state: 'Delhi' }, destination: { city: 'Dehradun', state: 'Uttarakhand' }, stops: [], estimatedDuration: 360 },
    { origin: { city: 'Gurugram', state: 'Haryana' }, destination: { city: 'Jaipur', state: 'Rajasthan' }, stops: [], estimatedDuration: 300 },
    { origin: { city: 'Chandigarh', state: 'Chandigarh' }, destination: { city: 'Shimla', state: 'Himachal Pradesh' }, stops: [], estimatedDuration: 210 },
    { origin: { city: 'Mumbai', state: 'Maharashtra' }, destination: { city: 'Pune', state: 'Maharashtra' }, stops: [], estimatedDuration: 210 },
    { origin: { city: 'Bengaluru', state: 'Karnataka' }, destination: { city: 'Mysuru', state: 'Karnataka' }, stops: [], estimatedDuration: 180 },
    { origin: { city: 'Hyderabad', state: 'Telangana' }, destination: { city: 'Vijayawada', state: 'Andhra Pradesh' }, stops: [], estimatedDuration: 330 },
    { origin: { city: 'Chennai', state: 'Tamil Nadu' }, destination: { city: 'Bengaluru', state: 'Karnataka' }, stops: [], estimatedDuration: 360 },
    { origin: { city: 'Lucknow', state: 'Uttar Pradesh' }, destination: { city: 'Kanpur', state: 'Uttar Pradesh' }, stops: [], estimatedDuration: 150 },
    {
      origin: { city: 'Gurugram', state: 'Haryana' },
      destination: { city: 'Bareilly', state: 'Uttar Pradesh' },
      stops: [{ name: 'Moradabad Bypass', city: 'Moradabad', state: 'Uttar Pradesh', sequence: 1 }],
      estimatedDuration: 360,
    },
  ];

  const routes = [];
  for (const def of routeDefs) {
    routes.push(await Route.create({ ...def, status: ROUTE_STATUS.ACTIVE }));
  }

  const rideTemplates = [
    { route: 0, price: 899, pickup: 'Kashmere Gate ISBT', drop: 'Sector 17 Chandigarh' },
    { route: 1, price: 899, pickup: 'Sector 43 Chandigarh', drop: 'Anand Vihar ISBT' },
    { route: 2, price: 999, pickup: 'Sarai Kale Khan', drop: 'Sindhi Camp Jaipur' },
    { route: 3, price: 999, pickup: 'Sindhi Camp', drop: 'Kashmere Gate' },
    { route: 4, price: 749, pickup: 'Sarai Kale Khan', drop: 'Agra Idgah' },
    { route: 5, price: 749, pickup: 'Agra Cantt', drop: 'Sarai Kale Khan' },
    { route: 6, price: 1099, pickup: 'ISBT Kashmiri Gate', drop: 'Dehradun Clock Tower' },
    { route: 7, price: 949, pickup: 'Cyber Hub Gurugram', drop: 'Tonk Phatak Jaipur' },
    { route: 8, price: 699, pickup: 'Sector 17', drop: 'Shimla Mall Road' },
    { route: 9, price: 599, pickup: 'Dadar TT', drop: 'Shivaji Nagar Pune' },
    { route: 10, price: 549, pickup: 'Majestic', drop: 'Mysuru Bus Stand' },
    { route: 11, price: 899, pickup: 'MGBS Hyderabad', drop: 'Vijayawada Pandit Nehru' },
    { route: 12, price: 999, pickup: 'Koyambedu', drop: 'Kempegowda Bus Station' },
    { route: 13, price: 399, pickup: 'Alambagh Lucknow', drop: 'Kanpur Collective' },
    { route: 14, price: 799, pickup: 'IFFCO Chowk', drop: 'Civil Lines Bareilly' },
  ];
  const departureHours = [6, 7, 8, 9, 10, 14, 16, 18, 20, 22];

  const ridePlans = [];
  for (let i = 0; i < 28; i += 1) {
    const template = rideTemplates[i % rideTemplates.length];
    const driver = i % 2;
    ridePlans.push({
      ...template,
      route: template.route % routes.length,
      driver,
      vehicle: driver,
      day: Math.floor(i / 3),
      hour: departureHours[i % departureHours.length],
      price: template.price + (i % 3) * 50,
      status: i % 11 === 0 ? RIDE_STATUS.COMPLETED : i % 9 === 0 ? RIDE_STATUS.ACTIVE : RIDE_STATUS.SCHEDULED,
    });
  }

  const rides = [];
  for (const plan of ridePlans) {
    let day = plan.day;
    let hour = plan.hour;
    let departureTime;
    if (plan.status === RIDE_STATUS.COMPLETED) {
      departureTime = daysFromToday(-2, hour, 0);
    } else if (plan.status === RIDE_STATUS.ACTIVE) {
      hour = Math.max(0, new Date().getUTCHours() - 2);
      departureTime = daysFromToday(0, hour, 0);
    } else {
      // Scheduled rides use the seed calendar (starts 18 Oct when run before that date).
      if (day === 0) {
        const anchor = seedStartDate();
        const now = new Date();
        const sameCalendarDay =
          anchor.getUTCFullYear() === now.getUTCFullYear() &&
          anchor.getUTCMonth() === now.getUTCMonth() &&
          anchor.getUTCDate() === now.getUTCDate();
        if (sameCalendarDay) {
          const minHour = now.getUTCHours() + 1;
          if (hour <= minHour) hour = Math.min(23, minHour + (plan.hour % 3));
          if (hour <= now.getUTCHours()) {
            day = 1;
            hour = plan.hour;
          }
        }
      }
      departureTime = daysFromNow(day, hour, 0);
    }
    const duration = routes[plan.route].estimatedDuration;
    const arrivalTime = new Date(departureTime.getTime() + duration * 60 * 1000);
    const seatConfiguration = vehicles[plan.vehicle].seatConfiguration.map((s) => s.toObject?.() || { ...s });
    const seats = buildSeats(seatConfiguration);
    const origin = routes[plan.route].origin;
    const destination = routes[plan.route].destination;
    rides.push(
      await Ride.create({
        routeId: routes[plan.route]._id,
        driverId: drivers[plan.driver]._id,
        vehicleId: vehicles[plan.vehicle]._id,
        sourceName: `${origin.city}, ${origin.state}`,
        destinationName: `${destination.city}, ${destination.state}`,
        date: new Date(Date.UTC(departureTime.getUTCFullYear(), departureTime.getUTCMonth(), departureTime.getUTCDate())),
        departureTime,
        arrivalTime,
        estimatedDurationMinutes: duration,
        estimatedCompletionAt: arrivalTime,
        actualStartedAt: plan.status !== RIDE_STATUS.SCHEDULED ? departureTime : null,
        actualCompletedAt: plan.status === RIDE_STATUS.COMPLETED ? arrivalTime : null,
        pickupPoint: plan.pickup,
        dropPoint: plan.drop,
        pricePerSeat: plan.price,
        totalSeats: seats.length,
        availableSeats: seats.length,
        seats,
        status: plan.status,
        isSeed: true,
      })
    );
  }

  const customerSpecs = [
    { name: 'Priya Sharma', email: 'priya.customer@localcab.dev', phone: '9111100001', username: 'priyasharma' },
    { name: 'Rohan Mehta', email: 'rohan.customer@localcab.dev', phone: '9111100002', username: 'rohanmehta' },
    { name: 'Sneha Patel', email: 'sneha.customer@localcab.dev', phone: '9111100003', username: 'snehapatel' },
    { name: 'Vikram Joshi', email: 'vikram.customer@localcab.dev', phone: '9111100004', username: 'vikramjoshi' },
  ];

  const customers = [];
  for (const spec of customerSpecs) {
    customers.push(
      await User.create({
        name: spec.name,
        username: spec.username,
        email: spec.email,
        phone: spec.phone,
        passwordHash: passwordHash.customer,
        role: ROLES.CUSTOMER,
        status: USER_STATUS.ACTIVE,
        emailVerified: true,
        city: 'Noida',
        state: 'Uttar Pradesh',
      })
    );
  }

  // Confirmed bookings so customer / driver / admin lists have real data
  const bookingPlans = [
    {
      customer: 0,
      ride: 0,
      seats: ['A1'],
      passengers: [{ name: 'Priya Sharma', phone: '9111100001', age: 28, seatNumber: 'A1' }],
    },
    {
      customer: 1,
      ride: 0,
      seats: ['B1', 'B3'],
      passengers: [
        { name: 'Rohan Mehta', phone: '9111100002', age: 32, seatNumber: 'B1' },
        { name: 'Ananya Mehta', phone: '9111100002', age: 29, seatNumber: 'B3' },
      ],
    },
    {
      customer: 2,
      ride: 1,
      seats: ['A1'],
      passengers: [{ name: 'Sneha Patel', phone: '9111100003', age: 26, seatNumber: 'A1' }],
    },
    {
      customer: 3,
      ride: 2,
      seats: ['B2'],
      passengers: [{ name: 'Vikram Joshi', phone: '9111100004', age: 35, seatNumber: 'B2' }],
    },
  ];

  let bookingCount = 0;
  for (let i = 0; i < bookingPlans.length; i += 1) {
    const plan = bookingPlans[i];
    const ride = rides[plan.ride];
    const customer = customers[plan.customer];
    const amountPerSeat = ride.pricePerSeat;
    const totalAmount = amountPerSeat * plan.seats.length;
    const holdId = `seed-hold-${i + 1}`;
    const holdExpiresAt = new Date(Date.now() + 60 * 60 * 1000);

    const paymentReference = await nextPaymentReference();
    const booking = await Booking.create({
      bookingNumber: bookingNumber(i + 1),
      paymentReference,
      userId: customer._id,
      rideId: ride._id,
      passengers: plan.passengers,
      selectedSeats: plan.seats,
      passengerCount: plan.passengers.length,
      amountPerSeat,
      totalAmount,
      currency: 'INR',
      paymentStatus: BOOKING_PAYMENT_STATUS.PAID,
      bookingStatus: BOOKING_STATUS.CONFIRMED,
      proofStatus: PROOF_STATUS.APPROVED,
      proofAmount: totalAmount,
      refundStatus: REFUND_STATUS.NOT_APPLICABLE,
      holdId,
      holdExpiresAt,
      isSeed: true,
    });

    for (const seatNumber of plan.seats) {
      const seat = ride.seats.find((s) => s.seatNumber === seatNumber);
      if (seat) {
        seat.status = SEAT_STATUS.BOOKED;
        seat.bookingId = booking._id;
        seat.holdId = null;
        seat.holdExpiresAt = null;
        seat.holdUserId = null;
      }
    }
    ride.availableSeats = Math.max(0, ride.availableSeats - plan.seats.length);
    await ride.save();

    await Payment.create({
      bookingId: booking._id,
      userId: customer._id,
      paymentReference,
      amount: totalAmount,
      currency: 'INR',
      gateway: 'manual_upi',
      gatewayOrderId: `order_seed_${i + 1}`,
      gatewayPaymentId: `pay_seed_${i + 1}`,
      status: PAYMENT_STATUS.SUCCESS,
      paidAt: new Date(),
      isSeed: true,
    });

    bookingCount += 1;
  }

  // Pending payment-proof awaiting driver review (seat held in verification window)
  {
    const ride = rides.find((r) => r.status === RIDE_STATUS.SCHEDULED && r.availableSeats > 0) || rides[1];
    const seat = ride.seats.find((s) => s.status === SEAT_STATUS.AVAILABLE);
    if (seat) {
      const paymentReference = await nextPaymentReference();
      const holdId = 'seed-hold-pending-proof';
      const holdExpiresAt = new Date(Date.now() + 30 * 60 * 1000);
      seat.status = SEAT_STATUS.HELD;
      seat.holdId = holdId;
      seat.holdExpiresAt = holdExpiresAt;
      seat.holdUserId = customers[0]._id;
      ride.availableSeats = Math.max(0, ride.availableSeats - 1);
      await ride.save();
      await Booking.create({
        bookingNumber: bookingNumber(50),
        paymentReference,
        userId: customers[0]._id,
        rideId: ride._id,
        passengers: [{ name: 'Priya Sharma', phone: '9111100001', age: 28, seatNumber: seat.seatNumber }],
        selectedSeats: [seat.seatNumber],
        passengerCount: 1,
        amountPerSeat: ride.pricePerSeat,
        totalAmount: ride.pricePerSeat,
        currency: 'INR',
        paymentStatus: BOOKING_PAYMENT_STATUS.PENDING,
        bookingStatus: BOOKING_STATUS.PENDING,
        proofStatus: PROOF_STATUS.SUBMITTED,
        proofAmount: ride.pricePerSeat,
        proofSubmittedAt: new Date(),
        verificationHoldUntil: holdExpiresAt,
        refundStatus: REFUND_STATUS.NOT_APPLICABLE,
        holdId,
        holdExpiresAt,
        isSeed: true,
      });
      bookingCount += 1;
    }
  }

  // Completed refund example on an older confirmed booking
  {
    const paid = await Booking.findOne({ isSeed: true, bookingStatus: BOOKING_STATUS.CONFIRMED }).sort({
      createdAt: 1,
    });
    if (paid) {
      paid.refundAmount = Math.round(paid.totalAmount * 0.5);
      paid.refundStatus = REFUND_STATUS.COMPLETED;
      paid.refundProcessedAt = new Date();
      paid.refundReference = `RFND-${paid.paymentReference || 'SEED'}`;
      paid.bookingStatus = BOOKING_STATUS.CANCELLED;
      paid.cancellationReason = 'Passenger cancelled — demo refund';
      paid.cancelledAt = new Date();
      await paid.save();
      await Payment.updateOne(
        { bookingId: paid._id },
        { $set: { refundAmount: paid.refundAmount, refundedAt: new Date() } }
      );
    }
  }

  const corridorPlaces = [];
  for (const [name, city, state] of [
    ['Richha', 'Richha', 'Uttar Pradesh'],
    ['Delhi', 'Delhi', 'Delhi'],
    ['Noida', 'Noida', 'Uttar Pradesh'],
    ['Gurugram', 'Gurugram', 'Haryana'],
    ['Bareilly', 'Bareilly', 'Uttar Pradesh'],
  ]) {
    corridorPlaces.push(await resolveLocation({ name, city, state }).then((location) => ({
      name: location.name,
      city: location.city,
      state: location.state,
      locationId: location._id,
    })));
  }
  const corridorRoute = await Route.create({
    origin: corridorPlaces[0],
    destination: corridorPlaces[3],
    stops: corridorPlaces.slice(1, 3).map((place, index) => ({ ...place, sequence: index + 1 })),
    estimatedDuration: 420,
    status: ROUTE_STATUS.ACTIVE,
    createdByDriverId: drivers[0]._id,
  });
  const corridorStops = stopsFromRoute(corridorRoute);
  const corridorSeatSource = vehicles[1].seatConfiguration.map((seat) => seat.toObject?.() || { ...seat });
  const corridorSeats = buildSeats(corridorSeatSource);
  const corridorDeparture = daysFromNow(2, 8, 0);
  const corridorLegs = legsFromStops(corridorStops, corridorSeats.length);
  corridorLegs[0].committed = 2;
  const corridorRide = await Ride.create({
    routeId: corridorRoute._id,
    driverId: drivers[0]._id,
    vehicleId: vehicles[1]._id,
    date: new Date(Date.UTC(corridorDeparture.getUTCFullYear(), corridorDeparture.getUTCMonth(), corridorDeparture.getUTCDate())),
    departureTime: corridorDeparture,
    arrivalTime: new Date(corridorDeparture.getTime() + 420 * 60 * 1000),
    pickupPoint: 'Richha stand',
    dropPoint: 'Gurugram',
    rideStops: corridorStops,
    legs: corridorLegs,
    segmentHolds: [{
      holdId: 'seed-segment-1',
      userId: customers[0]._id,
      seatCount: 2,
      pickupLocationId: corridorPlaces[0].locationId,
      dropLocationId: corridorPlaces[1].locationId,
      pickupSequence: 1,
      dropSequence: 2,
      holdExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
      status: 'CONFIRMED',
    }],
    pricePerSeat: 450,
    totalSeats: corridorSeats.length,
    availableSeats: corridorSeats.length,
    seats: corridorSeats,
    status: RIDE_STATUS.SCHEDULED,
  });
  const corridorPayRef = await nextPaymentReference();
  await Booking.create({
    bookingNumber: bookingNumber(99),
    paymentReference: corridorPayRef,
    userId: customers[0]._id,
    rideId: corridorRide._id,
    isSeed: true,
    pickupLocationId: corridorPlaces[0].locationId,
    dropLocationId: corridorPlaces[1].locationId,
    pickupName: 'Richha',
    dropName: 'Delhi',
    passengers: [
      { name: 'Priya Sharma', phone: '9111100001', age: 28, seatNumber: 'A1' },
      { name: 'Aman Sharma', phone: '9111100001', age: 7, seatNumber: 'B1' },
    ],
    selectedSeats: ['A1', 'B1'],
    passengerCount: 2,
    amountPerSeat: 450,
    totalAmount: 900,
    currency: 'INR',
    paymentStatus: BOOKING_PAYMENT_STATUS.PAID,
    bookingStatus: BOOKING_STATUS.CONFIRMED,
    proofStatus: PROOF_STATUS.APPROVED,
    proofAmount: 900,
    refundStatus: REFUND_STATUS.NOT_APPLICABLE,
    holdId: 'seed-segment-1',
    holdExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
  });
  bookingCount += 1;
  routes.push(corridorRoute);
  rides.push(corridorRide);

  logger.info('seed.complete', {
    adminEmail: admin.email,
    drivers: drivers.length,
    vehicles: vehicles.length,
    routes: routes.length,
    rides: rides.length,
    customers: customers.length,
    bookings: bookingCount,
  });

  if (disconnect) {
    await disconnectDb();
  }
}
