import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import app from '../src/app.js';
import { config } from '../src/config/index.js';
import { User } from '../src/models/User.js';
import { Driver } from '../src/models/Driver.js';
import { Vehicle } from '../src/models/Vehicle.js';
import { Route } from '../src/models/Route.js';
import { Ride } from '../src/models/Ride.js';
import {
  DRIVER_STATUS,
  DRIVER_VERIFICATION,
  ROLES,
  ROUTE_STATUS,
  RIDE_STATUS,
  SEAT_STATUS,
  USER_STATUS,
  VEHICLE_STATUS,
} from '../src/constants/enums.js';
import { setGateway, mockGateway } from '../src/services/payment/gateway.js';

let mongo;

export async function setupTestDb() {
  process.env.NODE_ENV = 'test';
  process.env.PAYMENT_GATEWAY = 'mock';
  process.env.JWT_ACCESS_SECRET = 'test_access_secret_at_least_32_chars';
  process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_at_least_32_chars';
  process.env.PAYMENT_KEY_SECRET = 'mock_secret';
  process.env.PAYMENT_WEBHOOK_SECRET = 'mock_secret';

  config.env = 'test';
  config.payment.gateway = 'mock';
  config.payment.keySecret = 'mock_secret';
  config.payment.webhookSecret = 'mock_secret';
  config.holdDurationMinutes = 10;

  setGateway(mockGateway);

  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri('cab_test'));
}

export async function teardownTestDb() {
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
}

export async function clearDb() {
  const collections = mongoose.connection.collections;
  for (const key of Object.keys(collections)) {
    await collections[key].deleteMany({});
  }
}

export { request, app };

export async function createUser({
  name = 'Test User',
  email,
  phone,
  password = 'Password@123',
  role = ROLES.CUSTOMER,
} = {}) {
  return User.create({
    name,
    email: email.toLowerCase(),
    phone,
    passwordHash: await bcrypt.hash(password, 10),
    role,
    status: USER_STATUS.ACTIVE,
  });
}

export async function loginAs(email, password = 'Password@123') {
  const res = await request(app).post('/api/auth/login').send({ email, password });
  return res.body.data;
}

export function authHeader(accessToken) {
  return { Authorization: `Bearer ${accessToken}` };
}

export function fourSeats() {
  return [
    { seatNumber: 'A1', row: 1, position: 'LEFT' },
    { seatNumber: 'A2', row: 1, position: 'RIGHT' },
    { seatNumber: 'B1', row: 2, position: 'LEFT' },
    { seatNumber: 'B2', row: 2, position: 'RIGHT' },
  ];
}

export async function seedRideFixture() {
  const admin = await createUser({
    name: 'Admin',
    email: 'admin@test.dev',
    phone: '9000000001',
    role: ROLES.ADMIN,
  });

  const driverUser = await createUser({
    name: 'Driver One',
    email: 'driver1@test.dev',
    phone: '9000001001',
    role: ROLES.DRIVER,
  });

  const otherDriverUser = await createUser({
    name: 'Driver Two',
    email: 'driver2@test.dev',
    phone: '9000001002',
    role: ROLES.DRIVER,
  });

  const driver = await Driver.create({
    userId: driverUser._id,
    name: driverUser.name,
    phone: driverUser.phone,
    licenseNumber: 'LIC-001',
    verificationStatus: DRIVER_VERIFICATION.VERIFIED,
    status: DRIVER_STATUS.ACTIVE,
  });

  const otherDriver = await Driver.create({
    userId: otherDriverUser._id,
    name: otherDriverUser.name,
    phone: otherDriverUser.phone,
    licenseNumber: 'LIC-002',
    verificationStatus: DRIVER_VERIFICATION.VERIFIED,
    status: DRIVER_STATUS.ACTIVE,
  });

  const vehicle = await Vehicle.create({
    driverId: driver._id,
    registrationNumber: 'TEST0001',
    make: 'Maruti',
    model: 'Dzire',
    vehicleType: 'SEDAN',
    capacity: 4,
    seatConfiguration: fourSeats(),
    status: VEHICLE_STATUS.ACTIVE,
  });

  const route = await Route.create({
    origin: { city: 'Gurugram', state: 'Haryana' },
    destination: { city: 'Bareilly', state: 'Uttar Pradesh' },
    stops: [],
    estimatedDuration: 360,
    status: ROUTE_STATUS.ACTIVE,
  });

  // Fixed UTC departure tomorrow 08:00Z for stable search tests
  const departureTime = new Date();
  departureTime.setUTCDate(departureTime.getUTCDate() + 1);
  departureTime.setUTCHours(8, 0, 0, 0);
  const arrivalTime = new Date(departureTime.getTime() + 6 * 60 * 60 * 1000);
  const dateOnly = new Date(
    Date.UTC(departureTime.getUTCFullYear(), departureTime.getUTCMonth(), departureTime.getUTCDate())
  );

  const seats = fourSeats().map((s) => ({
    ...s,
    status: SEAT_STATUS.AVAILABLE,
  }));

  const ride = await Ride.create({
    routeId: route._id,
    driverId: driver._id,
    vehicleId: vehicle._id,
    date: dateOnly,
    departureTime,
    arrivalTime,
    pickupPoint: 'IFFCO',
    dropPoint: 'Civil Lines',
    pricePerSeat: 700,
    totalSeats: 4,
    availableSeats: 4,
    seats,
    status: RIDE_STATUS.SCHEDULED,
  });

  const customer = await createUser({
    name: 'Customer One',
    email: 'customer1@test.dev',
    phone: '9111100001',
  });

  const customer2 = await createUser({
    name: 'Customer Two',
    email: 'customer2@test.dev',
    phone: '9111100002',
  });

  return {
    admin,
    driver,
    driverUser,
    otherDriver,
    otherDriverUser,
    vehicle,
    route,
    ride,
    customer,
    customer2,
    searchDate: departureTime.toISOString().slice(0, 10),
  };
}
