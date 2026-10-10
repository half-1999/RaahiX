import { Payment } from '../models/Payment.js';
import { Booking } from '../models/Booking.js';
import {
  BOOKING_PAYMENT_STATUS,
  BOOKING_STATUS,
  PAYMENT_STATUS,
} from '../constants/enums.js';
import { AppError } from '../utils/AppError.js';
import { ErrorCodes } from '../constants/errorCodes.js';
import { logger } from '../utils/logger.js';
import { config } from '../config/index.js';
import { getGateway } from './payment/gateway.js';
import * as notificationService from './notificationService.js';

async function confirmPaymentSuccess({ payment, booking, gatewayPaymentId, gatewaySignature, raw }) {
  // Idempotent: already success
  if (payment.status === PAYMENT_STATUS.SUCCESS) {
    const freshBooking = await Booking.findById(booking._id);
    return { payment, booking: freshBooking, alreadyProcessed: true };
  }

  if (booking.bookingStatus === BOOKING_STATUS.CONFIRMED) {
    payment.status = PAYMENT_STATUS.SUCCESS;
    payment.gatewayPaymentId = gatewayPaymentId || payment.gatewayPaymentId;
    payment.gatewaySignature = gatewaySignature || payment.gatewaySignature;
    payment.paidAt = payment.paidAt || new Date();
    payment.rawResponse = raw || payment.rawResponse;
    await payment.save();
    return { payment, booking, alreadyProcessed: true };
  }

  if (
    booking.bookingStatus === BOOKING_STATUS.CANCELLED ||
    booking.bookingStatus === BOOKING_STATUS.EXPIRED
  ) {
    throw new AppError('Booking is no longer payable', {
      code: ErrorCodes.BOOKING_EXPIRED,
      statusCode: 400,
    });
  }

  // Mark payment success first (unique index on gatewayPaymentId helps idempotency)
  payment.status = PAYMENT_STATUS.SUCCESS;
  payment.gatewayPaymentId = gatewayPaymentId;
  payment.gatewaySignature = gatewaySignature || null;
  payment.paidAt = new Date();
  payment.rawResponse = raw
    ? { event: raw.event || 'verify', paymentId: gatewayPaymentId }
    : payment.rawResponse;
  await payment.save();

  logger.info('payment.recorded', {
    paymentId: payment._id.toString(),
    bookingId: booking._id.toString(),
  });

  const freshBooking = await Booking.findById(booking._id);
  return { payment, booking: freshBooking, alreadyProcessed: false };
}

