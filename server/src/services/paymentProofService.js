import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { Booking } from '../models/Booking.js';
import { Driver } from '../models/Driver.js';
import { Ride } from '../models/Ride.js';
import {
  BOOKING_PAYMENT_STATUS,
  BOOKING_STATUS,
  PROOF_STATUS,
  REFUND_STATUS,
  ROLES,
} from '../constants/enums.js';
import { AppError } from '../utils/AppError.js';
import { ErrorCodes } from '../constants/errorCodes.js';
import { logger } from '../utils/logger.js';
import { releaseHold, confirmSeatsBooked } from './seatService.js';
import {
  confirmSegmentHold,
  holdSegment,
  usesSegmentInventory,
} from './segmentService.js';
import { requireReason, writeAudit } from './auditService.js';
import * as notificationService from './notificationService.js';

const proofDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../.data/proofs');

function decodeScreenshot(screenshot) {
  if (!screenshot || typeof screenshot !== 'string') {
    throw new AppError('A payment screenshot is required', {
      code: ErrorCodes.PAYMENT_PROOF_REQUIRED,
      statusCode: 400,
    });
  }
  const match = screenshot.match(/^data:(image\/(?:png|jpeg|jpg|webp));base64,([A-Za-z0-9+/=\s]+)$/);
  if (!match) {
    throw new AppError('Screenshot must be a PNG, JPEG, or WebP image', {
      code: ErrorCodes.VALIDATION_ERROR,
      statusCode: 400,
    });
  }
  const buffer = Buffer.from(match[2].replace(/\s/g, ''), 'base64');
  if (!buffer.length || buffer.length > 2 * 1024 * 1024) {
    throw new AppError('Screenshot must be between 1 byte and 2 MB', {
      code: ErrorCodes.VALIDATION_ERROR,
      statusCode: 400,
    });
  }
  const mime = match[1] === 'image/jpg' ? 'image/jpeg' : match[1];
  const ext = mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg';
  return { mime, buffer, ext };
}

async function loadBooking(bookingId) {
  const booking = await Booking.findById(bookingId);
  if (!booking) {
    throw new AppError('Booking not found', { code: ErrorCodes.BOOKING_NOT_FOUND, statusCode: 404 });
  }
  return booking;
}

async function driverForUser(userId) {
  const driver = await Driver.findOne({ userId });
  if (!driver) {
    throw new AppError('Driver profile not found', { code: ErrorCodes.DRIVER_NOT_FOUND, statusCode: 404 });
  }
  return driver;
}

async function assertRideDriver(userId, rideId) {
  const driver = await driverForUser(userId);
  const ride = await Ride.findById(rideId);
  if (!ride || String(ride.driverId) !== String(driver._id)) {
    throw new AppError('You cannot review this payment', {
      code: ErrorCodes.AUTH_FORBIDDEN,
      statusCode: 403,
    });
  }
  return { driver, ride };
}

function holdStillOpen(booking) {
  return booking.holdExpiresAt && booking.holdExpiresAt > new Date();
}

async function commitHold(booking) {
  const ride = await Ride.findById(booking.rideId);
  if (usesSegmentInventory(ride)) {
    const hold = (ride.segmentHolds || []).find((item) => item.holdId === booking.holdId);
    if (hold?.status === 'ACTIVE' && hold.holdExpiresAt > new Date()) {
      await confirmSegmentHold(booking.holdId, booking.userId);
      return;
    }
    const fresh = await holdSegment(booking.userId, ride._id, {
      seatCount: booking.passengerCount,
      pickupLocationId: booking.pickupLocationId,
      dropLocationId: booking.dropLocationId,
    });
    await confirmSegmentHold(fresh.holdId, booking.userId);
    booking.holdId = fresh.holdId;
    booking.holdExpiresAt = fresh.holdExpiresAt;
    return;
  }
  await confirmSeatsBooked(booking.holdId, booking._id, booking.userId);
}

export async function submitProof(userId, bookingId, { amount, screenshot }) {
  const booking = await loadBooking(bookingId);
  if (String(booking.userId) !== String(userId)) {
    throw new AppError('You do not have permission to update this booking', {
      code: ErrorCodes.AUTH_FORBIDDEN,
      statusCode: 403,
    });
  }
  if (booking.bookingStatus !== BOOKING_STATUS.PENDING) {
    throw new AppError('Payment proof can only be submitted for a pending booking', {
      code: ErrorCodes.VALIDATION_ERROR,
      statusCode: 400,
    });
  }
  if (!holdStillOpen(booking)) {
    throw new AppError('Seat hold has expired', {
      code: ErrorCodes.SEAT_HOLD_EXPIRED,
      statusCode: 400,
    });
  }
  if (booking.proofStatus === PROOF_STATUS.APPROVED) {
    throw new AppError('Payment is already approved', {
      code: ErrorCodes.CONFLICT,
      statusCode: 409,
    });
  }

  const file = decodeScreenshot(screenshot);
  await fs.mkdir(proofDir, { recursive: true });
  const filename = `${booking._id}.${file.ext}`;
  await fs.writeFile(path.join(proofDir, filename), file.buffer);

  booking.proofStatus = PROOF_STATUS.SUBMITTED;
  booking.proofSubmittedAt = new Date();
  booking.proofSubmittedBy = userId;
  booking.proofAmount = amount ?? booking.totalAmount;
  booking.proofFile = filename;
  booking.proofMime = file.mime;
  booking.proofRejectionReason = null;
  await booking.save();

  logger.info('payment.proof_submitted', { bookingId: booking._id.toString() });
  await notificationService.notifyPaymentSubmitted(booking);
  return booking;
}

