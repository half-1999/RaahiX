import { Router } from 'express';
import * as driverController from '../controllers/driverController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { ROLES } from '../constants/enums.js';
import { validate, driverStatusSchema } from '../validators/commonValidators.js';

const router = Router();

router.use(authenticate, authorize(ROLES.DRIVER));

router.get('/dashboard', driverController.dashboard);
router.get('/rides', driverController.listRides);
router.get('/rides/:rideId', driverController.getRide);
router.get('/rides/:rideId/passengers', driverController.getPassengers);
router.patch(
  '/rides/:rideId/status',
  validate(driverStatusSchema),
  driverController.updateStatus
);

export default router;