export async function createOrder(userId, { bookingId }) {
  const booking = await Booking.findById(bookingId);
  if (!booking) {
    throw new AppError('Booking not found', {
      code: ErrorCodes.BOOKING_NOT_FOUND,
      statusCode: 404,
    });
  }
  if (booking.userId.toString() !== userId.toString()) {
    throw new AppError('You do not have permission for this booking', {
      code: ErrorCodes.AUTH_FORBIDDEN,
      statusCode: 403,
    });
  }
  if (booking.bookingStatus === BOOKING_STATUS.EXPIRED) {
    throw new AppError('Booking has expired', {
      code: ErrorCodes.BOOKING_EXPIRED,
      statusCode: 400,
    });
  }
  if (booking.bookingStatus !== BOOKING_STATUS.PENDING) {
    throw new AppError('Booking is not awaiting payment', {
      code: ErrorCodes.PAYMENT_INVALID,
      statusCode: 400,
    });
  }
  if (booking.holdExpiresAt && booking.holdExpiresAt < new Date()) {
    booking.bookingStatus = BOOKING_STATUS.EXPIRED;
    await booking.save();
    throw new AppError('Booking has expired', {
      code: ErrorCodes.BOOKING_EXPIRED,
      statusCode: 400,
    });
  }

  const gateway = getGateway();

  // Prefer an open payment; otherwise recycle the latest FAILED row for this booking.
  let payment = await Payment.findOne({
    bookingId: booking._id,
    status: { $in: [PAYMENT_STATUS.CREATED, PAYMENT_STATUS.PENDING] },
  }).sort({ createdAt: -1 });

  if (!payment) {
    const failed = await Payment.findOne({
      bookingId: booking._id,
      status: PAYMENT_STATUS.FAILED,
    }).sort({ createdAt: -1 });

    const order = await gateway.createOrder({
      amount: booking.totalAmount,
      currency: booking.currency || 'INR',
      receipt: booking.bookingNumber,
    });

    if (failed) {
      failed.amount = booking.totalAmount;
      failed.currency = booking.currency || 'INR';
      failed.gateway = gateway.name;
      failed.gatewayOrderId = order.id;
      failed.status = PAYMENT_STATUS.PENDING;
      failed.gatewayPaymentId = undefined;
      failed.gatewaySignature = undefined;
      failed.paidAt = undefined;
      failed.rawResponse = { orderId: order.id, retriedAt: new Date().toISOString() };
      failed.markModified('gatewayPaymentId');
      await failed.save();
      // Ensure null/empty values are removed so sparse unique index stays clean
      await Payment.updateOne(
        { _id: failed._id },
        { $unset: { gatewayPaymentId: 1, gatewaySignature: 1, paidAt: 1 } }
      );
      payment = await Payment.findById(failed._id);
      logger.info('payment.retried', {
        paymentId: payment._id.toString(),
        bookingId: booking._id.toString(),
        gatewayOrderId: order.id,
      });
    } else {
      payment = await Payment.create({
        bookingId: booking._id,
        userId,
        amount: booking.totalAmount,
        currency: booking.currency || 'INR',
        gateway: gateway.name,
        gatewayOrderId: order.id,
        status: PAYMENT_STATUS.PENDING,
        rawResponse: { orderId: order.id },
      });
      // Never persist gatewayPaymentId:null — breaks sparse unique indexes on some engines.
      await Payment.updateOne(
        { _id: payment._id },
        { $unset: { gatewayPaymentId: 1, gatewaySignature: 1 } }
      );
      payment = await Payment.findById(payment._id);

      logger.info('payment.created', {
        paymentId: payment._id.toString(),
        bookingId: booking._id.toString(),
        gatewayOrderId: order.id,
      });
    }
  }

  if (booking.paymentStatus === BOOKING_PAYMENT_STATUS.FAILED) {
    booking.paymentStatus = BOOKING_PAYMENT_STATUS.PENDING;
    await booking.save();
  }

  const response = {
    paymentId: payment._id.toString(),
    gatewayOrderId: payment.gatewayOrderId,
    amount: payment.amount,
    currency: payment.currency,
    gateway: gateway.name,
    keyId: config.payment.keyId || (gateway.name === 'mock' ? 'mock_key_id' : ''),
  };

  if (gateway.name === 'mock' && typeof gateway.sign === 'function') {
    const mockPaymentId = `pay_mock_${payment._id.toString().slice(-8)}`;
    response.mock = true;
    response.mode = 'mock';
    response.mockPaymentId = mockPaymentId;
    response.mockSignature = gateway.sign({
      orderId: payment.gatewayOrderId,
      paymentId: mockPaymentId,
    });
  }

  return response;
}

export async function verify(userId, payload) {
  const {
    bookingId,
    orderId,
    paymentId,
    signature,
    gatewayOrderId,
    gatewayPaymentId,
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    mock,
  } = payload;

  let resolvedOrderId = orderId || gatewayOrderId || razorpay_order_id;
  let resolvedPaymentId = gatewayPaymentId || paymentId || razorpay_payment_id;
  let resolvedSignature = signature || razorpay_signature;

  const gateway = getGateway();

  // Local/dev mock checkout: never trust arbitrary client signatures unless gateway is mock
  if (mock && gateway.name === 'mock') {
    if (!resolvedOrderId) {
      throw new AppError('Invalid payment verification payload', {
        code: ErrorCodes.PAYMENT_INVALID,
        statusCode: 400,
      });
    }
    resolvedPaymentId = resolvedPaymentId || `pay_mock_${Date.now()}`;
    resolvedSignature =
      resolvedSignature && resolvedSignature !== 'mock_signature'
        ? resolvedSignature
        : gateway.sign({ orderId: resolvedOrderId, paymentId: resolvedPaymentId });
  }

  if (!resolvedOrderId || !resolvedPaymentId || !resolvedSignature) {
    throw new AppError('Invalid payment verification payload', {
      code: ErrorCodes.PAYMENT_INVALID,
      statusCode: 400,
    });
  }

  const payment = await Payment.findOne({ gatewayOrderId: resolvedOrderId });
  if (!payment) {
    throw new AppError('Payment not found', {
      code: ErrorCodes.PAYMENT_NOT_FOUND,
      statusCode: 404,
    });
  }
  if (payment.userId.toString() !== userId.toString()) {
    throw new AppError('You do not have permission for this payment', {
      code: ErrorCodes.AUTH_FORBIDDEN,
      statusCode: 403,
    });
  }

  if (bookingId && payment.bookingId.toString() !== bookingId.toString()) {
    throw new AppError('Payment does not match booking', {
      code: ErrorCodes.PAYMENT_INVALID,
      statusCode: 400,
    });
  }

  const booking = await Booking.findById(payment.bookingId);
  if (!booking) {
    throw new AppError('Booking not found', {
      code: ErrorCodes.BOOKING_NOT_FOUND,
      statusCode: 404,
    });
  }

  if (payment.status === PAYMENT_STATUS.SUCCESS) {
    return {
      booking,
      payment,
      alreadyProcessed: true,
    };
  }

  const ok = gateway.verifySignature({
    orderId: resolvedOrderId,
    paymentId: resolvedPaymentId,
    signature: resolvedSignature,
  });

  if (!ok) {
    payment.status = PAYMENT_STATUS.FAILED;
    await payment.save();
    booking.paymentStatus = BOOKING_PAYMENT_STATUS.FAILED;
    await booking.save();
    logger.info('payment.failed', { paymentId: payment._id.toString(), reason: 'bad_signature' });
    notificationService.sendPaymentFailure(booking).catch(() => {});
    throw new AppError('Payment verification failed', {
      code: ErrorCodes.PAYMENT_INVALID,
      statusCode: 400,
    });
  }

  try {
    const result = await confirmPaymentSuccess({
      payment,
      booking,
      gatewayPaymentId: resolvedPaymentId,
      gatewaySignature: resolvedSignature,
      raw: { source: 'verify' },
    });
    return result;
  } catch (err) {
    // Duplicate gatewayPaymentId unique index → already processed
    if (err.code === 11000) {
      const existing = await Payment.findOne({ gatewayPaymentId: resolvedPaymentId });
      const freshBooking = await Booking.findById(payment.bookingId);
      return { payment: existing || payment, booking: freshBooking, alreadyProcessed: true };
    }
    throw err;
  }
}

