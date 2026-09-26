import { Vehicle } from '../models/Vehicle.js';
import { Driver } from '../models/Driver.js';
import { AppError } from '../utils/AppError.js';
import { ErrorCodes } from '../constants/errorCodes.js';
import { writeAudit } from './auditService.js';

export async function listVehicles(filters = {}) {
  const query = {};
  if (filters.status) query.status = filters.status;
  if (filters.driverId) query.driverId = filters.driverId;

  const vehicles = await Vehicle.find(query)
    .populate('driverId', 'name phone')
    .sort({ createdAt: -1 });
  return { vehicles };
}

export async function getVehicle(id) {
  const vehicle = await Vehicle.findById(id).populate('driverId', 'name phone status');
  if (!vehicle) {
    throw new AppError('Vehicle not found', {
      code: ErrorCodes.VEHICLE_NOT_FOUND,
      statusCode: 404,
    });
  }
  return vehicle;
}

export async function createVehicle(payload, actor) {
  const {
    driverId,
    registrationNumber,
    make,
    model,
    vehicleType,
    capacity,
    seatConfiguration,
    features = [],
    status,
  } = payload;

  const driver = await Driver.findById(driverId);
  if (!driver) {
    throw new AppError('Driver not found', { code: ErrorCodes.DRIVER_NOT_FOUND, statusCode: 404 });
  }

  if (!Array.isArray(seatConfiguration) || seatConfiguration.length === 0) {
    throw new AppError('seatConfiguration is required', {
      code: ErrorCodes.VALIDATION_ERROR,
      statusCode: 400,
    });
  }
  if (capacity !== seatConfiguration.length) {
    throw new AppError('Vehicle capacity must match seatConfiguration length', {
      code: ErrorCodes.CONFLICT,
      statusCode: 409,
    });
  }

  const vehicle = await Vehicle.create({
    driverId,
    registrationNumber,
    make,
    model,
    vehicleType,
    capacity,
    seatConfiguration,
    features,
    status,
  });

  await writeAudit({
    actorId: actor._id,
    actorRole: actor.role,
    action: 'VEHICLE_CREATED',
    entityType: 'Vehicle',
    entityId: vehicle._id,
    newValue: {
      registrationNumber: vehicle.registrationNumber,
      capacity: vehicle.capacity,
      driverId,
    },
  });

  return vehicle;
}

export async function updateVehicle(id, updates, actor) {
  const vehicle = await Vehicle.findById(id);
  if (!vehicle) {
    throw new AppError('Vehicle not found', {
      code: ErrorCodes.VEHICLE_NOT_FOUND,
      statusCode: 404,
    });
  }

  const oldValue = {
    registrationNumber: vehicle.registrationNumber,
    make: vehicle.make,
    model: vehicle.model,
    vehicleType: vehicle.vehicleType,
    capacity: vehicle.capacity,
    status: vehicle.status,
    driverId: vehicle.driverId,
  };

  const allowed = [
    'registrationNumber',
    'make',
    'model',
    'vehicleType',
    'capacity',
    'seatConfiguration',
    'features',
    'status',
    'driverId',
  ];

  for (const key of allowed) {
    if (updates[key] !== undefined) vehicle[key] = updates[key];
  }

  if (
    vehicle.seatConfiguration?.length &&
    vehicle.capacity !== vehicle.seatConfiguration.length
  ) {
    throw new AppError('Vehicle capacity must match seatConfiguration length', {
      code: ErrorCodes.CONFLICT,
      statusCode: 409,
    });
  }

  await vehicle.save();

  await writeAudit({
    actorId: actor._id,
    actorRole: actor.role,
    action: 'VEHICLE_UPDATED',
    entityType: 'Vehicle',
    entityId: vehicle._id,
    oldValue,
    newValue: {
      registrationNumber: vehicle.registrationNumber,
      make: vehicle.make,
      model: vehicle.model,
      vehicleType: vehicle.vehicleType,
      capacity: vehicle.capacity,
      status: vehicle.status,
      driverId: vehicle.driverId,
    },
  });

  return vehicle;
}
