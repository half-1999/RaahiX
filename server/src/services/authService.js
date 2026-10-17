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
import { ensureUserUsername, generateUniqueUsername } from '../utils/username.js';

async function issueTokens(user) {
  // Older accounts may not have username yet — set it before save or login fails validation.
  await ensureUserUsername(user, { save: false });
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);
  user.refreshTokenHash = await hashToken(refreshToken);
  await user.save();
  return { accessToken, refreshToken, user: await buildProfilePayload(user) };
}

async function buildDriverProfile(userId) {
  const driver = await Driver.findOne({ userId });
  if (!driver) return null;
  const vehicleCount = await Vehicle.countDocuments({
    driverId: driver._id,
    status: VEHICLE_STATUS.ACTIVE,
  });
  const missing = [];
  if (!driver.licenseNumber || String(driver.licenseNumber).trim().length < 5) {
    missing.push('license');
  }
  if (!driver.upiId || String(driver.upiId).trim().length < 3) {
    missing.push('upi');
  }
  if (vehicleCount < 1) missing.push('vehicle');
  if (driver.verificationStatus !== DRIVER_VERIFICATION.VERIFIED) {
    missing.push('verification');
  }

  return {
    id: driver._id.toString(),
    licenseNumber: driver.licenseNumber || '',
    verificationStatus: driver.verificationStatus,
    status: driver.status,
    upiId: driver.upiId || '',
    paymentInstructions: driver.paymentInstructions || '',
    rating: driver.rating,
    totalTrips: driver.totalTrips,
    vehicleCount,
    profileComplete: driver.isProfileComplete({ vehicleCount }),
    canPostRides:
      driver.isProfileComplete({ vehicleCount }) &&
      driver.verificationStatus === DRIVER_VERIFICATION.VERIFIED &&
      driver.status === DRIVER_STATUS.ACTIVE,
    missing,
  };
}

async function buildProfilePayload(user) {
  await ensureUserUsername(user);
  const base = user.toSafeObject();
  if (user.role !== ROLES.DRIVER) return base;
  return {
    ...base,
    driverProfile: await buildDriverProfile(user._id),
  };
}

export async function register({ name, email, phone, password }) {
  const existing = await User.findOne({ $or: [{ email: email.toLowerCase() }, { phone }] });
  if (existing) {
    throw new AppError('Email or phone already registered', {
      code: ErrorCodes.CONFLICT,
      statusCode: 409,
    });
  }

  const username = await generateUniqueUsername({ name, email });
  const user = await User.create({
    name,
    username,
    email: email.toLowerCase(),
    phone,
    passwordHash: await hashPassword(password),
    role: ROLES.CUSTOMER,
    status: USER_STATUS.ACTIVE,
  });

  logger.info('auth.register', { userId: user._id.toString(), role: ROLES.CUSTOMER, username });
  return issueTokens(user);
}

export async function registerDriver({ name, email, phone, password }) {
  const existing = await User.findOne({ $or: [{ email: email.toLowerCase() }, { phone }] });
  if (existing) {
    throw new AppError('Email or phone already registered', {
      code: ErrorCodes.CONFLICT,
      statusCode: 409,
    });
  }

  const username = await generateUniqueUsername({ name, email });
  const user = await User.create({
    name,
    username,
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
    licenseNumber: null,
    verificationStatus: DRIVER_VERIFICATION.PENDING,
    status: DRIVER_STATUS.ACTIVE,
  });

  logger.info('auth.register_driver', {
    userId: user._id.toString(),
    driverId: driver._id.toString(),
    username,
  });

  const tokens = await issueTokens(user);
  return {
    ...tokens,
    driver: {
      id: driver._id.toString(),
      verificationStatus: driver.verificationStatus,
      profileComplete: false,
    },
  };
}

export async function login({ email, password }) {
  const identifier = String(email || '').trim().toLowerCase();
  const user = await User.findOne({
    $or: [{ email: identifier }, { username: identifier }],
  }).select('+passwordHash +refreshTokenHash');

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
  return buildProfilePayload(user);
}

export async function updateProfile(
  userId,
  {
    name,
    phone,
    password,
    currentPassword,
    payoutUpi,
    age,
    gender,
    city,
    state,
    address,
    bio,
    dateOfBirth,
    licenseNumber,
    upiId,
    paymentInstructions,
  }
) {
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
  if (gender !== undefined) user.gender = gender;
  if (city !== undefined) user.city = String(city).trim();
  if (state !== undefined) user.state = String(state).trim();
  if (address !== undefined) user.address = String(address).trim();
  if (bio !== undefined) user.bio = String(bio).trim();
  if (dateOfBirth !== undefined) {
    user.dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : null;
  }
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

  await ensureUserUsername(user);
  await user.save();

  if (user.role === ROLES.DRIVER) {
    const driver = await Driver.findOne({ userId: user._id });
    if (driver) {
      if (name) driver.name = name.trim();
      if (phone) driver.phone = phone.trim();
      if (upiId !== undefined) driver.upiId = String(upiId).trim();
      if (paymentInstructions !== undefined) {
        driver.paymentInstructions = String(paymentInstructions).trim();
      }
      if (licenseNumber !== undefined) {
        const nextLicense = String(licenseNumber).trim().toUpperCase();
        if (nextLicense) {
          const clash = await Driver.findOne({
            licenseNumber: nextLicense,
            _id: { $ne: driver._id },
          });
          if (clash) {
            throw new AppError('License number already registered', {
              code: ErrorCodes.CONFLICT,
              statusCode: 409,
            });
          }
          driver.licenseNumber = nextLicense;
        }
      }
      await driver.save();
    }
  }

  logger.info('auth.profile_updated', { userId: user._id.toString() });
  return buildProfilePayload(user);
}
