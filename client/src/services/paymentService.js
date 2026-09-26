import { api } from './api';

/**
 * Payment API helpers.
 *
 * Mock gateway (PAYMENT_GATEWAY=mock on server):
 * - create-order returns `{ mock: true, gatewayOrderId, mockPaymentId, mockSignature, ... }`
 * - verify with `{ bookingId, gatewayOrderId, gatewayPaymentId, mock: true }`
 *   Server accepts mock:true only when gateway is mock and signs HMAC itself.
 *   Do NOT invent client-side HMAC secrets.
 */
export const paymentService = {
  createOrder(bookingId) {
    return api.post('/payments/create-order', { bookingId }).then((r) => r.data.data);
  },
  verify(payload) {
    return api.post('/payments/verify', payload).then((r) => r.data.data);
  },
};

export function loadRazorpayScript() {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => reject(new Error('Failed to load Razorpay Checkout'));
    document.body.appendChild(script);
  });
}

export function isMockPaymentOrder(order) {
  if (!order) return false;
  if (order.mock === true || order.mode === 'mock' || order.gateway === 'mock') return true;
  const key = order.keyId || import.meta.env.VITE_PAYMENT_KEY_ID || '';
  return key === 'mock_key_id' || key.includes('placeholder') || key === 'mock';
}

/** Build verify payload for mock gateway — server must run with PAYMENT_GATEWAY=mock. */
export function buildMockVerifyPayload(order, bookingId) {
  const gatewayOrderId = order.gatewayOrderId || order.orderId;
  const gatewayPaymentId =
    order.mockPaymentId || order.gatewayPaymentId || `pay_mock_${Date.now()}`;

  return {
    bookingId,
    gatewayOrderId,
    gatewayPaymentId,
    mock: true,
    // Optional: if create-order returned mockSignature, include it; server regenerates if omitted
    ...(order.mockSignature
      ? { signature: order.mockSignature, orderId: gatewayOrderId, paymentId: gatewayPaymentId }
      : {}),
  };
}
