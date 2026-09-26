import { Router } from 'express';
import * as rideController from '../controllers/rideController.js';
import { optionalAuth } from '../middleware/auth.js';
import { validate, searchRidesSchema } from '../validators/commonValidators.js';

const router = Router();

router.get('/search', optionalAuth, validate(searchRidesSchema, 'query'), rideController.search);
router.get('/:rideId', optionalAuth, rideController.getById);
router.get('/:rideId/seats', optionalAuth, rideController.getSeats);

export default router;
