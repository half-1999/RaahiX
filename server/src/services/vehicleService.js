import { Vehicle } from '../models/Vehicle.js';
import { Driver } from '../models/Driver.js';
import { Ride } from '../models/Ride.js';
import { AppError } from '../utils/AppError.js';
import { ErrorCodes } from '../constants/errorCodes.js';
import { RIDE_STATUS, VEHICLE_STATUS } from '../constants/enums.js';
import { writeAudit } from './auditService.js';
import { resolveVehicleSeats } from '../utils/vehicleLayouts.js';

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

  const seats = resolveVehicleSeats({ vehicleType, capacity, seatConfiguration });

  const vehicle = await Vehicle.create({
    driverId,
    registrationNumber,
    make,
    model,
    vehicleType: seats.vehicleType,
    capacity: seats.capacity,
    seatConfiguration: seats.seatConfiguration,
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
    updates.vehicleType !== undefined ||
    updates.seatConfiguration !== undefined ||
    updates.capacity !== undefined
  ) {
    const seats = resolveVehicleSeats({
      vehicleType: vehicle.vehicleType,
      capacity: vehicle.capacity,
      seatConfiguration: vehicle.seatConfiguration,
    });
    vehicle.vehicleType = seats.vehicleType;
    vehicle.capacity = seats.capacity;
    vehicle.seatConfiguration = seats.seatConfiguration;
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

async function requireDriverProfile(userId) {
  const driver = await Driver.findOne({ userId });
  if (!driver) {
    throw new AppError('Driver profile not found', {
      code: ErrorCodes.DRIVER_NOT_FOUND,
      statusCode: 404,
    });
  }
  return driver;
}

async function ownVehicle(userId, vehicleId) {
  const driver = await requireDriverProfile(userId);
  const vehicle = await Vehicle.findById(vehicleId);
  if (!vehicle || vehicle.driverId.toString() !== driver._id.toString()) {
    throw new AppError('You do not have permission to manage this vehicle', {
      code: ErrorCodes.AUTH_FORBIDDEN,
      statusCode: 403,
    });
  }
  return { driver, vehicle };
}

export async function listOwnVehicles(userId) {
  const driver = await requireDriverProfile(userId);
  return listVehicles({ driverId: driver._id });
}

export async function createOwnVehicle(userId, payload, actor) {
  const driver = await requireDriverProfile(userId);
  return createVehicle({ ...payload, driverId: driver._id }, actor);
}

export async function updateOwnVehicle(userId, vehicleId, updates, actor) {
  await ownVehicle(userId, vehicleId);
  const rest = { ...updates };
  delete rest.driverId;
  return updateVehicle(vehicleId, rest, actor);
}

export async function deactivateOwnVehicle(userId, vehicleId, actor) {
  const { vehicle } = await ownVehicle(userId, vehicleId);
  const futureRide = await Ride.findOne({
    vehicleId: vehicle._id,
    status: { $ne: RIDE_STATUS.CANCELLED },
    departureTime: { $gte: new Date() },
  }).select('_id');

  if (futureRide) {
    throw new AppError('A vehicle with future rides cannot be deleted. Deactivate it instead.', {
      code: ErrorCodes.VEHICLE_IN_USE,
      statusCode: 409,
    });
  }

  return updateVehicle(vehicleId, { status: VEHICLE_STATUS.INACTIVE }, actor);
}
