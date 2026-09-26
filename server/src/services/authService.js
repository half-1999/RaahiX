import { User } from '../models/User.js';
import { ROLES, USER_STATUS } from '../constants/enums.js';
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

  logger.info('auth.register', { userId: user._id.toString() });
  return issueTokens(user);
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