export async function reviewProof(userId, bookingId, { decision, reason }) {
  const booking = await loadBooking(bookingId);
  await assertRideDriver(userId, booking.rideId);
  if (booking.proofStatus !== PROOF_STATUS.SUBMITTED) {
    throw new AppError('There is no submitted payment to review', {
      code: ErrorCodes.VALIDATION_ERROR,
      statusCode: 400,
    });
  }
  if (booking.bookingStatus !== BOOKING_STATUS.PENDING) {
    throw new AppError('This booking can no longer be confirmed from the hold', {
      code: ErrorCodes.BOOKING_EXPIRED,
      statusCode: 409,
    });
  }

  if (!holdStillOpen(booking)) {
    await releaseHold(booking.holdId);
    booking.bookingStatus = BOOKING_STATUS.EXPIRED;
    await booking.save();
    throw new AppError('Hold expired before review. The booking was not confirmed.', {
      code: ErrorCodes.SEAT_HOLD_EXPIRED,
      statusCode: 409,
    });
  }

  if (decision === 'REJECT') {
    const why = requireReason(reason);
    await releaseHold(booking.holdId);
    booking.bookingStatus = BOOKING_STATUS.CANCELLED;
    booking.cancelledAt = new Date();
    booking.cancellationReason = why;
    booking.proofStatus = PROOF_STATUS.REJECTED;
    booking.proofRejectionReason = why;
    booking.proofReviewedBy = userId;
    booking.proofReviewedAt = new Date();
    await booking.save();
    await notificationService.notifyPaymentRejected(booking);
    return booking;
  }

  if (decision !== 'APPROVE') {
    throw new AppError('Decision must be APPROVE or REJECT', {
      code: ErrorCodes.VALIDATION_ERROR,
      statusCode: 400,
    });
  }

  await commitHold(booking);
  booking.bookingStatus = BOOKING_STATUS.CONFIRMED;
  booking.paymentStatus = BOOKING_PAYMENT_STATUS.PAID;
  booking.proofStatus = PROOF_STATUS.APPROVED;
  booking.proofReviewedBy = userId;
  booking.proofReviewedAt = new Date();
  await booking.save();
  logger.info('payment.proof_approved', { bookingId: booking._id.toString() });
  await notificationService.notifyPaymentApproved(booking);
  return booking;
}

export async function adminResolve(actor, bookingId, { decision, reason }) {
  const why = requireReason(reason);
  const booking = await loadBooking(bookingId);
  const oldValue = {
    bookingStatus: booking.bookingStatus,
    proofStatus: booking.proofStatus,
    paymentStatus: booking.paymentStatus,
  };

  if (decision === 'APPROVE') {
    if (booking.bookingStatus === BOOKING_STATUS.CONFIRMED) return booking;
    await commitHold(booking);
    booking.bookingStatus = BOOKING_STATUS.CONFIRMED;
    booking.paymentStatus = BOOKING_PAYMENT_STATUS.PAID;
    booking.proofStatus = PROOF_STATUS.APPROVED;
    booking.proofReviewedBy = actor._id;
    booking.proofReviewedAt = new Date();
    await booking.save();
  } else if (decision === 'REJECT') {
    await releaseHold(booking.holdId);
    booking.bookingStatus = BOOKING_STATUS.CANCELLED;
    booking.cancelledAt = new Date();
    booking.cancellationReason = why;
    booking.proofStatus = PROOF_STATUS.REJECTED;
    booking.proofRejectionReason = why;
    booking.proofReviewedBy = actor._id;
    booking.proofReviewedAt = new Date();
    await booking.save();
  } else {
    throw new AppError('Decision must be APPROVE or REJECT', {
      code: ErrorCodes.VALIDATION_ERROR,
      statusCode: 400,
    });
  }

  await writeAudit({
    actorId: actor._id,
    actorRole: actor.role,
    action: 'PAYMENT_STATUS_CHANGED',
    entityType: 'Booking',
    entityId: booking._id,
    oldValue,
    newValue: {
      bookingStatus: booking.bookingStatus,
      proofStatus: booking.proofStatus,
      paymentStatus: booking.paymentStatus,
    },
    reason: why,
  });
  return booking;
}

