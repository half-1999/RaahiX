import {
  setupTestDb,
  teardownTestDb,
  clearDb,
  request,
  app,
  createUser,
  loginAs,
  authHeader,
  seedRideFixture,
} from './helpers.js';
import { mockGateway } from '../src/services/payment/gateway.js';
import { releaseExpiredHolds } from '../src/services/seatService.js';
import { Ride } from '../src/models/Ride.js';
import { Booking } from '../src/models/Booking.js';
import { Payment } from '../src/models/Payment.js';
import { AuditLog } from '../src/models/AuditLog.js';
import { Notification } from '../src/models/Notification.js';
import { obligationPercent } from '../src/services/refundService.js';
import { Driver } from '../src/models/Driver.js';
import { DRIVER_STATUS, DRIVER_VERIFICATION, SEAT_STATUS } from '../src/constants/enums.js';
import crypto from 'crypto';

beforeAll(async () => {
  await setupTestDb();
});

afterAll(async () => {
  await teardownTestDb();
});

beforeEach(async () => {
  await clearDb();
});

describe('Authentication', () => {
  test('register and login', async () => {
    const reg = await request(app).post('/api/auth/register').send({
      name: 'New Customer',
      email: 'new@test.dev',
      phone: '9888800001',
      password: 'Password@123',
    });
    expect(reg.status).toBe(201);
    expect(reg.body.success).toBe(true);
    expect(reg.body.data.accessToken).toBeTruthy();

    const login = await request(app).post('/api/auth/login').send({
      email: 'new@test.dev',
      password: 'Password@123',
    });
    expect(login.status).toBe(200);
    expect(login.body.data.user.role).toBe('CUSTOMER');
  });

  test('invalid password', async () => {
    await createUser({ email: 'badpass@test.dev', phone: '9888800002' });
    const res = await request(app).post('/api/auth/login').send({
      email: 'badpass@test.dev',
      password: 'wrong-password',
    });
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('AUTH_INVALID_CREDENTIALS');
  });

  test('unauthorized API', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  test('role authorization — customer cannot access admin', async () => {
    await createUser({ email: 'cust@test.dev', phone: '9888800003' });
    const session = await loginAs('cust@test.dev');
    const res = await request(app)
      .get('/api/admin/dashboard')
      .set(authHeader(session.accessToken));
    expect(res.status).toBe(403);
  });
});

describe('Rides & seats', () => {
  test('search returns scheduled ride', async () => {
    const { searchDate } = await seedRideFixture();
    const res = await request(app).get('/api/rides/search').query({
      originCity: 'Gurugram',
      destinationCity: 'Bareilly',
      date: searchDate,
      passengers: 1,
    });
    expect(res.status).toBe(200);
    expect(res.body.data.rides.length).toBeGreaterThanOrEqual(1);
  });

  test('hold available seat and reject concurrent hold', async () => {
    const { ride, customer, customer2 } = await seedRideFixture();
    const s1 = await loginAs(customer.email);
    const s2 = await loginAs(customer2.email);

    const hold1 = await request(app)
      .post('/api/bookings/hold')
      .set(authHeader(s1.accessToken))
      .send({ rideId: ride._id.toString(), seatNumbers: ['A1'] });
    expect(hold1.status).toBeLessThan(300);
    expect(hold1.body.data.holdId).toBeTruthy();

    const hold2 = await request(app)
      .post('/api/bookings/hold')
      .set(authHeader(s2.accessToken))
      .send({ rideId: ride._id.toString(), seatNumbers: ['A1'] });
    expect(hold2.status).toBe(409);
    expect(hold2.body.code).toBe('SEAT_UNAVAILABLE');
  });

  test('release expired holds', async () => {
    const { ride, customer } = await seedRideFixture();
    const session = await loginAs(customer.email);

    const hold = await request(app)
      .post('/api/bookings/hold')
      .set(authHeader(session.accessToken))
      .send({ rideId: ride._id.toString(), seatNumbers: ['B1'] });
    expect(hold.status).toBeLessThan(300);

    await Ride.updateOne(
      { _id: ride._id, 'seats.seatNumber': 'B1' },
      { $set: { 'seats.$.holdExpiresAt': new Date(Date.now() - 1000) } }
    );

    const result = await releaseExpiredHolds();
    expect(result.seatsReleased).toBeGreaterThanOrEqual(1);

    const refreshed = await Ride.findById(ride._id);
    const seat = refreshed.seats.find((s) => s.seatNumber === 'B1');
    expect(seat.status).toBe(SEAT_STATUS.AVAILABLE);
    expect(seat.holdId).toBeNull();
  });
});

describe('Booking & payment', () => {
  test('create booking, pay, idempotent webhook', async () => {
    const { ride, customer } = await seedRideFixture();
    const session = await loginAs(customer.email);

    const hold = await request(app)
      .post('/api/bookings/hold')
      .set(authHeader(session.accessToken))
      .send({ rideId: ride._id.toString(), seatNumbers: ['A1'] });

    const bookingRes = await request(app)
      .post('/api/bookings')
      .set(authHeader(session.accessToken))
      .send({
        rideId: ride._id.toString(),
        holdId: hold.body.data.holdId,
        passengers: [{ name: 'Traveller', phone: '9000011111', age: 28, seatNumber: 'A1' }],
      });
    expect(bookingRes.status).toBe(201);
    expect(bookingRes.body.data.booking.totalAmount).toBe(700);

    const order = await request(app)
      .post('/api/payments/create-order')
      .set(authHeader(session.accessToken))
      .send({ bookingId: bookingRes.body.data.booking._id || bookingRes.body.data.booking.id });
    expect(order.status).toBe(201);
    const { gatewayOrderId, mockPaymentId, mockSignature } = order.body.data;

    const verify = await request(app)
      .post('/api/payments/verify')
      .set(authHeader(session.accessToken))
      .send({
        bookingId: bookingRes.body.data.booking._id || bookingRes.body.data.booking.id,
        razorpay_order_id: gatewayOrderId,
        razorpay_payment_id: mockPaymentId,
        razorpay_signature: mockSignature,
        mock: true,
      });
    expect(verify.status).toBe(200);
    expect(verify.body.data.booking.bookingStatus).toBe('PENDING');

    const payload = {
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: mockPaymentId,
            order_id: gatewayOrderId,
            status: 'captured',
            amount: 70000,
          },
        },
      },
    };
    const body = JSON.stringify(payload);
    const signature = crypto.createHmac('sha256', 'mock_secret').update(body).digest('hex');

    const wh1 = await request(app)
      .post('/api/payments/webhook')
      .set('Content-Type', 'application/json')
      .set('x-mock-signature', signature)
      .send(body);
    expect(wh1.status).toBe(200);

    const wh2 = await request(app)
      .post('/api/payments/webhook')
      .set('Content-Type', 'application/json')
      .set('x-mock-signature', signature)
      .send(body);
    expect(wh2.status).toBe(200);
    expect(wh2.body.success).toBe(true);
  });
});

