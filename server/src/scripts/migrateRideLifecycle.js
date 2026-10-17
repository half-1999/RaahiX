import mongoose from 'mongoose';
import {
  mapLegacyRideStatus,
  wasLegacyCancelled,
  RIDE_STATUS,
  RIDE_STATUS_CHANGE_SOURCE,
} from '../constants/enums.js';
import { logger } from '../utils/logger.js';

/**
 * Idempotent backfill: map legacy ride statuses onto SCHEDULED | ACTIVE | COMPLETED,
 * set duration / completion fields, and mark formerly cancelled rides as voided.
 */
export async function migrateRideLifecycle() {
  const col = mongoose.connection.collection('rides');
  const cursor = col.find({});
  let updated = 0;

  while (await cursor.hasNext()) {
    const doc = await cursor.next();
    const patch = {};
    const legacyStatus = doc.status;
    const canonical = mapLegacyRideStatus(legacyStatus);

    if (legacyStatus !== canonical) {
      patch.status = canonical;
    }

    if (wasLegacyCancelled(legacyStatus) && !doc.voidedAt) {
      patch.voidedAt = doc.updatedAt || doc.createdAt || new Date();
      patch.voidedReason = doc.voidedReason || 'Migrated from CANCELLED status';
    }

    if (!doc.estimatedCompletionAt && doc.arrivalTime) {
      patch.estimatedCompletionAt = doc.arrivalTime;
    }

    if (
      doc.estimatedDurationMinutes == null &&
      doc.departureTime &&
      (doc.arrivalTime || doc.estimatedCompletionAt)
    ) {
      const end = new Date(doc.arrivalTime || doc.estimatedCompletionAt).getTime();
      const start = new Date(doc.departureTime).getTime();
      if (Number.isFinite(end) && Number.isFinite(start) && end > start) {
        patch.estimatedDurationMinutes = Math.max(1, Math.round((end - start) / 60000));
      }
    }

    if (canonical === RIDE_STATUS.ACTIVE && !doc.actualStartedAt) {
      patch.actualStartedAt = doc.departureTime || doc.updatedAt || new Date();
    }

    if (canonical === RIDE_STATUS.COMPLETED && !doc.actualCompletedAt && !wasLegacyCancelled(legacyStatus)) {
      patch.actualCompletedAt = doc.updatedAt || doc.arrivalTime || new Date();
    }

    if (!doc.sourceName && doc.pickupPoint) patch.sourceName = doc.pickupPoint;
    if (!doc.destinationName && doc.dropPoint) patch.destinationName = doc.dropPoint;

    if (!Object.keys(patch).length) continue;

    if (!doc.statusHistory?.length && patch.status) {
      patch.statusHistory = [
        {
          fromStatus: legacyStatus || null,
          toStatus: patch.status || canonical,
          source: RIDE_STATUS_CHANGE_SOURCE.MANUAL,
          at: doc.updatedAt || doc.createdAt || new Date(),
          note: 'Legacy status migration',
        },
      ];
    }

    await col.updateOne({ _id: doc._id }, { $set: patch });
    updated += 1;
  }

  if (updated > 0) {
    logger.info('migrate.ride_lifecycle', { updated });
  }
  return { updated };
}
