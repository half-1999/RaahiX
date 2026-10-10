import { AuditLog } from '../models/AuditLog.js';
import { logger } from '../utils/logger.js';
import { AppError } from '../utils/AppError.js';
import { ErrorCodes } from '../constants/errorCodes.js';

export function requireReason(reason) {
  const value = String(reason || '').trim();
  if (value.length < 3) {
    throw new AppError('A reason is required', {
      code: ErrorCodes.VALIDATION_ERROR,
      statusCode: 400,
    });
  }
  return value;
}

/**
 * Persist an audit log entry. Best-effort: logs failures but does not throw
 * unless the caller needs a hard failure (admin mutations call this await'd).
 */
export async function writeAudit({
  actorId,
  actorRole,
  action,
  entityType,
  entityId,
  oldValue = null,
  newValue = null,
  reason = null,
  metadata = null,
}) {
  const entry = await AuditLog.create({
    actorId,
    actorRole,
    action,
    entityType,
    entityId: entityId?.toString?.() ?? String(entityId),
    oldValue,
    newValue,
    reason,
    metadata,
  });
  logger.info('audit.written', { action, entityType, entityId: entry.entityId });
  return entry;
}

export async function listAuditLogs({
  entityType,
  entityId,
  actorId,
  from,
  to,
  page = 1,
  limit = 50,
} = {}) {
  const filter = {};
  if (entityType) filter.entityType = entityType;
  if (entityId) filter.entityId = String(entityId);
  if (actorId) filter.actorId = actorId;
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to) filter.createdAt.$lte = new Date(to);
  }

  const skip = (Math.max(1, page) - 1) * Math.min(100, Math.max(1, limit));
  const take = Math.min(100, Math.max(1, limit));

  const [items, total] = await Promise.all([
    AuditLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(take).lean(),
    AuditLog.countDocuments(filter),
  ]);

  return { items, total, page: Math.max(1, page), limit: take };
}
