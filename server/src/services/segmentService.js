import { v4 as uuidv4 } from 'uuid';
import { Ride } from '../models/Ride.js';
import { config } from '../config/index.js';
import { BOOKABLE_RIDE_STATUSES } from '../constants/enums.js';
import { AppError } from '../utils/AppError.js';
import { ErrorCodes } from '../constants/errorCodes.js';
import { logger } from '../utils/logger.js';

function cityKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase();
}

export function stopsFromRoute(route) {
  const middle = [...(route.stops || [])].sort((a, b) => a.sequence - b.sequence);
  const points = [route.origin, ...middle, route.destination].filter(Boolean);
  return points.map((point, index) => ({
    locationId: point.locationId || undefined,
    name: point.name || point.city,
    city: point.city,
    state: point.state,
    sequence: index + 1,
    pickupAllowed: index < points.length - 1,
    dropAllowed: index > 0,
    estimatedTime: null,
  }));
}

export function orderedStops(ride) {
  if (Array.isArray(ride?.rideStops) && ride.rideStops.length >= 2) {
    return [...ride.rideStops].sort((a, b) => a.sequence - b.sequence);
  }
  const route = ride?.routeId;
  if (route?.origin && route?.destination) return stopsFromRoute(route);
  return [];
}

export function isForwardCitySegment(stops, originCity, destinationCity) {
  const fromKey = cityKey(originCity);
  const toKey = cityKey(destinationCity);
  if (!fromKey || !toKey || fromKey === toKey) return false;

  const fromIndex = stops.findIndex((stop) => cityKey(stop.city) === fromKey || cityKey(stop.name) === fromKey);
  if (fromIndex < 0) return false;
  const toIndex = stops.findIndex(
    (stop, index) => index > fromIndex && (cityKey(stop.city) === toKey || cityKey(stop.name) === toKey)
  );
  return toIndex > fromIndex;
}

export function assertForwardSegment(stops, pickupLocationId, dropLocationId) {
  if (!stops?.length) return null;
  if (!pickupLocationId || !dropLocationId) {
    throw new AppError('Choose a pickup and a drop on this ride', {
      code: ErrorCodes.INVALID_SEGMENT,
      statusCode: 400,
    });
  }
  if (String(pickupLocationId) === String(dropLocationId)) {
    throw new AppError('Pickup and drop must be different stops', {
      code: ErrorCodes.INVALID_SEGMENT,
      statusCode: 400,
    });
  }

  const pickup = stops.find((stop) => String(stop.locationId) === String(pickupLocationId));
  const drop = stops.find((stop) => String(stop.locationId) === String(dropLocationId));
  if (!pickup || !drop) {
    throw new AppError('Pickup and drop must be stops on this ride', {
      code: ErrorCodes.INVALID_SEGMENT,
      statusCode: 400,
    });
  }
  if (!pickup.pickupAllowed || !drop.dropAllowed || drop.sequence <= pickup.sequence) {
    throw new AppError('Drop must occur after pickup in the ride stop order', {
      code: ErrorCodes.INVALID_SEGMENT,
      statusCode: 400,
    });
  }
  return { pickup, drop };
}

export function legsFromStops(stops, capacity) {
  const ordered = [...(stops || [])].sort((a, b) => a.sequence - b.sequence);
  if (ordered.length < 2 || !ordered.some((stop) => stop.locationId)) return [];
  const legs = [];
  for (let index = 0; index < ordered.length - 1; index += 1) {
    legs.push({
      fromSequence: ordered[index].sequence,
      toSequence: ordered[index + 1].sequence,
      fromLocationId: ordered[index].locationId,
      toLocationId: ordered[index + 1].locationId,
      capacity,
      committed: 0,
    });
  }
  return legs;
}

export function usesSegmentInventory(ride) {
  return Array.isArray(ride?.legs) && ride.legs.length > 0;
}

export function remainingOnJourney(legs, pickupSequence, dropSequence) {
  const affected = (legs || []).filter(
    (leg) => leg.fromSequence >= pickupSequence && leg.toSequence <= dropSequence
  );
  if (!affected.length) return 0;
  return Math.min(...affected.map((leg) => leg.capacity - leg.committed));
}

export function remainingForCities(ride, originCity, destinationCity) {
  if (!usesSegmentInventory(ride)) return ride?.availableSeats ?? 0;
  const stops = orderedStops(ride);
  const fromKey = cityKey(originCity);
  const toKey = cityKey(destinationCity);
  const fromIndex = stops.findIndex((stop) => cityKey(stop.city) === fromKey || cityKey(stop.name) === fromKey);
  const toIndex = stops.findIndex(
    (stop, index) => index > fromIndex && (cityKey(stop.city) === toKey || cityKey(stop.name) === toKey)
  );
  if (fromIndex < 0 || toIndex <= fromIndex) return 0;
  return remainingOnJourney(ride.legs, stops[fromIndex].sequence, stops[toIndex].sequence);
}

function affectedLegFilter(pickupSequence, dropSequence) {
  return {
    'leg.fromSequence': { $gte: pickupSequence },
    'leg.toSequence': { $lte: dropSequence },
  };
}

