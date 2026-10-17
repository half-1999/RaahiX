import { Route } from '../models/Route.js';
import { Driver } from '../models/Driver.js';
import { AppError } from '../utils/AppError.js';
import { ErrorCodes } from '../constants/errorCodes.js';
import { writeAudit } from './auditService.js';
import { toPlace } from './locationService.js';
import { ROUTE_STATUS } from '../constants/enums.js';

export async function listRoutes(filters = {}) {
  const query = {};
  if (filters.status) query.status = filters.status;
  if (filters.originCity) query['origin.city'] = new RegExp(`^${filters.originCity}$`, 'i');
  if (filters.destinationCity) {
    query['destination.city'] = new RegExp(`^${filters.destinationCity}$`, 'i');
  }

  const routes = await Route.find(query).sort({ createdAt: -1 });
  return { routes };
}

export async function getRoute(id) {
  const route = await Route.findById(id);
  if (!route) {
    throw new AppError('Route not found', { code: ErrorCodes.ROUTE_NOT_FOUND, statusCode: 404 });
  }
  return route;
}

async function normalizedStops(stops = []) {
  const resolved = [];
  for (const stop of stops) {
    const place = await toPlace(stop);
    resolved.push({
      ...place,
      sequence: stop.sequence || resolved.length + 1,
    });
  }
  return resolved;
}

export async function createRoute(payload, actor) {
  const {
    name = '',
    origin,
    destination,
    stops = [],
    estimatedDuration,
    status,
    createdByDriverId = null,
  } = payload;

  if (!origin?.city || !origin?.state || !destination?.city || !destination?.state) {
    throw new AppError('origin and destination with city/state are required', {
      code: ErrorCodes.VALIDATION_ERROR,
      statusCode: 400,
    });
  }

  const route = await Route.create({
    name: String(name || '').trim(),
    origin: await toPlace(origin),
    destination: await toPlace(destination),
    stops: await normalizedStops(stops),
    estimatedDuration,
    status,
    createdByDriverId,
  });

  await writeAudit({
    actorId: actor._id,
    actorRole: actor.role,
    action: 'ROUTE_CREATED',
    entityType: 'Route',
    entityId: route._id,
    newValue: {
      origin: route.origin,
      destination: route.destination,
      estimatedDuration: route.estimatedDuration,
    },
  });

  return route;
}

export async function updateRoute(id, updates, actor) {
  const route = await Route.findById(id);
  if (!route) {
    throw new AppError('Route not found', { code: ErrorCodes.ROUTE_NOT_FOUND, statusCode: 404 });
  }

  const oldValue = {
    origin: route.origin,
    destination: route.destination,
    stops: route.stops,
    estimatedDuration: route.estimatedDuration,
    status: route.status,
  };

  if (updates.name !== undefined) route.name = String(updates.name || '').trim();
  if (updates.origin) route.origin = await toPlace(updates.origin);
  if (updates.destination) route.destination = await toPlace(updates.destination);
  if (updates.stops) route.stops = await normalizedStops(updates.stops);
  if (updates.estimatedDuration !== undefined) route.estimatedDuration = updates.estimatedDuration;
  if (updates.status !== undefined) route.status = updates.status;
  await route.save();

  await writeAudit({
    actorId: actor._id,
    actorRole: actor.role,
    action: 'ROUTE_UPDATED',
    entityType: 'Route',
    entityId: route._id,
    oldValue,
    newValue: {
      origin: route.origin,
      destination: route.destination,
      stops: route.stops,
      estimatedDuration: route.estimatedDuration,
      status: route.status,
    },
  });

  return route;
}

async function requireDriver(userId) {
  const driver = await Driver.findOne({ userId });
  if (!driver) {
    throw new AppError('Driver profile not found', {
      code: ErrorCodes.DRIVER_NOT_FOUND,
      statusCode: 404,
    });
  }
  return driver;
}

function routeKey(route) {
  return [
    String(route.createdByDriverId || 'shared'),
    String(route.origin?.locationId || route.origin?.city || ''),
    ...(route.stops || []).map((stop) => String(stop.locationId || stop.city || '')),
    String(route.destination?.locationId || route.destination?.city || ''),
    String(route.estimatedDuration || ''),
  ].join('>');
}

