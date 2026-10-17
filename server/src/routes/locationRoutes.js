import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { success } from '../utils/response.js';
import {
  listPublicCities,
  listLocations,
  searchLocations,
  createLocation,
} from '../services/locationService.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { ROLES } from '../constants/enums.js';
import { validate } from '../validators/commonValidators.js';
import { z } from 'zod';

const router = Router();

const createLocationSchema = z.object({
  name: z.string().min(1).max(120),
  city: z.string().min(1).max(120).optional(),
  state: z.string().min(1).max(120).optional(),
  country: z.string().min(1).max(120).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});

router.get(
  '/',
  asyncHandler(async (req, res) => {
    if (req.query.q != null || req.query.search != null) {
      const data = await searchLocations(req.query.q || req.query.search, {
        limit: req.query.limit,
      });
      return success(res, { message: 'Locations searched', data });
    }
    if (req.query.full === '1') {
      const data = await listLocations();
      return success(res, { message: 'Locations fetched', data });
    }
    const data = await listPublicCities();
    success(res, { message: 'Locations fetched', data });
  })
);

router.post(
  '/',
  authenticate,
  authorize(ROLES.DRIVER, ROLES.ADMIN),
  validate(createLocationSchema),
  asyncHandler(async (req, res) => {
    const location = await createLocation(
      {
        name: req.body.name,
        city: req.body.city || req.body.name,
        state: req.body.state || req.body.city || req.body.name,
        country: req.body.country,
        latitude: req.body.latitude,
        longitude: req.body.longitude,
      },
      req.user
    );
    success(res, { message: 'Location saved', data: { location }, statusCode: 201 });
  })
);

export default router;
