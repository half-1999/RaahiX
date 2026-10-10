import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { success } from '../utils/response.js';
import { listPublicCities } from '../services/locationService.js';

const router = Router();

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const data = await listPublicCities();
    success(res, { message: 'Locations fetched', data });
  })
);

export default router;
