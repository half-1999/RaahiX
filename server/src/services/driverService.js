import bcrypt from 'bcryptjs';
import { Driver } from '../models/Driver.js';
import { User } from '../models/User.js';
import { ROLES, USER_STATUS, DRIVER_STATUS, DRIVER_VERIFICATION } from '../constants/enums.js';
import { AppError } from '../utils/AppError.js';
import { ErrorCodes } from '../constants/errorCodes.js';
import { writeAudit } from './auditService.js';

export async function listDrivers(filters = {}) {
  const query = {};
  if (filters.status) query.status = filters.status;
  if (filters.verificationStatus) query.verificationStatus = filters.verificationStatus;
  if (filters.search) {
    query.$or = [
      { name: new RegExp(filters.search, 'i') },
      { phone: new RegExp(filters.search, 'i') },
      { licenseNumber: new RegExp(filters.search, 'i') },
    ];
  }

  const drivers = await Driver.find(query).populate('userId', 'email status role').sort({ createdAt: -1 });
  return { drivers };
}

export async function getDriver(id) {
  const driver = await Driver.findById(id).populate('userId', 'email status role name phone');
  if (!driver) {
    throw new AppError('Driver not found', { code: ErrorCodes.DRIVER_NOT_FOUND, statusCode: 404 });
  }
  return driver;
}

/**
 * Create driver: either link existing userId or create a DRIVER user.
 */
export async function createDriver(payload, actor) {
  const {
    userId,
    name,
    phone,
    email,
    password,
    licenseNumber,
    verificationStatus = DRIVER_VERIFICATION.PENDING,
    status = DRIVER_STATUS.ACTIVE,
  } = payload;

  let user;
  if (userId) {
    user = await User.findById(userId);
    if (!user) {
      throw new AppError('User not found', { code: ErrorCodes.USER_NOT_FOUND, statusCode: 404 });
    }
    if (user.role !== ROLES.DRIVER) {
      user.role = ROLES.DRIVER;
      await user.save();
    }
  } else {
    if (!email || !password || !name || !phone) {
      throw new AppError('name, phone, email and password are required to create driver user', {
        code: ErrorCodes.VALIDATION_ERROR,
        statusCode: 400,
      });
    }
    const existing = await User.findOne({ $or: [{ email: email.toLowerCase() }, { phone }] });
    if (existing) {
      throw new AppError('Email or phone already registered', {
        code: ErrorCodes.CONFLICT,
        statusCode: 409,
      });
    }
    user = await User.create({
      name,
      email: email.toLowerCase(),
      phone,
      passwordHash: await bcrypt.hash(password, 12),
      role: ROLES.DRIVER,
      status: USER_STATUS.ACTIVE,
    });
  }

  const existingDriver = await Driver.findOne({ userId: user._id });
  if (existingDriver) {
    throw new AppError('Driver profile already exists for this user', {
      code: ErrorCodes.CONFLICT,
      statusCode: 409,
    });
  }

  const driver = await Driver.create({
    userId: user._id,
    name: name || user.name,
    phone: phone || user.phone,
    licenseNumber,
    verificationStatus,
    status,
  });

  await writeAudit({
    actorId: actor._id,
    actorRole: actor.role,
    action: 'DRIVER_CREATED',
    entityType: 'Driver',
    entityId: driver._id,
    newValue: {
      name: driver.name,
      licenseNumber: driver.licenseNumber,
      userId: user._id,
    },
  });

  return driver;
}

export async function updateDriver(id, updates, actor) {
  const driver = await Driver.findById(id);
  if (!driver) {
    throw new AppError('Driver not found', { code: ErrorCodes.DRIVER_NOT_FOUND, statusCode: 404 });
  }

  const oldValue = {
    name: driver.name,
    phone: driver.phone,
    licenseNumber: driver.licenseNumber,
    verificationStatus: driver.verificationStatus,
    status: driver.status,
  };

  const allowed = ['name', 'phone', 'licenseNumber', 'verificationStatus', 'status', 'rating'];
  for (const key of allowed) {
    if (updates[key] !== undefined) driver[key] = updates[key];
  }
  await driver.save();

  await writeAudit({
    actorId: actor._id,
    actorRole: actor.role,
    action: 'DRIVER_UPDATED',
    entityType: 'Driver',
    entityId: driver._id,
    oldValue,
    newValue: {
      name: driver.name,
      phone: driver.phone,
      licenseNumber: driver.licenseNumber,
      verificationStatus: driver.verificationStatus,
      status: driver.status,
    },
  });

  return driver;
}