export async function readProof(requester, bookingId) {
  const booking = await loadBooking(bookingId);
  const isOwner = String(booking.userId) === String(requester._id);
  const isAdmin = requester.role === ROLES.ADMIN;
  let isDriver = false;
  if (requester.role === ROLES.DRIVER) {
    const driver = await Driver.findOne({ userId: requester._id });
    const ride = await Ride.findById(booking.rideId);
    isDriver = Boolean(driver && ride && String(ride.driverId) === String(driver._id));
  }
  if (!isOwner && !isAdmin && !isDriver) {
    throw new AppError('You cannot view this screenshot', {
      code: ErrorCodes.AUTH_FORBIDDEN,
      statusCode: 403,
    });
  }
  if (!booking.proofFile) {
    throw new AppError('No screenshot has been submitted', {
      code: ErrorCodes.PAYMENT_NOT_FOUND,
      statusCode: 404,
    });
  }
  const buffer = await fs.readFile(path.join(proofDir, path.basename(booking.proofFile)));
  return { buffer, mime: booking.proofMime || 'application/octet-stream' };
}

export async function updatePaymentDetails(userId, { upiId, qrCode, paymentInstructions }) {
  const driver = await driverForUser(userId);
  if (upiId !== undefined) driver.upiId = upiId;
  if (qrCode !== undefined) driver.qrCode = qrCode;
  if (paymentInstructions !== undefined) driver.paymentInstructions = paymentInstructions;
  await driver.save();
  return {
    upiId: driver.upiId,
    qrCode: driver.qrCode,
    paymentInstructions: driver.paymentInstructions,
  };
}

export async function getPaymentDetails(userId) {
  const driver = await driverForUser(userId);
  return {
    upiId: driver.upiId,
    qrCode: driver.qrCode,
    paymentInstructions: driver.paymentInstructions,
  };
}

export async function listForDriver(userId, query = {}) {
  const driver = await driverForUser(userId);
  const rides = await Ride.find({ driverId: driver._id }).select('_id');
  const filter = { rideId: { $in: rides.map((ride) => ride._id) } };
  if (query.proofStatus) filter.proofStatus = query.proofStatus;
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(query.limit) || 20));
  const [total, bookings] = await Promise.all([
    Booking.countDocuments(filter),
    Booking.find(filter)
      .populate('userId', 'name phone email payoutUpi')
      .populate({ path: 'rideId', populate: { path: 'routeId' } })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
  ]);
  return { bookings, total, page, limit, pages: Math.max(1, Math.ceil(total / limit)) };
}

export async function listRefundsForDriver(userId, query = {}) {
  const driver = await driverForUser(userId);
  const rides = await Ride.find({ driverId: driver._id }).select('_id');
  const filter = {
    rideId: { $in: rides.map((ride) => ride._id) },
    refundStatus: query.status
      ? query.status
      : { $in: [REFUND_STATUS.PENDING, REFUND_STATUS.PARTIAL, REFUND_STATUS.COMPLETED] },
  };
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(query.limit) || 10));
  const [total, bookings] = await Promise.all([
    Booking.countDocuments(filter),
    Booking.find(filter)
      .populate('userId', 'name phone email payoutUpi')
      .populate({ path: 'rideId', populate: { path: 'routeId' } })
      .sort({ updatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
  ]);
  return { bookings, total, page, limit, pages: Math.max(1, Math.ceil(total / limit)) };
}

export async function markRefundProcessed(userId, bookingId, { refundReference, reason }) {
  const why = requireReason(reason);
  const booking = await loadBooking(bookingId);
  await assertRideDriver(userId, booking.rideId);
  if (![REFUND_STATUS.PENDING, REFUND_STATUS.PARTIAL].includes(booking.refundStatus)) {
    throw new AppError('This booking does not have a refund waiting', {
      code: ErrorCodes.VALIDATION_ERROR,
      statusCode: 409,
    });
  }
  booking.refundStatus = REFUND_STATUS.COMPLETED;
  booking.refundReference = String(refundReference || '').trim();
  booking.refundProcessedAt = new Date();
  booking.refundProcessedBy = userId;
  await booking.save();
  await writeAudit({
    actorId: userId,
    actorRole: ROLES.DRIVER,
    action: 'REFUND_STATUS_CHANGED',
    entityType: 'Booking',
    entityId: booking._id,
    oldValue: { refundStatus: REFUND_STATUS.PENDING },
    newValue: { refundStatus: booking.refundStatus, refundReference: booking.refundReference },
    reason: why,
  });
  notificationService.notifyRefundUpdated(booking).catch(() => {});
  return booking;
}