function ridePayload(fixture, driverId) {
  const departureTime = new Date();
  departureTime.setUTCDate(departureTime.getUTCDate() + 2);
  departureTime.setUTCHours(9, 0, 0, 0);
  const arrivalTime = new Date(departureTime.getTime() + 6 * 60 * 60 * 1000);
  return {
    routeId: fixture.route._id.toString(),
    driverId: driverId.toString(),
    vehicleId: fixture.vehicle._id.toString(),
    date: departureTime.toISOString(),
    departureTime: departureTime.toISOString(),
    arrivalTime: arrivalTime.toISOString(),
    pickupPoint: 'IFFCO',
    dropPoint: 'Civil Lines',
    pricePerSeat: 700,
  };
}

describe('Driver verification gate', () => {
  test('pending, rejected, and suspended drivers cannot be assigned a ride', async () => {
    const fixture = await seedRideFixture();
    const admin = await loginAs(fixture.admin.email);

    for (const verificationStatus of [DRIVER_VERIFICATION.PENDING, DRIVER_VERIFICATION.REJECTED]) {
      await Driver.updateOne({ _id: fixture.driver._id }, { verificationStatus, status: DRIVER_STATUS.ACTIVE });
      const res = await request(app)
        .post('/api/admin/rides')
        .set(authHeader(admin.accessToken))
        .send(ridePayload(fixture, fixture.driver._id));
      expect(res.status).toBe(403);
      expect(res.body.code).toBe('DRIVER_NOT_VERIFIED');
    }

    await Driver.updateOne(
      { _id: fixture.driver._id },
      { verificationStatus: DRIVER_VERIFICATION.VERIFIED, status: DRIVER_STATUS.SUSPENDED }
    );
    const suspended = await request(app)
      .post('/api/admin/rides')
      .set(authHeader(admin.accessToken))
      .send(ridePayload(fixture, fixture.driver._id));
    expect(suspended.status).toBe(403);
    expect(suspended.body.code).toBe('DRIVER_SUSPENDED');
  });

  test('a verified active driver can be assigned a ride', async () => {
    const fixture = await seedRideFixture();
    const admin = await loginAs(fixture.admin.email);
    const res = await request(app)
      .post('/api/admin/rides')
      .set(authHeader(admin.accessToken))
      .send(ridePayload(fixture, fixture.driver._id));
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  test('suspending a driver keeps existing rides', async () => {
    const fixture = await seedRideFixture();
    const admin = await loginAs(fixture.admin.email);
    const before = await Ride.findById(fixture.ride._id);

    const res = await request(app)
      .patch(`/api/admin/drivers/${fixture.driver._id}`)
      .set(authHeader(admin.accessToken))
      .send({ status: DRIVER_STATUS.SUSPENDED, reason: 'Operations hold' });
    expect(res.status).toBe(200);

    const after = await Ride.findById(fixture.ride._id);
    expect(after).toBeTruthy();
    expect(after.status).toBe(before.status);
    expect(after.driverId.toString()).toBe(fixture.driver._id.toString());
    expect(await Ride.countDocuments({ driverId: fixture.driver._id })).toBe(1);
  });
});

describe('Driver vehicles', () => {
  test('driver manages own vehicles and cannot exceed 6 seats or edit another driver', async () => {
    const fixture = await seedRideFixture();
    const driver = await loginAs(fixture.driverUser.email);
    const other = await loginAs(fixture.otherDriverUser.email);

    const created = await request(app)
      .post('/api/driver/vehicles')
      .set(authHeader(driver.accessToken))
      .send({
        registrationNumber: 'UP25ZZ1001',
        make: 'Maruti',
        model: 'Ertiga',
        vehicleType: '6_SEATER',
      });
    expect(created.status).toBe(201);
    const vehicleId = created.body.data.vehicle._id;

    const listed = await request(app)
      .get('/api/driver/vehicles')
      .set(authHeader(driver.accessToken));
    expect(listed.status).toBe(200);
    expect(listed.body.data.vehicles.length).toBeGreaterThanOrEqual(2);

    const tooBig = await request(app)
      .post('/api/driver/vehicles')
      .set(authHeader(driver.accessToken))
      .send({
        registrationNumber: 'UP25ZZ1002',
        make: 'Force',
        model: 'Traveller',
        vehicleType: 'SUV',
        capacity: 7,
      });
    expect(tooBig.status).toBe(400);
    expect(tooBig.body.code).toBe('VEHICLE_CAPACITY_EXCEEDED');

    const foreign = await request(app)
      .patch(`/api/driver/vehicles/${fixture.vehicle._id}`)
      .set(authHeader(other.accessToken))
      .send({ model: 'Stolen' });
    expect(foreign.status).toBe(403);

    const blockedDelete = await request(app)
      .delete(`/api/driver/vehicles/${fixture.vehicle._id}`)
      .set(authHeader(driver.accessToken));
    expect(blockedDelete.status).toBe(409);
    expect(blockedDelete.body.code).toBe('VEHICLE_IN_USE');

    const stillThere = await request(app)
      .get('/api/admin/vehicles')
      .set(authHeader((await loginAs(fixture.admin.email)).accessToken));
    expect(stillThere.status).toBe(200);
    expect(stillThere.body.data.vehicles.some((v) => v._id === fixture.vehicle._id.toString() || v.id === fixture.vehicle._id.toString())).toBe(true);

    const renamed = await request(app)
      .patch(`/api/driver/vehicles/${vehicleId}`)
      .set(authHeader(driver.accessToken))
      .send({ model: 'XL6' });
    expect(renamed.status).toBe(200);
    expect(renamed.body.data.vehicle.model).toBe('XL6');

    const removed = await request(app)
      .delete(`/api/driver/vehicles/${vehicleId}`)
      .set(authHeader(driver.accessToken));
    expect(removed.status).toBe(200);
    expect(removed.body.data.vehicle.status).toBe('INACTIVE');
    expect(removed.body.data.vehicle._id).toBe(vehicleId);
  });
});

describe('Driver routes and locations', () => {
  test('spellings collapse to one location and drivers can create corridor routes', async () => {
    const fixture = await seedRideFixture();
    const driver = await loginAs(fixture.driverUser.email);
    const admin = await loginAs(fixture.admin.email);
    const { Location } = await import('../src/models/Location.js');

    const corridor = [
      { name: 'Richha', city: 'Richha', state: 'Uttar Pradesh' },
      { name: 'Delhi', city: 'Delhi', state: 'Delhi' },
      { name: 'Noida', city: 'Noida', state: 'Uttar Pradesh' },
      { name: 'Gurugram', city: 'Gurugram', state: 'Haryana' },
    ];

    const full = await request(app)
      .post('/api/driver/routes')
      .set(authHeader(driver.accessToken))
      .send({ estimatedDuration: 420, stops: corridor });
    expect(full.status).toBe(201);
    expect(full.body.data.route.origin.city).toBe('Richha');
    expect(full.body.data.route.destination.city).toBe('Gurugram');
    expect(full.body.data.route.stops).toHaveLength(2);

    const again = await request(app)
      .post('/api/driver/routes')
      .set(authHeader(driver.accessToken))
      .send({
        estimatedDuration: 180,
        stops: [
          { name: ' richha ', city: 'Richha.', state: 'Uttar Pradesh' },
          { name: 'Delhi', city: 'Delhi', state: 'Delhi' },
        ],
      });
    expect(again.status).toBe(201);

    const richhaCount = await Location.countDocuments({ normalizedName: 'richha' });
    expect(richhaCount).toBe(1);
    expect(String(again.body.data.route.origin.locationId)).toBe(
      String(full.body.data.route.origin.locationId)
    );

    const locations = await request(app)
      .get('/api/admin/locations')
      .set(authHeader(admin.accessToken));
    expect(locations.status).toBe(200);
    const gurugram = locations.body.data.locations.find((item) => item.normalizedName === 'gurugram');
    const alias = await request(app)
      .patch(`/api/admin/locations/${gurugram._id}`)
      .set(authHeader(admin.accessToken))
      .send({ aliases: ['Gurgaon'] });
    expect(alias.status).toBe(200);

    const aliased = await request(app)
      .post('/api/driver/routes')
      .set(authHeader(driver.accessToken))
      .send({
        estimatedDuration: 90,
        stops: [
          { name: 'Gurgaon', city: 'Gurugram', state: 'Haryana' },
          { name: 'Delhi', city: 'Delhi', state: 'Delhi' },
        ],
      });
    expect(aliased.status).toBe(201);
    expect(await Location.countDocuments({ normalizedName: 'gurugram' })).toBe(1);
    expect(String(aliased.body.data.route.origin.locationId)).toBe(String(gurugram._id));
  });
});

describe('Driver ride lifecycle', () => {
  function times() {
    const departureTime = new Date();
    departureTime.setUTCDate(departureTime.getUTCDate() + 3);
    departureTime.setUTCHours(6, 0, 0, 0);
    const arrivalTime = new Date(departureTime.getTime() + 5 * 60 * 60 * 1000);
    return { departureTime: departureTime.toISOString(), arrivalTime: arrivalTime.toISOString() };
  }

  test('verified drivers publish through a controlled lifecycle and cannot shrink committed seats', async () => {
    const fixture = await seedRideFixture();
    const session = await loginAs(fixture.driverUser.email);
    const createdVehicle = await request(app)
      .post('/api/driver/vehicles')
      .set(authHeader(session.accessToken))
      .send({
        registrationNumber: 'UP25AA6601',
        make: 'Maruti',
        model: 'Ertiga',
        vehicleType: '6_SEATER',
      });
    expect(createdVehicle.status).toBe(201);

    const draft = await request(app)
      .post('/api/driver/rides')
      .set(authHeader(session.accessToken))
      .send({
        routeId: fixture.route._id.toString(),
        vehicleId: createdVehicle.body.data.vehicle._id,
        pricePerSeat: 500,
        capacity: 6,
        ...times(),
      });
    expect(draft.status).toBe(201);
    expect(draft.body.data.ride.status).toBe('DRAFT');
    const rideId = draft.body.data.ride._id;

    const published = await request(app)
      .patch(`/api/driver/rides/${rideId}/status`)
      .set(authHeader(session.accessToken))
      .send({ status: 'PUBLISHED' });
    expect(published.status).toBe(200);

    const active = await request(app)
      .patch(`/api/driver/rides/${rideId}/status`)
      .set(authHeader(session.accessToken))
      .send({ status: 'ACTIVE' });
    expect(active.status).toBe(200);

    const completed = await request(app)
      .patch(`/api/driver/rides/${rideId}/status`)
      .set(authHeader(session.accessToken))
      .send({ status: 'COMPLETED' });
    expect(completed.status).toBe(200);

    const backward = await request(app)
      .patch(`/api/driver/rides/${rideId}/status`)
      .set(authHeader(session.accessToken))
      .send({ status: 'PUBLISHED' });
    expect(backward.status).toBe(400);

    const ride = await Ride.findById(rideId);
    ride.seats.forEach((seat, index) => {
      if (index < 5) seat.status = SEAT_STATUS.BOOKED;
    });
    ride.status = 'PUBLISHED';
    await ride.save();

    const shrink = await request(app)
      .patch(`/api/driver/rides/${rideId}/capacity`)
      .set(authHeader(session.accessToken))
      .send({ capacity: 4 });
    expect(shrink.status).toBe(400);
    expect(shrink.body.code).toBe('RIDE_CAPACITY_INVALID');

    await Driver.updateOne({ _id: fixture.driver._id }, { verificationStatus: DRIVER_VERIFICATION.PENDING });
    const denied = await request(app)
      .post('/api/driver/rides')
      .set(authHeader(session.accessToken))
      .send({
        routeId: fixture.route._id.toString(),
        vehicleId: fixture.vehicle._id.toString(),
        pricePerSeat: 500,
        ...times(),
      });
    expect(denied.status).toBe(403);
    expect(denied.body.code).toBe('DRIVER_NOT_VERIFIED');
  });

  test('cancelled rides cannot become active', async () => {
    const fixture = await seedRideFixture();
    const session = await loginAs(fixture.driverUser.email);
    const cancelled = await request(app)
      .patch(`/api/driver/rides/${fixture.ride._id}/status`)
      .set(authHeader(session.accessToken))
      .send({ status: 'CANCELLED' });
    expect(cancelled.status).toBe(200);

    const revived = await request(app)
      .patch(`/api/driver/rides/${fixture.ride._id}/status`)
      .set(authHeader(session.accessToken))
      .send({ status: 'ACTIVE' });
    expect(revived.status).toBe(400);
  });
});

describe('Ride segments', () => {
  test('forward segments are bookable and backward or identical stops are rejected', async () => {
    const fixture = await seedRideFixture();
    const driver = await loginAs(fixture.driverUser.email);
    const customer = await loginAs(fixture.customer.email);

    const corridor = await request(app)
      .post('/api/driver/routes')
      .set(authHeader(driver.accessToken))
      .send({
        estimatedDuration: 420,
        stops: [
          { name: 'Richha', city: 'Richha', state: 'Uttar Pradesh' },
          { name: 'Delhi', city: 'Delhi', state: 'Delhi' },
          { name: 'Noida', city: 'Noida', state: 'Uttar Pradesh' },
          { name: 'Gurugram', city: 'Gurugram', state: 'Haryana' },
        ],
      });
    expect(corridor.status).toBe(201);
    const route = corridor.body.data.route;
    const richha = route.origin.locationId;
    const delhi = route.stops[0].locationId;
    const noida = route.stops[1].locationId;

    const departureTime = new Date();
    departureTime.setUTCDate(departureTime.getUTCDate() + 2);
    departureTime.setUTCHours(7, 0, 0, 0);
    const arrivalTime = new Date(departureTime.getTime() + 6 * 60 * 60 * 1000);
    const draft = await request(app)
      .post('/api/driver/rides')
      .set(authHeader(driver.accessToken))
      .send({
        routeId: route._id,
        vehicleId: fixture.vehicle._id.toString(),
        pricePerSeat: 450,
        departureTime: departureTime.toISOString(),
        arrivalTime: arrivalTime.toISOString(),
      });
    expect(draft.status).toBe(201);
    expect(draft.body.data.ride.rideStops).toHaveLength(4);
    expect(draft.body.data.ride.rideStops[0].pickupAllowed).toBe(true);
    expect(draft.body.data.ride.rideStops[0].dropAllowed).toBe(false);
    expect(draft.body.data.ride.rideStops[3].dropAllowed).toBe(true);

    const rideId = draft.body.data.ride._id;
    const published = await request(app)
      .patch(`/api/driver/rides/${rideId}/status`)
      .set(authHeader(driver.accessToken))
      .send({ status: 'PUBLISHED' });
    expect(published.status).toBe(200);

    const search = await request(app).get('/api/rides/search').query({
      originCity: 'Delhi',
      destinationCity: 'Noida',
      date: departureTime.toISOString().slice(0, 10),
      passengers: 1,
    });
    expect(search.status).toBe(200);
    expect(search.body.data.rides.some((ride) => ride.id === rideId)).toBe(true);

    const backward = await request(app)
      .post('/api/bookings/hold')
      .set(authHeader(customer.accessToken))
      .send({
        rideId,
        seatNumbers: ['A1'],
        pickupLocationId: noida,
        dropLocationId: delhi,
      });
    expect(backward.status).toBe(400);
    expect(backward.body.code).toBe('INVALID_SEGMENT');

    const sameStop = await request(app)
      .post('/api/bookings/hold')
      .set(authHeader(customer.accessToken))
      .send({
        rideId,
        seatNumbers: ['A1'],
        pickupLocationId: delhi,
        dropLocationId: delhi,
      });
    expect(sameStop.status).toBe(400);
    expect(sameStop.body.code).toBe('INVALID_SEGMENT');

    const forward = await request(app)
      .post('/api/bookings/hold')
      .set(authHeader(customer.accessToken))
      .send({
        rideId,
        seatNumbers: ['A1'],
        pickupLocationId: richha,
        dropLocationId: noida,
      });
    expect(forward.status).toBe(201);
  });
});

describe('Segment inventory', () => {
  async function publishedCorridor(fixture, session) {
    const corridor = await request(app)
      .post('/api/driver/routes')
      .set(authHeader(session.accessToken))
      .send({
        estimatedDuration: 420,
        stops: [
          { name: 'Richha', city: 'Richha', state: 'Uttar Pradesh' },
          { name: 'Delhi', city: 'Delhi', state: 'Delhi' },
          { name: 'Noida', city: 'Noida', state: 'Uttar Pradesh' },
          { name: 'Gurugram', city: 'Gurugram', state: 'Haryana' },
        ],
      });
    const route = corridor.body.data.route;
    const vehicle = await request(app)
      .post('/api/driver/vehicles')
      .set(authHeader(session.accessToken))
      .send({
        registrationNumber: `UP25${Date.now().toString().slice(-6)}`,
        make: 'Maruti',
        model: 'Ertiga',
        vehicleType: '6_SEATER',
      });
    const departureTime = new Date();
    departureTime.setUTCDate(departureTime.getUTCDate() + 4);
    departureTime.setUTCHours(8, 0, 0, 0);
    const draft = await request(app)
      .post('/api/driver/rides')
      .set(authHeader(session.accessToken))
      .send({
        routeId: route._id,
        vehicleId: vehicle.body.data.vehicle._id,
        pricePerSeat: 400,
        capacity: 6,
        departureTime: departureTime.toISOString(),
        arrivalTime: new Date(departureTime.getTime() + 6 * 60 * 60 * 1000).toISOString(),
      });
    const rideId = draft.body.data.ride._id;
    await request(app)
      .patch(`/api/driver/rides/${rideId}/status`)
      .set(authHeader(session.accessToken))
      .send({ status: 'PUBLISHED' });
    return {
      rideId,
      date: departureTime.toISOString().slice(0, 10),
      richha: route.origin.locationId,
      delhi: route.stops[0].locationId,
      noida: route.stops[1].locationId,
      gurugram: route.destination.locationId,
    };
  }

  async function openSeats(originCity, destinationCity, date, rideId) {
    const res = await request(app).get('/api/rides/search').query({
      originCity,
      destinationCity,
      date,
      passengers: 1,
    });
    return res.body.data.rides.find((item) => item.id === rideId)?.segmentSeats;
  }

  function seats(prefix, count) {
    return Array.from({ length: count }, (_, index) => `${prefix}${index + 1}`);
  }

  test('overlapping segments share only the legs they occupy', async () => {
    const fixture = await seedRideFixture();
    const driver = await loginAs(fixture.driverUser.email);
    const customer = await loginAs(fixture.customer.email);
    const ride = await publishedCorridor(fixture, driver);

    const first = await request(app)
      .post('/api/bookings/hold')
      .set(authHeader(customer.accessToken))
      .send({
        rideId: ride.rideId,
        seatNumbers: seats('A', 2),
        pickupLocationId: ride.richha,
        dropLocationId: ride.delhi,
      });
    expect(first.status).toBe(201);
    expect(first.body.data.holdExpiresAt).toBeTruthy();

    const second = await request(app)
      .post('/api/bookings/hold')
      .set(authHeader(customer.accessToken))
      .send({
        rideId: ride.rideId,
        seatNumbers: seats('B', 2),
        pickupLocationId: ride.delhi,
        dropLocationId: ride.gurugram,
      });
    expect(second.status).toBe(201);

    expect(await openSeats('Richha', 'Delhi', ride.date, ride.rideId)).toBe(4);
    expect(await openSeats('Delhi', 'Noida', ride.date, ride.rideId)).toBe(4);
    expect(await openSeats('Noida', 'Gurugram', ride.date, ride.rideId)).toBe(4);

    const overlap = await request(app)
      .post('/api/bookings/hold')
      .set(authHeader(customer.accessToken))
      .send({
        rideId: ride.rideId,
        seatNumbers: seats('C', 2),
        pickupLocationId: ride.richha,
        dropLocationId: ride.noida,
      });
    expect(overlap.status).toBe(201);
    expect(await openSeats('Richha', 'Delhi', ride.date, ride.rideId)).toBe(2);
    expect(await openSeats('Delhi', 'Noida', ride.date, ride.rideId)).toBe(2);
    expect(await openSeats('Noida', 'Gurugram', ride.date, ride.rideId)).toBe(4);
  });

  test('concurrent holds cannot both take the last seats, and expiry releases them', async () => {
    const fixture = await seedRideFixture();
    const driver = await loginAs(fixture.driverUser.email);
    const customer = await loginAs(fixture.customer.email);
    const other = await loginAs(fixture.customer2.email);
    const ride = await publishedCorridor(fixture, driver);

    const [left, right] = await Promise.all([
      request(app)
        .post('/api/bookings/hold')
        .set(authHeader(customer.accessToken))
        .send({
          rideId: ride.rideId,
          seatNumbers: seats('A', 4),
          pickupLocationId: ride.richha,
          dropLocationId: ride.gurugram,
        }),
      request(app)
        .post('/api/bookings/hold')
        .set(authHeader(other.accessToken))
        .send({
          rideId: ride.rideId,
          seatNumbers: seats('B', 4),
          pickupLocationId: ride.richha,
          dropLocationId: ride.gurugram,
        }),
    ]);
    const statuses = [left.status, right.status].sort();
    expect(statuses).toEqual([201, 409]);
    expect(await openSeats('Richha', 'Gurugram', ride.date, ride.rideId)).toBe(2);

    const winner = left.status === 201 ? left : right;
    await Ride.updateOne(
      { _id: ride.rideId, 'segmentHolds.holdId': winner.body.data.holdId },
      { $set: { 'segmentHolds.$.holdExpiresAt': new Date(Date.now() - 1000) } }
    );
    const { releaseExpiredHolds } = await import('../src/services/seatService.js');
    await releaseExpiredHolds();
    expect(await openSeats('Richha', 'Gurugram', ride.date, ride.rideId)).toBe(6);
  });
});

const PROOF_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

describe('Direct payment, refunds, audit, and notifications', () => {
  async function openCorridor(session, hoursAhead = 48) {
    const { driver, customer } = session;
    const corridor = await request(app)
      .post('/api/driver/routes')
      .set(authHeader(driver.accessToken))
      .send({
        estimatedDuration: 420,
        stops: [
          { name: 'Richha', city: 'Richha', state: 'Uttar Pradesh' },
          { name: 'Delhi', city: 'Delhi', state: 'Delhi' },
          { name: 'Noida', city: 'Noida', state: 'Uttar Pradesh' },
          { name: 'Gurugram', city: 'Gurugram', state: 'Haryana' },
        ],
      });
    const route = corridor.body.data.route;
    const vehicle = await request(app)
      .post('/api/driver/vehicles')
      .set(authHeader(driver.accessToken))
      .send({
        registrationNumber: `UP25${Math.floor(Math.random() * 1e6).toString().padStart(6, '0')}`,
        make: 'Maruti',
        model: 'Ertiga',
        vehicleType: '6_SEATER',
      });
    const departureTime = new Date(Date.now() + hoursAhead * 60 * 60 * 1000);
    const draft = await request(app)
      .post('/api/driver/rides')
      .set(authHeader(driver.accessToken))
      .send({
        routeId: route._id,
        vehicleId: vehicle.body.data.vehicle._id,
        pricePerSeat: 500,
        capacity: 6,
        departureTime: departureTime.toISOString(),
        arrivalTime: new Date(departureTime.getTime() + 6 * 60 * 60 * 1000).toISOString(),
      });
    const rideId = draft.body.data.ride._id;
    await request(app)
      .patch(`/api/driver/rides/${rideId}/status`)
      .set(authHeader(driver.accessToken))
      .send({ status: 'PUBLISHED' });
    await request(app)
      .patch('/api/driver/payment-details')
      .set(authHeader(driver.accessToken))
      .send({ upiId: 'raj@upi', paymentInstructions: 'Pay the exact fare' });

    const hold = await request(app)
      .post('/api/bookings/hold')
      .set(authHeader(customer.accessToken))
      .send({
        rideId,
        seatNumbers: ['A1', 'A2'],
        pickupLocationId: route.origin.locationId,
        dropLocationId: route.stops[0].locationId,
      });
    const created = await request(app)
      .post('/api/bookings')
      .set(authHeader(customer.accessToken))
      .send({
        rideId,
        holdId: hold.body.data.holdId,
        passengers: [
          { name: 'Priya', phone: '9111100001', age: 28, seatNumber: 'A1' },
          { name: 'Rohan', phone: '9111100002', age: 30, seatNumber: 'A2' },
        ],
      });
    return { driver, customer, rideId, booking: created.body.data.booking, created };
  }

  async function session() {
    const fixture = await seedRideFixture();
    return {
      fixture,
      driver: await loginAs(fixture.driverUser.email),
      customer: await loginAs(fixture.customer.email),
    };
  }

  test('proof submit, approval, rejection, and a late review do not auto-confirm', async () => {
    const people = await session();
    const first = await openCorridor(people);
    expect(first.created.status).toBe(201);

    const missing = await request(app)
      .post(`/api/bookings/${first.booking._id}/payment-proof`)
      .set(authHeader(first.customer.accessToken))
      .send({});
    expect(missing.status).toBe(400);

    const submitted = await request(app)
      .post(`/api/bookings/${first.booking._id}/payment-proof`)
      .set(authHeader(first.customer.accessToken))
      .send({ screenshot: PROOF_PNG, amount: first.booking.totalAmount });
    expect(submitted.status).toBe(200);
    expect(submitted.body.data.booking.bookingStatus).toBe('PENDING');
    expect(submitted.body.data.booking.proofStatus).toBe('SUBMITTED');

    const other = await loginAs(people.fixture.otherDriverUser.email);
    const forbidden = await request(app)
      .post(`/api/driver/bookings/${first.booking._id}/review`)
      .set(authHeader(other.accessToken))
      .send({ decision: 'APPROVE' });
    expect(forbidden.status).toBe(403);

    const stranger = await loginAs(people.fixture.customer2.email);
    const hidden = await request(app)
      .get(`/api/bookings/${first.booking._id}`)
      .set(authHeader(stranger.accessToken));
    expect(hidden.status).toBe(403);

    const approved = await request(app)
      .post(`/api/driver/bookings/${first.booking._id}/review`)
      .set(authHeader(first.driver.accessToken))
      .send({ decision: 'APPROVE' });
    expect(approved.status).toBe(200);
    expect(approved.body.data.booking.bookingStatus).toBe('CONFIRMED');

    const second = await openCorridor(people);
    await request(app)
      .post(`/api/bookings/${second.booking._id}/payment-proof`)
      .set(authHeader(second.customer.accessToken))
      .send({ screenshot: PROOF_PNG });
    const rejected = await request(app)
      .post(`/api/driver/bookings/${second.booking._id}/review`)
      .set(authHeader(second.driver.accessToken))
      .send({ decision: 'REJECT', reason: 'Amount does not match' });
    expect(rejected.status).toBe(200);
    expect(rejected.body.data.booking.bookingStatus).toBe('CANCELLED');
    expect(rejected.body.data.booking.proofStatus).toBe('REJECTED');

    const late = await openCorridor(people);
    await request(app)
      .post(`/api/bookings/${late.booking._id}/payment-proof`)
      .set(authHeader(late.customer.accessToken))
      .send({ screenshot: PROOF_PNG });
    await Booking.updateOne(
      { _id: late.booking._id },
      { $set: { holdExpiresAt: new Date(Date.now() - 60 * 1000) } }
    );
    const review = await request(app)
      .post(`/api/driver/bookings/${late.booking._id}/review`)
      .set(authHeader(late.driver.accessToken))
      .send({ decision: 'APPROVE' });
    expect(review.status).toBe(409);
    const stored = await Booking.findById(late.booking._id);
    expect(stored.bookingStatus).not.toBe('CONFIRMED');

    const proof = await request(app)
      .get(`/api/bookings/${first.booking._id}/proof`)
      .set(authHeader(first.customer.accessToken));
    expect(proof.status).toBe(200);
    expect(proof.headers['content-type']).toMatch(/image\/png/);
  });

  test('refund obligation follows the timing table and is not a payout', async () => {
    expect(obligationPercent({ rideStatus: 'ACTIVE', rideCancelled: false })).toBe(0);
    expect(obligationPercent({ rideCancelled: true, rideStatus: 'ACTIVE' })).toBe(100);

    const people = await session();
    const full = await openCorridor(people, 48);
    await request(app)
      .post(`/api/bookings/${full.booking._id}/payment-proof`)
      .set(authHeader(full.customer.accessToken))
      .send({ screenshot: PROOF_PNG });
    await request(app)
      .post(`/api/driver/bookings/${full.booking._id}/review`)
      .set(authHeader(full.driver.accessToken))
      .send({ decision: 'APPROVE' });
    const fullCancel = await request(app)
      .post(`/api/bookings/${full.booking._id}/cancel`)
      .set(authHeader(full.customer.accessToken))
      .send({ reason: 'Plans changed' });
    expect(fullCancel.status).toBe(200);
    expect(fullCancel.body.data.booking.refundAmount).toBe(full.booking.totalAmount);
    expect(fullCancel.body.data.booking.refundStatus).toBe('PENDING');

    const half = await openCorridor(people, 10);
    await request(app)
      .post(`/api/bookings/${half.booking._id}/payment-proof`)
      .set(authHeader(half.customer.accessToken))
      .send({ screenshot: PROOF_PNG });
    await request(app)
      .post(`/api/driver/bookings/${half.booking._id}/review`)
      .set(authHeader(half.driver.accessToken))
      .send({ decision: 'APPROVE' });
    const halfCancel = await request(app)
      .post(`/api/bookings/${half.booking._id}/cancel`)
      .set(authHeader(half.customer.accessToken))
      .send({});
    expect(halfCancel.body.data.booking.refundAmount).toBe(half.booking.totalAmount / 2);
    expect(halfCancel.body.data.booking.refundStatus).toBe('PENDING');

    const none = await openCorridor(people, 2);
    await request(app)
      .post(`/api/bookings/${none.booking._id}/payment-proof`)
      .set(authHeader(none.customer.accessToken))
      .send({ screenshot: PROOF_PNG });
    await request(app)
      .post(`/api/driver/bookings/${none.booking._id}/review`)
      .set(authHeader(none.driver.accessToken))
      .send({ decision: 'APPROVE' });
    const noneCancel = await request(app)
      .post(`/api/bookings/${none.booking._id}/cancel`)
      .set(authHeader(none.customer.accessToken))
      .send({});
    expect(noneCancel.body.data.booking.refundAmount).toBe(0);
    expect(noneCancel.body.data.booking.refundStatus).toBe('NOT_APPLICABLE');
    expect(await Payment.countDocuments({ bookingId: none.booking._id })).toBe(0);

    const kept = await Booking.findById(full.booking._id);
    expect(kept).toBeTruthy();
    expect(kept.bookingStatus).toBe('CANCELLED');

    const admin = await loginAs(people.fixture.admin.email);
    const missingReason = await request(app)
      .patch(`/api/admin/bookings/${full.booking._id}/refund`)
      .set(authHeader(admin.accessToken))
      .send({ refundStatus: 'COMPLETED' });
    expect(missingReason.status).toBe(400);
    const updated = await request(app)
      .patch(`/api/admin/bookings/${full.booking._id}/refund`)
      .set(authHeader(admin.accessToken))
      .send({ refundStatus: 'COMPLETED', refundReference: 'UPI-REF-1', reason: 'Driver paid the customer' });
    expect(updated.status).toBe(200);
    expect(updated.body.data.booking.refundStatus).toBe('COMPLETED');
    const audit = await AuditLog.findOne({ action: 'REFUND_STATUS_CHANGED', entityId: String(full.booking._id) });
    expect(audit.reason).toBe('Driver paid the customer');
    expect(audit.oldValue.refundStatus).toBe('PENDING');
    expect(audit.newValue.refundStatus).toBe('COMPLETED');

    const rideCancel = await openCorridor(people, 30);
    await request(app)
      .post(`/api/bookings/${rideCancel.booking._id}/payment-proof`)
      .set(authHeader(rideCancel.customer.accessToken))
      .send({ screenshot: PROOF_PNG });
    await request(app)
      .post(`/api/driver/bookings/${rideCancel.booking._id}/review`)
      .set(authHeader(rideCancel.driver.accessToken))
      .send({ decision: 'APPROVE' });
    const cancelledRide = await request(app)
      .patch(`/api/driver/rides/${rideCancel.rideId}/status`)
      .set(authHeader(rideCancel.driver.accessToken))
      .send({ status: 'CANCELLED' });
    expect(cancelledRide.status).toBe(200);
    const history = await Booking.findById(rideCancel.booking._id);
    expect(history.bookingStatus).toBe('CANCELLED');
    expect(history.refundAmount).toBe(rideCancel.booking.totalAmount);
    expect(history.refundStatus).toBe('PENDING');
  });

  test('notifications are stored for the right user and email failure does not undo approval', async () => {
    const people = await session();
    const opened = await openCorridor(people);
    await request(app)
      .post(`/api/bookings/${opened.booking._id}/payment-proof`)
      .set(authHeader(opened.customer.accessToken))
      .send({ screenshot: PROOF_PNG });
    process.env.EMAIL_FORCE_FAIL = '1';
    const approved = await request(app)
      .post(`/api/driver/bookings/${opened.booking._id}/review`)
      .set(authHeader(opened.driver.accessToken))
      .send({ decision: 'APPROVE' });
    delete process.env.EMAIL_FORCE_FAIL;
    expect(approved.status).toBe(200);
    expect(approved.body.data.booking.bookingStatus).toBe('CONFIRMED');

    const customerNotes = await Notification.find({ userId: people.fixture.customer._id, channel: 'IN_APP' });
    const driverNotes = await Notification.find({ userId: people.fixture.driverUser._id, channel: 'IN_APP' });
    expect(customerNotes.some((note) => note.type === 'BOOKING_CREATED')).toBe(true);
    expect(customerNotes.some((note) => note.type === 'PAYMENT_APPROVED')).toBe(true);
    expect(driverNotes.some((note) => note.type === 'PAYMENT_SUBMITTED')).toBe(true);
    expect(driverNotes.some((note) => note.type === 'UPCOMING_RIDE')).toBe(true);
    const failedEmail = await Notification.findOne({
      userId: people.fixture.customer._id,
      channel: 'EMAIL',
      type: 'PAYMENT_APPROVED',
    });
    expect(failedEmail.status).toBe('FAILED');

    const inbox = await request(app)
      .get('/api/notifications')
      .set(authHeader(people.customer.accessToken));
    expect(inbox.status).toBe(200);
    expect(inbox.body.data.notifications.length).toBeGreaterThan(0);
  });
});

describe('Driver authorization', () => {
  test('driver cannot access another driver ride', async () => {
    const { ride, otherDriverUser } = await seedRideFixture();
    const session = await loginAs(otherDriverUser.email);
    const res = await request(app)
      .get(`/api/driver/rides/${ride._id}`)
      .set(authHeader(session.accessToken));
    expect([403, 404]).toContain(res.status);
  });
});

// silence unused in case tree-shaking
void mockGateway;
