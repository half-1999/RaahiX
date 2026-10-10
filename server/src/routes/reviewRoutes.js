import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../validators/authValidators.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { success } from '../utils/response.js';
import * as reviewService from '../services/reviewService.js';

const router = Router();

const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().min(3).max(500),
});

router.get(
  '/:vehicleId/reviews',
  asyncHandler(async (req, res) => {
    const data = await reviewService.listReviews(req.params.vehicleId);
    success(res, { message: 'Reviews fetched', data });
  })
);

router.get(
  '/:vehicleId/reviews/eligibility',
  authenticate,
  asyncHandler(async (req, res) => {
    const allowed = await reviewService.canReview(req.user._id, req.params.vehicleId);
    success(res, { message: 'Review eligibility', data: { allowed } });
  })
);

router.post(
  '/:vehicleId/reviews',
  authenticate,
  validate(reviewSchema),
  asyncHandler(async (req, res) => {
    const review = await reviewService.createReview(req.user._id, req.params.vehicleId, req.body);
    success(res, { message: 'Review saved', data: { review }, statusCode: 201 });
  })
);

export default router;
