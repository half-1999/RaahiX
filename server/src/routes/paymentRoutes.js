import { Router } from 'express';
import * as paymentController from '../controllers/paymentController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { ROLES } from '../constants/enums.js';
import { paymentRateLimiter } from '../middleware/rateLimit.js';
import {
  validate,
  createPaymentOrderSchema,
  verifyPaymentSchema,
} from '../validators/commonValidators.js';

const router = Router();

router.post(
  '/create-order',
  authenticate,
  authorize(ROLES.CUSTOMER),
  paymentRateLimiter,
  validate(createPaymentOrderSchema),
  paymentController.createOrder
);

router.post(
  '/verify',
  authenticate,
  authorize(ROLES.CUSTOMER),
  paymentRateLimiter,
  validate(verifyPaymentSchema),
  paymentController.verify
);

// Gateway webhook — no user JWT; signature verified in service via rawBody
router.post('/webhook', paymentController.webhook);

export default router;