export async function holdSegment(userId, rideId, { seatCount, pickupLocationId, dropLocationId }) {
  const ride = await Ride.findById(rideId);
  if (!ride) {
    throw new AppError('Ride not found', { code: ErrorCodes.RIDE_NOT_FOUND, statusCode: 404 });
  }
  if (!BOOKABLE_RIDE_STATUSES.includes(ride.status)) {
    throw new AppError('Ride is not available for booking', {
      code: ErrorCodes.RIDE_NOT_AVAILABLE,
      statusCode: 400,
    });
  }
  const segment = assertForwardSegment(orderedStops(ride), pickupLocationId, dropLocationId);
  const count = Number(seatCount);
  if (!Number.isInteger(count) || count < 1) {
    throw new AppError('At least one seat is required', {
      code: ErrorCodes.VALIDATION_ERROR,
      statusCode: 400,
    });
  }
  if (remainingOnJourney(ride.legs, segment.pickup.sequence, segment.drop.sequence) < count) {
    throw new AppError('Not enough seats on this segment', {
      code: ErrorCodes.SEAT_UNAVAILABLE,
      statusCode: 409,
    });
  }

  const holdId = uuidv4();
  const holdExpiresAt = new Date(Date.now() + config.holdDurationMinutes * 60 * 1000);
  const updated = await Ride.findOneAndUpdate(
    {
      _id: rideId,
      status: { $in: BOOKABLE_RIDE_STATUSES },
      $expr: {
        $allElementsTrue: {
          $map: {
            input: {
              $filter: {
                input: '$legs',
                as: 'leg',
                cond: {
                  $and: [
                    { $gte: ['$$leg.fromSequence', segment.pickup.sequence] },
                    { $lte: ['$$leg.toSequence', segment.drop.sequence] },
                  ],
                },
              },
            },
            as: 'leg',
            in: { $lte: [{ $add: ['$$leg.committed', count] }, '$$leg.capacity'] },
          },
        },
      },
    },
    {
      $inc: { 'legs.$[leg].committed': count },
      $push: {
        segmentHolds: {
          holdId,
          userId,
          seatCount: count,
          pickupLocationId,
          dropLocationId,
          pickupSequence: segment.pickup.sequence,
          dropSequence: segment.drop.sequence,
          holdExpiresAt,
          status: 'ACTIVE',
        },
      },
    },
    { new: true, arrayFilters: [affectedLegFilter(segment.pickup.sequence, segment.drop.sequence)] }
  );

  if (!updated) {
    throw new AppError('Not enough seats on this segment', {
      code: ErrorCodes.SEAT_UNAVAILABLE,
      statusCode: 409,
    });
  }

  logger.info('segment.held', {
    rideId: String(rideId),
    holdId,
    seatCount: count,
    pickupSequence: segment.pickup.sequence,
    dropSequence: segment.drop.sequence,
  });

  return {
    holdId,
    holdExpiresAt,
    rideId: updated._id.toString(),
    seatCount: count,
    segment: true,
  };
}

export async function releaseSegmentHold(holdId, statuses = ['ACTIVE']) {
  if (!holdId) return { released: 0 };
  const ride = await Ride.findOne({
    segmentHolds: { $elemMatch: { holdId, status: { $in: statuses } } },
  });
  if (!ride) return { released: 0 };
  const hold = ride.segmentHolds.find((item) => item.holdId === holdId && statuses.includes(item.status));
  if (!hold) return { released: 0 };

  const result = await Ride.updateOne(
    { _id: ride._id, segmentHolds: { $elemMatch: { holdId, status: hold.status } } },
    {
      $set: { 'segmentHolds.$[hold].status': 'RELEASED' },
      $inc: { 'legs.$[leg].committed': -hold.seatCount },
    },
    {
      arrayFilters: [
        { 'hold.holdId': holdId, 'hold.status': hold.status },
        affectedLegFilter(hold.pickupSequence, hold.dropSequence),
      ],
    }
  );
  return { released: result.modifiedCount ? hold.seatCount : 0 };
}

export async function confirmSegmentHold(holdId, userId) {
  const ride = await Ride.findOne({ 'segmentHolds.holdId': holdId });
  if (!ride) return null;
  const hold = ride.segmentHolds.find((item) => item.holdId === holdId);
  if (!hold || hold.status === 'RELEASED') {
    throw new AppError('Seat hold not found or expired', {
      code: ErrorCodes.SEAT_HOLD_INVALID,
      statusCode: 400,
    });
  }
  if (hold.status === 'CONFIRMED') return hold;
  if (hold.holdExpiresAt < new Date()) {
    await releaseSegmentHold(holdId, ['ACTIVE']);
    throw new AppError('Seat hold has expired', {
      code: ErrorCodes.SEAT_HOLD_EXPIRED,
      statusCode: 400,
    });
  }
  if (userId && String(hold.userId) !== String(userId)) {
    throw new AppError('Seat hold does not belong to this user', {
      code: ErrorCodes.SEAT_HOLD_INVALID,
      statusCode: 403,
    });
  }
  await Ride.updateOne(
    { _id: ride._id, segmentHolds: { $elemMatch: { holdId, status: 'ACTIVE' } } },
    { $set: { 'segmentHolds.$.status': 'CONFIRMED' } }
  );
  return hold;
}

export async function releaseExpiredSegmentHolds() {
  const now = new Date();
  const rides = await Ride.find({
    segmentHolds: { $elemMatch: { status: 'ACTIVE', holdExpiresAt: { $lte: now } } },
  });
  let released = 0;
  for (const ride of rides) {
    for (const hold of ride.segmentHolds) {
      if (hold.status === 'ACTIVE' && hold.holdExpiresAt <= now) {
        const result = await releaseSegmentHold(hold.holdId, ['ACTIVE']);
        released += result.released;
      }
    }
  }
  if (released > 0) logger.info('segment.expired_released', { released });
  return { released };
}
