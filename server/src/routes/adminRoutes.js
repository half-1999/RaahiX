import { Router } from 'express';
import * as adminController from '../controllers/adminController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { ROLES } from '../constants/enums.js';
import {
  validate,
  createDriverSchema,
  updateDriverSchema,
  createVehicleSchema,
  updateVehicleSchema,
  createRouteSchema,
  updateRouteSchema,
  createRideSchema,
  updateRideSchema,
  updateUserStatusSchema,
} from '../validators/commonValidators.js';

const router = Router();

router.use(authenticate, authorize(ROLES.ADMIN));

router.get('/dashboard', adminController.dashboard);

// Users
router.get('/users', adminController.listUsers);
router.get('/users/:id', adminController.getUser);
router.patch(
  '/users/:id/status',
  validate(updateUserStatusSchema),
  adminController.updateUserStatus
);

// Drivers
router.get('/drivers', adminController.listDrivers);
router.post('/drivers', validate(createDriverSchema), adminController.createDriver);
router.get('/drivers/:id', adminController.getDriver);
router.patch('/drivers/:id', validate(updateDriverSchema), adminController.updateDriver);

// Vehicles
router.get('/vehicles', adminController.listVehicles);
router.post('/vehicles', validate(createVehicleSchema), adminController.createVehicle);
router.get('/vehicles/:id', adminController.getVehicle);
router.patch('/vehicles/:id', validate(updateVehicleSchema), adminController.updateVehicle);

// Routes
router.get('/routes', adminController.listRoutes);
router.post('/routes', validate(createRouteSchema), adminController.createRoute);
router.patch('/routes/:id', validate(updateRouteSchema), adminController.updateRoute);

// Rides
router.get('/rides', adminController.listRides);
router.post('/rides', validate(createRideSchema), adminController.createRide);
router.get('/rides/:id', adminController.getRide);
router.patch('/rides/:id', validate(updateRideSchema), adminController.updateRide);
router.delete('/rides/:id', adminController.cancelRide);

// Bookings / Payments
router.get('/bookings', adminController.listBookings);
router.get('/bookings/:id', adminController.getBooking);
router.get('/payments', adminController.listPayments);
router.get('/payments/:id', adminController.getPayment);

// Reports
router.get('/reports/revenue', adminController.revenueReport);
router.get('/reports/bookings', adminController.bookingsReport);
router.get('/reports/rides', adminController.ridesReport);

// Audit
router.get('/audit-logs', adminController.listAuditLogs);

export default router;
