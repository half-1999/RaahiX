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
import { SEAT_STATUS } from '../src/constants/enums.js';
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
    expect(verify.body.data.booking.bookingStatus).toBe('CONFIRMED');

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
