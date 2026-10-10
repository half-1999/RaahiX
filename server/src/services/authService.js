import { User } from '../models/User.js';
import { Driver } from '../models/Driver.js';
import { Vehicle } from '../models/Vehicle.js';
import {
  DRIVER_STATUS,
  DRIVER_VERIFICATION,
  ROLES,
  USER_STATUS,
  VEHICLE_STATUS,
} from '../constants/enums.js';
import { AppError } from '../utils/AppError.js';
import { ErrorCodes } from '../constants/errorCodes.js';
import {
  comparePassword,
  compareToken,
  hashPassword,
  hashToken,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../utils/tokens.js';
import { logger } from '../utils/logger.js';
import { resolveVehicleSeats } from '../utils/vehicleLayouts.js';

async function issueTokens(user) {
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  user.refreshTokenHash = await hashToken(refreshToken);
  await user.save();
  return { accessToken, refreshToken, user: user.toSafeObject() };
}

export async function register({ name, email, phone, password }) {
  const existing = await User.findOne({ $or: [{ email: email.toLowerCase() }, { phone }] });
  if (existing) {
    throw new AppError('Email or phone already registered', {
      code: ErrorCodes.CONFLICT,
      statusCode: 409,
    });
  }

  const user = await User.create({
    name,
    email: email.toLowerCase(),
    phone,
    passwordHash: await hashPassword(password),
    role: ROLES.CUSTOMER,
    status: USER_STATUS.ACTIVE,
  });

  logger.info('auth.register', { userId: user._id.toString(), role: ROLES.CUSTOMER });
  return issueTokens(user);
}

export async function registerDriver({ name, email, phone, password, licenseNumber, vehicle }) {
  const existing = await User.findOne({ $or: [{ email: email.toLowerCase() }, { phone }] });
  if (existing) {
    throw new AppError('Email or phone already registered', {
      code: ErrorCodes.CONFLICT,
      statusCode: 409,
    });
  }

  const existingLicense = await Driver.findOne({ licenseNumber: licenseNumber.trim().toUpperCase() });
  if (existingLicense) {
    throw new AppError('License number already registered', {
      code: ErrorCodes.CONFLICT,
      statusCode: 409,
    });
  }

  const existingReg = await Vehicle.findOne({
    registrationNumber: vehicle.registrationNumber.toUpperCase().trim(),
  });
  if (existingReg) {
    throw new AppError('Vehicle registration already registered', {
      code: ErrorCodes.CONFLICT,
      statusCode: 409,
    });
  }

  const seats = resolveVehicleSeats(vehicle);

  const user = await User.create({
    name,
    email: email.toLowerCase(),
    phone,
    passwordHash: await hashPassword(password),
    role: ROLES.DRIVER,
    status: USER_STATUS.ACTIVE,
  });

  const driver = await Driver.create({
    userId: user._id,
    name,
    phone,
    licenseNumber: licenseNumber.trim().toUpperCase(),
    verificationStatus: DRIVER_VERIFICATION.PENDING,
    status: DRIVER_STATUS.ACTIVE,
  });

  const cab = await Vehicle.create({
    driverId: driver._id,
    registrationNumber: vehicle.registrationNumber.toUpperCase().trim(),
    make: vehicle.make,
    model: vehicle.model,
    vehicleType: seats.vehicleType,
    capacity: seats.capacity,
    seatConfiguration: seats.seatConfiguration,
    features: vehicle.features || [],
    status: VEHICLE_STATUS.ACTIVE,
  });

  logger.info('auth.register_driver', {
    userId: user._id.toString(),
    driverId: driver._id.toString(),
    vehicleId: cab._id.toString(),
  });

  const tokens = await issueTokens(user);
  return {
    ...tokens,
    driver: {
      id: driver._id.toString(),
      licenseNumber: driver.licenseNumber,
      verificationStatus: driver.verificationStatus,
    },
    vehicle: {
      id: cab._id.toString(),
      registrationNumber: cab.registrationNumber,
      make: cab.make,
      model: cab.model,
    },
  };
}

export async function login({ email, password }) {
  const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash +refreshTokenHash');
  if (!user) {
    throw new AppError('Invalid email or password', {
      code: ErrorCodes.AUTH_INVALID_CREDENTIALS,
      statusCode: 401,
    });
  }

  if (user.status === USER_STATUS.BLOCKED || user.status === USER_STATUS.INACTIVE) {
    throw new AppError('Account is not active', {
      code: ErrorCodes.USER_BLOCKED,
      statusCode: 403,
    });
  }

  const ok = await comparePassword(password, user.passwordHash);
  if (!ok) {
    throw new AppError('Invalid email or password', {
      code: ErrorCodes.AUTH_INVALID_CREDENTIALS,
      statusCode: 401,
    });
  }

  logger.info('auth.login', { userId: user._id.toString(), role: user.role });
  return issueTokens(user);
}

export async function refresh(refreshToken) {
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch (err) {
    const expired = err.name === 'TokenExpiredError';
    throw new AppError(expired ? 'Refresh token expired' : 'Invalid refresh token', {
      code: expired ? ErrorCodes.AUTH_TOKEN_EXPIRED : ErrorCodes.AUTH_TOKEN_INVALID,
      statusCode: 401,
    });
  }

  if (payload.type !== 'refresh') {
    throw new AppError('Invalid refresh token', {
      code: ErrorCodes.AUTH_TOKEN_INVALID,
      statusCode: 401,
    });
  }

  const user = await User.findById(payload.sub).select('+refreshTokenHash');
  if (!user) {
    throw new AppError('Invalid refresh token', {
      code: ErrorCodes.AUTH_TOKEN_INVALID,
      statusCode: 401,
    });
  }

  const match = await compareToken(refreshToken, user.refreshTokenHash);
  if (!match) {
    throw new AppError('Invalid refresh token', {
      code: ErrorCodes.AUTH_TOKEN_INVALID,
      statusCode: 401,
    });
  }

  if (user.status !== USER_STATUS.ACTIVE) {
    throw new AppError('Account is not active', {
      code: ErrorCodes.USER_BLOCKED,
      statusCode: 403,
    });
  }

  return issueTokens(user);
}

export async function logout(userId, refreshToken) {
  const user = await User.findById(userId).select('+refreshTokenHash');
  if (!user) return;
  if (refreshToken && user.refreshTokenHash) {
    const match = await compareToken(refreshToken, user.refreshTokenHash);
    if (!match) return;
  }
  user.refreshTokenHash = null;
  await user.save();
  logger.info('auth.logout', { userId: userId.toString() });
}

export async function me(userId) {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError('User not found', { code: ErrorCodes.USER_NOT_FOUND, statusCode: 404 });
  }
  return user.toSafeObject();
}

export async function updateProfile(userId, { name, phone, password, currentPassword, payoutUpi, age }) {
  const user = await User.findById(userId).select('+passwordHash');
  if (!user) {
    throw new AppError('User not found', { code: ErrorCodes.USER_NOT_FOUND, statusCode: 404 });
  }

  if (password) {
    const ok = await comparePassword(currentPassword || '', user.passwordHash);
    if (!ok) {
      throw new AppError('Current password is incorrect', {
        code: ErrorCodes.AUTH_INVALID_CREDENTIALS,
        statusCode: 400,
      });
    }
    user.passwordHash = await hashPassword(password);
  }

  if (name) user.name = name.trim();
  if (payoutUpi !== undefined) user.payoutUpi = String(payoutUpi).trim();
  if (age !== undefined) user.age = age;
  if (phone) {
    const clash = await User.findOne({ phone, _id: { $ne: user._id } });
    if (clash) {
      throw new AppError('Phone number already in use', {
        code: ErrorCodes.CONFLICT,
        statusCode: 409,
      });
    }
    user.phone = phone.trim();
  }

  await user.save();
  logger.info('auth.profile_updated', { userId: user._id.toString() });
  return user.toSafeObject();
}
