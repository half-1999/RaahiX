import mongoose from 'mongoose';
import { Ride } from '../models/Ride.js';
import { Driver } from '../models/Driver.js';
import {
  RIDE_STATUS,
  RIDE_STATUS_CHANGE_SOURCE,
} from '../constants/enums.js';
import { logger } from '../utils/logger.js';

function appendHistory(ride, fromStatus, toStatus, source, note) {
  ride.statusHistory = ride.statusHistory || [];
  ride.statusHistory.push({
    fromStatus,
    toStatus,
    source,
    at: new Date(),
    note: note || null,
  });
  ride.statusChangedAt = new Date();
  ride.statusChangeSource = source;
}

/**
 * Atomic conditional transition. Returns updated ride or null if already transitioned.
 */
export async function transitionRide(rideId, fromStatus, toStatus, { source, note, extra = {} } = {}) {
  const now = new Date();
  const set = {
    status: toStatus,
    statusChangedAt: now,
    statusChangeSource: source,
    ...extra,
  };

  const updated = await Ride.findOneAndUpdate(
    {
      _id: rideId,
      status: fromStatus,
      voidedAt: null,
    },
    {
      $set: set,
      $push: {
        statusHistory: {
          fromStatus,
          toStatus,
          source,
          at: now,
          note: note || null,
        },
      },
    },
    { new: true }
  );

  return updated;
}

export async function activateDueRides(now = new Date()) {
  const due = await Ride.find({
    status: RIDE_STATUS.SCHEDULED,
    voidedAt: null,
    departureTime: { $lte: now },
  }).limit(200);

  let activated = 0;
  for (const ride of due) {
    const updated = await transitionRide(ride._id, RIDE_STATUS.SCHEDULED, RIDE_STATUS.ACTIVE, {
      source: RIDE_STATUS_CHANGE_SOURCE.AUTOMATIC,
      note: 'Departure time reached',
      extra: { actualStartedAt: ride.actualStartedAt || now },
    });
    if (!updated) continue;
    activated += 1;
    try {
      const driver = await Driver.findById(updated.driverId);
      if (driver?.userId) {
        const { notifyRideActivated } = await import('./notificationService.js');
        await notifyRideActivated(driver.userId, updated);
      }
    } catch (err) {
      logger.error('ride.activate_notify_failed', { rideId: String(ride._id), message: err.message });
    }
  }
  return { activated };
}

export async function completeDueRides(now = new Date()) {
  const due = await Ride.find({
    status: RIDE_STATUS.ACTIVE,
    voidedAt: null,
    $or: [
      { estimatedCompletionAt: { $lte: now } },
      {
        estimatedCompletionAt: null,
        arrivalTime: { $lte: now },
      },
    ],
  }).limit(200);

  let completed = 0;
  for (const ride of due) {
    const updated = await transitionRide(ride._id, RIDE_STATUS.ACTIVE, RIDE_STATUS.COMPLETED, {
      source: RIDE_STATUS_CHANGE_SOURCE.AUTOMATIC,
      note: 'Estimated journey duration elapsed',
      extra: { actualCompletedAt: now },
    });
    if (!updated) continue;
    completed += 1;
    try {
      const driver = await Driver.findById(updated.driverId);
      if (driver) {
        driver.totalTrips = (driver.totalTrips || 0) + 1;
        await driver.save();
        if (driver.userId) {
          const { notifyRideCompleted } = await import('./notificationService.js');
          await notifyRideCompleted(driver.userId, updated);
        }
      }
    } catch (err) {
      logger.error('ride.complete_notify_failed', { rideId: String(ride._id), message: err.message });
    }
  }
  return { completed };
}

export async function reconcileRideLifecycle(now = new Date()) {
  const session = await mongoose.startSession().catch(() => null);
  try {
    const activated = await activateDueRides(now);
    const completed = await completeDueRides(now);
    if (activated.activated || completed.completed) {
      logger.info('job.rideLifecycle', { ...activated, ...completed });
    }
    return { ...activated, ...completed };
  } finally {
    if (session) await session.endSession();
  }
}

export { appendHistory };
