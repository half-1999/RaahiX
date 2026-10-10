import { Router } from 'express';
import authRoutes from './authRoutes.js';
import rideRoutes from './rideRoutes.js';
import bookingRoutes from './bookingRoutes.js';
import paymentRoutes from './paymentRoutes.js';
import driverRoutes from './driverRoutes.js';
import adminRoutes from './adminRoutes.js';
import notificationRoutes from './notificationRoutes.js';
import reviewRoutes from './reviewRoutes.js';
import locationRoutes from './locationRoutes.js';
import vehicleMediaRoutes from './vehicleMediaRoutes.js';

const router = Router();

router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'RaahiX API',
    data: { version: '1.0.0' },
  });
});

router.use('/auth', authRoutes);
router.use('/rides', rideRoutes);
router.use('/bookings', bookingRoutes);
router.use('/payments', paymentRoutes);
router.use('/driver', driverRoutes);
router.use('/admin', adminRoutes);
router.use('/notifications', notificationRoutes);
router.use('/locations', locationRoutes);
router.use('/vehicles', vehicleMediaRoutes);
router.use('/vehicles', reviewRoutes);

export default router;
