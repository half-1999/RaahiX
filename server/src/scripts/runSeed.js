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

function daysFromNow(days, hour = 8, minute = 0) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  d.setUTCHours(hour, minute, 0, 0);
  return d;
}

function bookingNumber(suffix) {
  return `BKSEED${String(suffix).padStart(4, '0')}`;
}

export async function runSeed({ disconnect = true, connect = true } = {}) {
  if (connect) {
    await connectDb();
  }

  logger.info('seed.start', {});

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

  const passwordHash = {
    admin: await bcrypt.hash(config.seed.adminPassword, 10),
    driver: await bcrypt.hash('Driver@12345', 10),
    customer: await bcrypt.hash('Customer@12345', 10),
  };

  const admin = await User.create({
    name: 'Ops Admin',
    email: config.seed.adminEmail.toLowerCase(),
    phone: '9000000001',
    passwordHash: passwordHash.admin,
    role: ROLES.ADMIN,
    status: USER_STATUS.ACTIVE,
    emailVerified: true,
  });

  const driverSpecs = [
    { name: 'Raj Kumar', phone: '9000001001', email: 'raj.driver@localcab.dev', license: 'DL-07-2024001' },
    { name: 'Amit Singh', phone: '9000001002', email: 'amit.driver@localcab.dev', license: 'UP-25-2024002' },
  ];

  const drivers = [];
  for (const spec of driverSpecs) {
    const user = await User.create({
      name: spec.name,
      email: spec.email,
      phone: spec.phone,
      passwordHash: passwordHash.driver,
      role: ROLES.DRIVER,
      status: USER_STATUS.ACTIVE,
      emailVerified: true,
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
    {
      origin: { city: 'Gurugram', state: 'Haryana' },
      destination: { city: 'Bareilly', state: 'Uttar Pradesh' },
      stops: [{ name: 'Moradabad Bypass', city: 'Moradabad', state: 'Uttar Pradesh', sequence: 1 }],
      estimatedDuration: 360,
    },
    {
      origin: { city: 'Delhi', state: 'Delhi' },
      destination: { city: 'Bareilly', state: 'Uttar Pradesh' },
      stops: [],
      estimatedDuration: 390,
    },
    {
      origin: { city: 'Gurugram', state: 'Haryana' },
      destination: { city: 'Haldwani', state: 'Uttarakhand' },
      stops: [{ name: 'Rampur', city: 'Rampur', state: 'Uttar Pradesh', sequence: 1 }],
      estimatedDuration: 420,
    },
  ];

  const routes = [];
  for (const def of routeDefs) {
    routes.push(await Route.create({ ...def, status: ROUTE_STATUS.ACTIVE }));
  }

  const rideTemplates = [
    { route: 0, price: 700, pickup: 'IFFCO Chowk Metro', drop: 'Civil Lines Bareilly' },
    { route: 0, price: 750, pickup: 'Cyber Hub', drop: 'Bareilly Bus Stand' },
    { route: 1, price: 800, pickup: 'Kashmere Gate', drop: 'Civil Lines Bareilly' },
    { route: 1, price: 780, pickup: 'Anand Vihar ISBT', drop: 'Bareilly Junction' },
    { route: 2, price: 900, pickup: 'MG Road Gurugram', drop: 'Haldwani Tallital' },
    { route: 2, price: 950, pickup: 'Sector 29', drop: 'Kathgodam Side' },
  ];
  const departureHours = [6, 7, 8, 9, 10, 14, 16, 18];

  const ridePlans = [];
  for (let i = 0; i < 20; i += 1) {
    const template = rideTemplates[i % rideTemplates.length];
    const driver = i % 2;
    ridePlans.push({
      ...template,
      driver,
      vehicle: driver,
      // Include today (day 0) so home/search and driver "today" are not empty.
      day: Math.floor(i / 2),
      hour: departureHours[i % departureHours.length],
      price: template.price + (i % 3) * 25,
    });
  }

  const rides = [];
  for (const plan of ridePlans) {
    let day = plan.day;
    let hour = plan.hour;
    // Keep "today" departures in the future so search/driver dashboards are usable.
    if (day === 0) {
      const now = new Date();
      const minHour = now.getUTCHours() + 1;
      if (hour <= minHour) hour = Math.min(23, minHour + (plan.hour % 3));
      if (hour <= now.getUTCHours()) {
        day = 1;
        hour = plan.hour;
      }
    }
    const departureTime = daysFromNow(day, hour, 0);
    const arrivalTime = new Date(departureTime.getTime() + routes[plan.route].estimatedDuration * 60 * 1000);
    const seatConfiguration = vehicles[plan.vehicle].seatConfiguration.map((s) => s.toObject?.() || { ...s });
    const seats = buildSeats(seatConfiguration);
    rides.push(
      await Ride.create({
        routeId: routes[plan.route]._id,
        driverId: drivers[plan.driver]._id,
        vehicleId: vehicles[plan.vehicle]._id,
        date: new Date(Date.UTC(departureTime.getUTCFullYear(), departureTime.getUTCMonth(), departureTime.getUTCDate())),
        departureTime,
        arrivalTime,
        pickupPoint: plan.pickup,
        dropPoint: plan.drop,
        pricePerSeat: plan.price,
        totalSeats: seats.length,
        availableSeats: seats.length,
        seats,
        status: RIDE_STATUS.SCHEDULED,
      })
    );
  }

  const customerSpecs = [
    { name: 'Priya Sharma', email: 'priya.customer@localcab.dev', phone: '9111100001' },
    { name: 'Rohan Mehta', email: 'rohan.customer@localcab.dev', phone: '9111100002' },
    { name: 'Sneha Patel', email: 'sneha.customer@localcab.dev', phone: '9111100003' },
    { name: 'Vikram Joshi', email: 'vikram.customer@localcab.dev', phone: '9111100004' },
  ];

  const customers = [];
  for (const spec of customerSpecs) {
    customers.push(
      await User.create({
        name: spec.name,
        email: spec.email,
        phone: spec.phone,
        passwordHash: passwordHash.customer,
        role: ROLES.CUSTOMER,
        status: USER_STATUS.ACTIVE,
        emailVerified: true,
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

    const booking = await Booking.create({
      bookingNumber: bookingNumber(i + 1),
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
      amount: totalAmount,
      currency: 'INR',
      gateway: 'razorpay',
      gatewayOrderId: `order_seed_${i + 1}`,
      gatewayPaymentId: `pay_seed_${i + 1}`,
      status: PAYMENT_STATUS.SUCCESS,
      paidAt: new Date(),
    });

    bookingCount += 1;
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
    status: RIDE_STATUS.PUBLISHED,
  });
  await Booking.create({
    bookingNumber: bookingNumber(99),
    userId: customers[0]._id,
    rideId: corridorRide._id,
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
