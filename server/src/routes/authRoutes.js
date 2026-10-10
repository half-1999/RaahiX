import { Router } from 'express';
import * as authController from '../controllers/authController.js';
import {
  validate,
  registerSchema,
  registerDriverSchema,
  loginSchema,
  refreshSchema,
  updateProfileSchema,
} from '../validators/authValidators.js';
import { authenticate } from '../middleware/auth.js';
import { authRateLimiter } from '../middleware/rateLimit.js';

const router = Router();

router.post('/register', authRateLimiter, validate(registerSchema), authController.register);
router.post(
  '/register-driver',
  authRateLimiter,
  validate(registerDriverSchema),
  authController.registerDriver
);
router.post('/login', authRateLimiter, validate(loginSchema), authController.login);
router.post('/refresh', authRateLimiter, validate(refreshSchema), authController.refresh);
router.post('/logout', authenticate, authController.logout);
router.get('/me', authenticate, authController.me);
router.patch('/me', authenticate, validate(updateProfileSchema), authController.updateProfile);

export default router;
