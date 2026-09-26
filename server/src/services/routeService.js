import { Route } from '../models/Route.js';
import { AppError } from '../utils/AppError.js';
import { ErrorCodes } from '../constants/errorCodes.js';
import { writeAudit } from './auditService.js';

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

export async function createRoute(payload, actor) {
  const { origin, destination, stops = [], estimatedDuration, status } = payload;

  if (!origin?.city || !origin?.state || !destination?.city || !destination?.state) {
    throw new AppError('origin and destination with city/state are required', {
      code: ErrorCodes.VALIDATION_ERROR,
      statusCode: 400,
    });
  }

  const route = await Route.create({
    origin,
    destination,
    stops,
    estimatedDuration,
    status,
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

  const allowed = ['origin', 'destination', 'stops', 'estimatedDuration', 'status'];
  for (const key of allowed) {
    if (updates[key] !== undefined) route[key] = updates[key];
  }
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
