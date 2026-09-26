import * as paymentService from '../services/paymentService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { success } from '../utils/response.js';

export const createOrder = asyncHandler(async (req, res) => {
  const data = await paymentService.createOrder(req.user._id, req.body);
  success(res, { message: 'Payment order created', data, statusCode: 201 });
});

export const verify = asyncHandler(async (req, res) => {
  const data = await paymentService.verify(req.user._id, req.body);
  const message = data.alreadyProcessed
    ? 'Payment already processed'
    : 'Payment verified successfully';
  success(res, { message, data: { booking: data.booking, payment: data.payment } });
});

export const webhook = asyncHandler(async (req, res) => {
  const rawBody = req.rawBody || Buffer.from(JSON.stringify(req.body || {}));
  const data = await paymentService.handleWebhook(req.headers, rawBody);
  success(res, { message: 'Webhook received', data });
});
