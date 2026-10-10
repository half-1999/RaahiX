import { User } from '../models/User.js';
import { USER_STATUS } from '../constants/enums.js';
import { AppError } from '../utils/AppError.js';
import { ErrorCodes } from '../constants/errorCodes.js';
import { requireReason, writeAudit } from './auditService.js';

export async function listUsers(filters = {}) {
  const query = {};
  if (filters.role) query.role = filters.role;
  if (filters.status) query.status = filters.status;
  if (filters.search) {
    query.$or = [
      { name: new RegExp(filters.search, 'i') },
      { email: new RegExp(filters.search, 'i') },
      { phone: new RegExp(filters.search, 'i') },
    ];
  }

  const users = await User.find(query).sort({ createdAt: -1 });
  return { users: users.map((u) => u.toSafeObject()) };
}

export async function getUser(id) {
  const user = await User.findById(id);
  if (!user) {
    throw new AppError('User not found', { code: ErrorCodes.USER_NOT_FOUND, statusCode: 404 });
  }
  return user.toSafeObject();
}

export async function updateUserStatus(id, status, actor, reason) {
  if (!Object.values(USER_STATUS).includes(status)) {
    throw new AppError('Invalid status', {
      code: ErrorCodes.VALIDATION_ERROR,
      statusCode: 400,
    });
  }

  const user = await User.findById(id);
  if (!user) {
    throw new AppError('User not found', { code: ErrorCodes.USER_NOT_FOUND, statusCode: 404 });
  }

  const oldStatus = user.status;
  user.status = status;
  await user.save();

  await writeAudit({
    actorId: actor._id,
    actorRole: actor.role,
    action: 'USER_STATUS_CHANGED',
    entityType: 'User',
    entityId: user._id,
    oldValue: { status: oldStatus },
    newValue: { status },
    reason: requireReason(reason),
  });

  return user.toSafeObject();
}
