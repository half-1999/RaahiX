import { Router } from 'express';
import * as bookingController from '../controllers/bookingController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { ROLES } from '../constants/enums.js';
import {
  validate,
  holdSeatsSchema,
  createBookingSchema,
  cancelBookingSchema,
  paymentProofSchema,
} from '../validators/commonValidators.js';

const router = Router();

router.post(
  '/hold',
  authenticate,
  authorize(ROLES.CUSTOMER),
  validate(holdSeatsSchema),
  bookingController.hold
);

router.post(
  '/',
  authenticate,
  authorize(ROLES.CUSTOMER),
  validate(createBookingSchema),
  bookingController.create
);

router.get('/', authenticate, authorize(ROLES.CUSTOMER), bookingController.listMine);
// Alias so /bookings/my is not captured by /:bookingId
router.get('/my', authenticate, authorize(ROLES.CUSTOMER), bookingController.listMine);
router.get('/mine', authenticate, authorize(ROLES.CUSTOMER), bookingController.listMine);

router.get(
  '/:bookingId',
  authenticate,
  authorize(ROLES.CUSTOMER, ROLES.ADMIN),
  bookingController.getById
);

router.post(
  '/:bookingId/cancel',
  authenticate,
  authorize(ROLES.CUSTOMER, ROLES.ADMIN),
  validate(cancelBookingSchema),
  bookingController.cancel
);

router.post(
  '/:bookingId/payment-proof',
  authenticate,
  authorize(ROLES.CUSTOMER),
  validate(paymentProofSchema),
  bookingController.submitProof
);

router.get(
  '/:bookingId/proof',
  authenticate,
  authorize(ROLES.CUSTOMER, ROLES.DRIVER, ROLES.ADMIN),
  bookingController.readProof
);

export default router;
