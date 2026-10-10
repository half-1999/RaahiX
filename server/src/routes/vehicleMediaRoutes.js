import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { readPrimary } from '../services/vehicleImageService.js';

const router = Router();

router.get(
  '/:vehicleId/photo',
  asyncHandler(async (req, res) => {
    const { buffer, mime } = await readPrimary(req.params.vehicleId);
    res.setHeader('Content-Type', mime);
    res.setHeader('Cache-Control', 'private, max-age=300');
    res.send(buffer);
  })
);

export default router;
