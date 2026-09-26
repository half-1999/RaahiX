import crypto from 'crypto';
import { config } from '../../config/index.js';
import { AppError } from '../../utils/AppError.js';
import { ErrorCodes } from '../../constants/errorCodes.js';
import { logger } from '../../utils/logger.js';

function hmacSha256(secret, payload) {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

function timingSafeEqualHex(a, b) {
  try {
    const bufA = Buffer.from(a, 'hex');
    const bufB = Buffer.from(b, 'hex');
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return a === b;
  }
}

/** Mock gateway for tests and local development without Razorpay keys */
export const mockGateway = {
  name: 'mock',

  async createOrder({ amount, currency = 'INR', receipt }) {
    const id = `order_mock_${crypto.randomBytes(8).toString('hex')}`;
    return {
      id,
      amount: Math.round(amount * 100), // paise-like for client parity
      currency,
      receipt,
      status: 'created',
    };
  },

  verifySignature({ orderId, paymentId, signature }) {
    const secret = config.payment.keySecret || 'mock_secret';
    const expected = hmacSha256(secret, `${orderId}|${paymentId}`);
    return timingSafeEqualHex(expected, signature);
  },

  /** Helper for tests to produce a valid signature */
  sign({ orderId, paymentId }) {
    const secret = config.payment.keySecret || 'mock_secret';
    return hmacSha256(secret, `${orderId}|${paymentId}`);
  },

  parseWebhook(headers, rawBody) {
    const signature = headers['x-razorpay-signature'] || headers['x-mock-signature'];
    const secret = config.payment.webhookSecret || config.payment.keySecret || 'mock_secret';
    const bodyStr = Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : String(rawBody || '');
    const expected = hmacSha256(secret, bodyStr);
    if (!signature || !timingSafeEqualHex(expected, signature)) {
      throw new AppError('Invalid webhook signature', {
        code: ErrorCodes.PAYMENT_INVALID,
        statusCode: 400,
      });
    }

    const event = typeof bodyStr === 'string' ? JSON.parse(bodyStr) : bodyStr;
    const entity = event?.payload?.payment?.entity || event?.payment || {};
    return {
      event: event.event || 'payment.captured',
      orderId: entity.order_id || event.orderId,
      paymentId: entity.id || event.paymentId,
      status: entity.status || event.status || 'captured',
      amount: entity.amount,
      raw: event,
    };
  },
};

export const razorpayGateway = {
  name: 'razorpay',

  async createOrder({ amount, currency = 'INR', receipt }) {
    const keyId = config.payment.keyId;
    const keySecret = config.payment.keySecret;
    if (!keyId || !keySecret) {
      throw new AppError('Payment gateway is not configured', {
        code: ErrorCodes.PAYMENT_INVALID,
        statusCode: 500,
      });
    }

    // Dynamic import so tests without razorpay keys can use mock
    const Razorpay = (await import('razorpay')).default;
    const client = new Razorpay({ key_id: keyId, key_secret: keySecret });

    const order = await client.orders.create({
      amount: Math.round(amount * 100),
      currency,
      receipt: String(receipt).slice(0, 40),
      payment_capture: 1,
    });

    return {
      id: order.id,
      amount: order.amount,
      currency: order.currency,
      receipt: order.receipt,
      status: order.status,
    };
  },

  verifySignature({ orderId, paymentId, signature }) {
    const secret = config.payment.keySecret;
    if (!secret || !orderId || !paymentId || !signature) return false;
    const expected = hmacSha256(secret, `${orderId}|${paymentId}`);
    return timingSafeEqualHex(expected, signature);
  },

  parseWebhook(headers, rawBody) {
    const signature = headers['x-razorpay-signature'];
    const secret = config.payment.webhookSecret || config.payment.keySecret;
    const bodyStr = Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : String(rawBody || '');
    if (!secret || !signature) {
      throw new AppError('Invalid webhook signature', {
        code: ErrorCodes.PAYMENT_INVALID,
        statusCode: 400,
      });
    }
    const expected = hmacSha256(secret, bodyStr);
    if (!timingSafeEqualHex(expected, signature)) {
      throw new AppError('Invalid webhook signature', {
        code: ErrorCodes.PAYMENT_INVALID,
        statusCode: 400,
      });
    }

    const event = JSON.parse(bodyStr);
    const entity = event?.payload?.payment?.entity || {};
    return {
      event: event.event,
      orderId: entity.order_id,
      paymentId: entity.id,
      status: entity.status,
      amount: entity.amount,
      raw: event,
    };
  },
};

let injectedGateway = null;

export function setGateway(gateway) {
  injectedGateway = gateway;
}

export function getGateway() {
  if (injectedGateway) return injectedGateway;
  const name = (config.payment.gateway || 'razorpay').toLowerCase();
  if (name === 'mock') {
    logger.info('payment.gateway', { gateway: 'mock' });
    return mockGateway;
  }
  return razorpayGateway;
}