export async function listActiveRoutes() {
  const routes = await Route.find({ status: ROUTE_STATUS.ACTIVE })
    .select('origin destination stops estimatedDuration createdByDriverId')
    .sort({ 'origin.city': 1, 'destination.city': 1, createdAt: 1 });
  const seen = new Set();
  const unique = [];
  for (const route of routes) {
    const key = routeKey(route);
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(route);
  }
  return { routes: unique };
}

export async function listOwnRoutes(userId) {
  const driver = await requireDriver(userId);
  const routes = await Route.find({ createdByDriverId: driver._id }).sort({ createdAt: -1 });
  return { routes };
}

export async function createOwnRoute(userId, payload, actor) {
  const driver = await requireDriver(userId);
  const ordered = [...(payload.stops || [])];
  if (ordered.length < 2) {
    throw new AppError('A route needs at least two stops', {
      code: ErrorCodes.VALIDATION_ERROR,
      statusCode: 400,
    });
  }

  const places = [];
  for (const stop of ordered) {
    places.push(await toPlace(stop));
  }
  const keys = places.map((place) => String(place.locationId));
  if (new Set(keys).size !== keys.length) {
    throw new AppError('A route cannot repeat the same stop', {
      code: ErrorCodes.VALIDATION_ERROR,
      statusCode: 400,
    });
  }

  const [origin, ...rest] = places;
  const destination = rest.pop();
  const stops = rest.map((place, index) => ({ ...place, sequence: index + 1 }));

  const existing = await Route.find({ createdByDriverId: driver._id, status: ROUTE_STATUS.ACTIVE });
  const signature = [String(origin.locationId), ...stops.map((stop) => String(stop.locationId)), String(destination.locationId)].join('>');
  const duplicate = existing.find((route) => {
    const current = [
      String(route.origin?.locationId),
      ...(route.stops || []).map((stop) => String(stop.locationId)),
      String(route.destination?.locationId),
    ].join('>');
    return current === signature;
  });
  if (duplicate) return duplicate;

  return createRoute(
    {
      name: payload.name || `${origin.city} → ${destination.city}`,
      origin,
      destination,
      stops,
      estimatedDuration: payload.estimatedDuration,
      createdByDriverId: driver._id,
    },
    actor
  );
}

async function ownRoute(userId, routeId) {
  const driver = await requireDriver(userId);
  const route = await Route.findById(routeId);
  if (!route) {
    throw new AppError('Route not found', { code: ErrorCodes.ROUTE_NOT_FOUND, statusCode: 404 });
  }
  if (String(route.createdByDriverId) !== String(driver._id)) {
    throw new AppError('You can only manage your own routes', {
      code: ErrorCodes.AUTH_FORBIDDEN,
      statusCode: 403,
    });
  }
  return { driver, route };
}

export async function updateOwnRoute(userId, routeId, payload, actor) {
  await ownRoute(userId, routeId);
  const updates = {};
  if (payload.name !== undefined) updates.name = payload.name;
  if (payload.estimatedDuration !== undefined) updates.estimatedDuration = payload.estimatedDuration;
  if (payload.status !== undefined) updates.status = payload.status;

  if (payload.stops?.length >= 2) {
    const places = [];
    for (const stop of payload.stops) {
      places.push(await toPlace(stop));
    }
    const keys = places.map((place) => String(place.locationId));
    if (new Set(keys).size !== keys.length) {
      throw new AppError('A route cannot repeat the same stop', {
        code: ErrorCodes.VALIDATION_ERROR,
        statusCode: 400,
      });
    }
    const [origin, ...rest] = places;
    const destination = rest.pop();
    updates.origin = origin;
    updates.destination = destination;
    updates.stops = rest.map((place, index) => ({ ...place, sequence: index + 1 }));
  }

  return updateRoute(routeId, updates, actor);
}

export async function deactivateOwnRoute(userId, routeId, actor) {
  await ownRoute(userId, routeId);
  return updateRoute(routeId, { status: ROUTE_STATUS.INACTIVE }, actor);
}