export async function handleWebhook(headers, rawBody) {
  const gateway = getGateway();
  const parsed = gateway.parseWebhook(headers, rawBody);

  if (!parsed.orderId) {
    return { received: true, ignored: true };
  }

  const successEvents = new Set([
    'payment.captured',
    'payment.authorized',
    'order.paid',
  ]);

  const failureEvents = new Set(['payment.failed']);

  const payment = await Payment.findOne({ gatewayOrderId: parsed.orderId });
  if (!payment) {
    logger.warn('payment.webhook_unknown_order', { orderId: parsed.orderId });
    return { received: true, ignored: true };
  }

  const booking = await Booking.findById(payment.bookingId);
  if (!booking) {
    return { received: true, ignored: true };
  }

  if (payment.status === PAYMENT_STATUS.SUCCESS) {
    return { received: true, alreadyProcessed: true };
  }

  if (failureEvents.has(parsed.event) || parsed.status === 'failed') {
    payment.status = PAYMENT_STATUS.FAILED;
    payment.rawResponse = { event: parsed.event };
    await payment.save();
    booking.paymentStatus = BOOKING_PAYMENT_STATUS.FAILED;
    await booking.save();
    logger.info('payment.failed', { paymentId: payment._id.toString(), source: 'webhook' });
    notificationService.sendPaymentFailure(booking).catch(() => {});
    return { received: true };
  }

  if (
    successEvents.has(parsed.event) ||
    parsed.status === 'captured' ||
    parsed.status === 'authorized'
  ) {
    try {
      await confirmPaymentSuccess({
        payment,
        booking,
        gatewayPaymentId: parsed.paymentId,
        gatewaySignature: headers['x-razorpay-signature'] || headers['x-mock-signature'],
        raw: parsed.raw,
      });
    } catch (err) {
      if (err.code === 11000) {
        return { received: true, alreadyProcessed: true };
      }
      throw err;
    }
  }

  return { received: true };
}

export async function listPaymentsAdmin(filters = {}) {
  const query = {};
  if (filters.status) query.status = filters.status;
  if (filters.userId) query.userId = filters.userId;
  if (filters.bookingId) query.bookingId = filters.bookingId;

  const payments = await Payment.find(query)
    .populate('userId', 'name email')
    .populate('bookingId', 'bookingNumber totalAmount')
    .sort({ createdAt: -1 });
  return { payments };
}

export async function getPaymentAdmin(paymentId) {
  const payment = await Payment.findById(paymentId)
    .populate('userId', 'name email phone')
    .populate('bookingId');
  if (!payment) {
    throw new AppError('Payment not found', {
      code: ErrorCodes.PAYMENT_NOT_FOUND,
      statusCode: 404,
    });
  }
  return payment;
}
