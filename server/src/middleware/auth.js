import { AppError } from '../utils/AppError.js';
import { ErrorCodes } from '../constants/errorCodes.js';
import { verifyAccessToken } from '../utils/tokens.js';
import { User } from '../models/User.js';
import { USER_STATUS } from '../constants/enums.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const authenticate = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    throw new AppError('Authentication required', {
      code: ErrorCodes.AUTH_UNAUTHORIZED,
      statusCode: 401,
    });
  }

  const token = header.slice(7);
  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch (err) {
    const expired = err.name === 'TokenExpiredError';
    throw new AppError(expired ? 'Access token expired' : 'Invalid access token', {
      code: expired ? ErrorCodes.AUTH_TOKEN_EXPIRED : ErrorCodes.AUTH_TOKEN_INVALID,
      statusCode: 401,
    });
  }

  if (payload.type !== 'access') {
    throw new AppError('Invalid access token', {
      code: ErrorCodes.AUTH_TOKEN_INVALID,
      statusCode: 401,
    });
  }

  const user = await User.findById(payload.sub);
  if (!user) {
    throw new AppError('User not found', { code: ErrorCodes.USER_NOT_FOUND, statusCode: 401 });
  }
  if (user.status === USER_STATUS.BLOCKED || user.status === USER_STATUS.INACTIVE) {
    throw new AppError('Account is not active', {
      code: ErrorCodes.USER_BLOCKED,
      statusCode: 403,
    });
  }

  req.user = user;
  next();
});

export function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action', {
          code: ErrorCodes.AUTH_FORBIDDEN,
          statusCode: 403,
        })
      );
    }
    return next();
  };
}

export const optionalAuth = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return next();
  }
  try {
    const payload = verifyAccessToken(header.slice(7));
    if (payload.type === 'access') {
      const user = await User.findById(payload.sub);
      if (user && user.status === USER_STATUS.ACTIVE) {
        req.user = user;
      }
    }
  } catch {
    // ignore optional auth failures
  }
  next();
});
