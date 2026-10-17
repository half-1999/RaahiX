import {
  setupTestDb,
  teardownTestDb,
  clearDb,
  seedRideFixture,
  loginAs,
  authHeader,
  request,
  app,
} from './helpers.js';
import { nextPaymentReference } from '../src/models/Counter.js';
import { Booking } from '../src/models/Booking.js';
import { BOOKING_STATUS, PROOF_STATUS } from '../src/constants/enums.js';

beforeAll(async () => {
  await setupTestDb();
});

afterAll(async () => {
  await teardownTestDb();
});

beforeEach(async () => {
  await clearDb();
});

describe('RAAHIX payment references', () => {
  test('allocates unique sequential RAAHIX ids under concurrency', async () => {
    const ids = await Promise.all(Array.from({ length: 20 }, () => nextPaymentReference()));
    expect(new Set(ids).size).toBe(20);
    ids.forEach((id) => expect(id).toMatch(/^RAAHIX\d{6}$/));
  });

  test('proof submit assigns RAAHIX reference and extends verification hold', async () => {
    const { ride, customer } = await seedRideFixture();
    const session = await loginAs(customer.email);
    const hold = await request(app)
      .post('/api/bookings/hold')
      .set(authHeader(session.accessToken))
      .send({ rideId: ride._id.toString(), seatNumbers: ['A1'] });
    expect(hold.status).toBe(201);

    const created = await request(app)
      .post('/api/bookings')
      .set(authHeader(session.accessToken))
      .send({
        rideId: ride._id.toString(),
        holdId: hold.body.data.holdId,
        passengers: [{ name: 'Test Pax', phone: '9111100099', age: 30, seatNumber: 'A1' }],
      });
    expect(created.status).toBe(201);
    const bookingId = created.body.data.booking._id;

    const png =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
    const proof = await request(app)
      .post(`/api/bookings/${bookingId}/payment-proof`)
      .set(authHeader(session.accessToken))
      .send({ screenshot: png, amount: created.body.data.booking.totalAmount });
    expect(proof.status).toBe(200);

    const booking = await Booking.findById(bookingId);
    expect(booking.paymentReference).toMatch(/^RAAHIX\d{6}$/);
    expect(booking.proofStatus).toBe(PROOF_STATUS.SUBMITTED);
    expect(booking.bookingStatus).toBe(BOOKING_STATUS.PENDING);
    expect(booking.verificationHoldUntil).toBeTruthy();
    expect(new Date(booking.holdExpiresAt).getTime()).toBeGreaterThan(Date.now() + 5 * 60 * 1000);
  });
});
