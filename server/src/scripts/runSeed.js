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
import {
  DRIVER_STATUS,
  DRIVER_VERIFICATION,
  ROLES,
  ROUTE_STATUS,
  RIDE_STATUS,
  SEAT_STATUS,
  USER_STATUS,
  VEHICLE_STATUS,
} from '../constants/enums.js';
import { logger } from '../utils/logger.js';
import { connectDb, disconnectDb } from '../config/db.js';

function fourSeatConfig() {
  return [
    { seatNumber: 'A1', row: 1, position: 'LEFT' },
    { seatNumber: 'A2', row: 1, position: 'RIGHT' },
    { seatNumber: 'B1', row: 2, position: 'LEFT' },
    { seatNumber: 'B2', row: 2, position: 'RIGHT' },
  ];
}

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
  ]);

  const admin = await User.create({
    name: 'Ops Admin',
    email: config.seed.adminEmail.toLowerCase(),
    phone: '9000000001',
    passwordHash: await bcrypt.hash(config.seed.adminPassword, 12),
    role: ROLES.ADMIN,
    status: USER_STATUS.ACTIVE,
    emailVerified: true,
  });

  const driverSpecs = [
    { name: 'Raj Kumar', phone: '9000001001', email: 'raj.driver@localcab.dev', license: 'DL-07-2024001' },
    { name: 'Amit Singh', phone: '9000001002', email: 'amit.driver@localcab.dev', license: 'UP-25-2024002' },
    { name: 'Neha Verma', phone: '9000001003', email: 'neha.driver@localcab.dev', license: 'UK-05-2024003' },
  ];

  const drivers = [];
  for (const spec of driverSpecs) {
    const user = await User.create({
      name: spec.name,
      email: spec.email,
      phone: spec.phone,
      passwordHash: await bcrypt.hash('Driver@12345', 12),
      role: ROLES.DRIVER,
      status: USER_STATUS.ACTIVE,
    });
    drivers.push(
      await Driver.create({
        userId: user._id,
        name: spec.name,
        phone: spec.phone,
        licenseNumber: spec.license,
        verificationStatus: DRIVER_VERIFICATION.VERIFIED,
        status: DRIVER_STATUS.ACTIVE,
        rating: 4.6,
        totalTrips: 12,
      })
    );
  }

  const vehicleSpecs = [
    { make: 'Maruti', model: 'Dzire', type: 'SEDAN', reg: 'DL01AB1001' },
    { make: 'Hyundai', model: 'Aura', type: 'SEDAN', reg: 'UP25CD2002' },
    { make: 'Toyota', model: 'Etios', type: 'SEDAN', reg: 'UK05EF3003' },
  ];

  const vehicles = [];
  for (let i = 0; i < vehicleSpecs.length; i += 1) {
    const v = vehicleSpecs[i];
    const seats = fourSeatConfig();
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

  const ridePlans = [
    { route: 0, driver: 0, vehicle: 0, day: 1, hour: 8, price: 700, pickup: 'IFFCO Chowk Metro', drop: 'Civil Lines Bareilly' },
    { route: 0, driver: 1, vehicle: 1, day: 1, hour: 14, price: 750, pickup: 'Cyber Hub', drop: 'Bareilly Bus Stand' },
    { route: 1, driver: 1, vehicle: 1, day: 2, hour: 7, price: 800, pickup: 'Kashmere Gate', drop: 'Civil Lines Bareilly' },
    { route: 2, driver: 2, vehicle: 2, day: 2, hour: 6, price: 900, pickup: 'MG Road Gurugram', drop: 'Haldwani Tallital' },
    { route: 2, driver: 0, vehicle: 0, day: 3, hour: 9, price: 950, pickup: 'Sector 29', drop: 'Kathgodam Side' },
  ];

  for (const plan of ridePlans) {
    const departureTime = daysFromNow(plan.day, plan.hour, 0);
    const arrivalTime = new Date(departureTime.getTime() + routes[plan.route].estimatedDuration * 60 * 1000);
    const seatConfiguration = vehicles[plan.vehicle].seatConfiguration.map((s) => s.toObject?.() || { ...s });
    const seats = buildSeats(seatConfiguration);
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
    });
  }

  for (let i = 1; i <= 5; i += 1) {
    await User.create({
      name: `Customer ${i}`,
      email: `customer${i}@localcab.dev`,
      phone: `911110000${i}`,
      passwordHash: await bcrypt.hash('Customer@12345', 12),
      role: ROLES.CUSTOMER,
      status: USER_STATUS.ACTIVE,
    });
  }

  logger.info('seed.complete', {
    adminEmail: admin.email,
    drivers: drivers.length,
    vehicles: vehicles.length,
    routes: routes.length,
    rides: ridePlans.length,
    customers: 5,
  });

  if (disconnect) {
    await disconnectDb();
  }
}
