import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { success } from '../utils/response.js';
import * as notificationService from '../services/notificationService.js';

const router = Router();

router.get(
  '/',
  authenticate,
  asyncHandler(async (req, res) => {
    const data = await notificationService.listForUser(req.user._id);
    success(res, { message: 'Notifications fetched', data });
  })
);

router.patch(
  '/:id/read',
  authenticate,
  asyncHandler(async (req, res) => {
    const notification = await notificationService.markRead(req.user._id, req.params.id);
    success(res, { message: 'Notification updated', data: { notification } });
  })
);

export default router;
