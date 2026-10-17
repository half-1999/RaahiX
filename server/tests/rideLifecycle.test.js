import {
  setupTestDb,
  teardownTestDb,
  clearDb,
  seedRideFixture,
} from './helpers.js';
import { Ride } from '../src/models/Ride.js';
import { RIDE_STATUS } from '../src/constants/enums.js';
import {
  activateDueRides,
  completeDueRides,
  reconcileRideLifecycle,
} from '../src/services/rideLifecycleService.js';
import { resolveLocation } from '../src/services/locationService.js';

beforeAll(async () => {
  await setupTestDb();
});

afterAll(async () => {
  await teardownTestDb();
});

beforeEach(async () => {
  await clearDb();
});

describe('Ride lifecycle automation', () => {
  test('future ride starts as scheduled and activates at departure', async () => {
    const { ride } = await seedRideFixture();
    expect(ride.status).toBe(RIDE_STATUS.SCHEDULED);

    const past = new Date(Date.now() - 60_000);
    await Ride.updateOne(
      { _id: ride._id },
      {
        departureTime: past,
        estimatedCompletionAt: new Date(past.getTime() + 6 * 60 * 60 * 1000),
        arrivalTime: new Date(past.getTime() + 6 * 60 * 60 * 1000),
        estimatedDurationMinutes: 360,
      }
    );

    const result = await activateDueRides(new Date());
    expect(result.activated).toBeGreaterThanOrEqual(1);

    const updated = await Ride.findById(ride._id);
    expect(updated.status).toBe(RIDE_STATUS.ACTIVE);
    expect(updated.actualStartedAt).toBeTruthy();
    expect(updated.statusChangeSource).toBe('AUTOMATIC');
  });

  test('active ride completes when estimated completion elapses', async () => {
    const { ride } = await seedRideFixture();
    const started = new Date(Date.now() - 7 * 60 * 60 * 1000);
    const done = new Date(Date.now() - 60_000);
    await Ride.updateOne(
      { _id: ride._id },
      {
        status: RIDE_STATUS.ACTIVE,
        departureTime: started,
        actualStartedAt: started,
        estimatedDurationMinutes: 360,
        estimatedCompletionAt: done,
        arrivalTime: done,
        voidedAt: null,
      }
    );

    const result = await completeDueRides(new Date());
    expect(result.completed).toBeGreaterThanOrEqual(1);

    const updated = await Ride.findById(ride._id);
    expect(updated.status).toBe(RIDE_STATUS.COMPLETED);
    expect(updated.actualCompletedAt).toBeTruthy();
  });

  test('completed ride is not reactivated by a delayed job', async () => {
    const { ride } = await seedRideFixture();
    const past = new Date(Date.now() - 60_000);
    await Ride.updateOne(
      { _id: ride._id },
      {
        status: RIDE_STATUS.COMPLETED,
        departureTime: past,
        actualCompletedAt: past,
        estimatedCompletionAt: past,
        voidedAt: null,
      }
    );

    const again = await reconcileRideLifecycle(new Date());
    expect(again.activated).toBe(0);

    const updated = await Ride.findById(ride._id);
    expect(updated.status).toBe(RIDE_STATUS.COMPLETED);
  });

  test('midnight next-day completion works from duration', async () => {
    const { ride } = await seedRideFixture();
    const departure = new Date();
    departure.setHours(22, 0, 0, 0);
    departure.setDate(departure.getDate() - 1);
    const estimated = new Date(departure.getTime() + 6 * 60 * 60 * 1000);
    await Ride.updateOne(
      { _id: ride._id },
      {
        status: RIDE_STATUS.ACTIVE,
        departureTime: departure,
        actualStartedAt: departure,
        estimatedDurationMinutes: 360,
        estimatedCompletionAt: estimated,
        arrivalTime: estimated,
      }
    );

    await completeDueRides(new Date());
    const updated = await Ride.findById(ride._id);
    expect(updated.status).toBe(RIDE_STATUS.COMPLETED);
    expect(new Date(updated.estimatedCompletionAt).getHours()).toBe(4);
  });
});

describe('Dynamic locations', () => {
  test('equivalent spellings reuse one location; different cities stay distinct', async () => {
    const a = await resolveLocation({ name: 'Noida', city: 'Noida', state: 'Uttar Pradesh' });
    const b = await resolveLocation({ name: 'noida', city: 'NOIDA', state: 'uttar pradesh' });
    expect(String(a._id)).toBe(String(b._id));

    const c = await resolveLocation({ name: 'Noida', city: 'Noida', state: 'Delhi' });
    expect(String(c._id)).not.toBe(String(a._id));
  });
});
