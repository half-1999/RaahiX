import { Router } from 'express';
import * as driverController from '../controllers/driverController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { ROLES } from '../constants/enums.js';
import {
  validate,
  driverStatusSchema,
  driverVoidRideSchema,
  driverVehicleSchema,
  driverUpdateVehicleSchema,
  driverRouteSchema,
  driverUpdateRouteSchema,
  driverRideSchema,
  driverUpdateRideSchema,
  driverCapacitySchema,
  driverPaymentDetailsSchema,
  paymentReviewSchema,
  driverPassengerSchema,
  driverUpdatePassengerSchema,
} from '../validators/commonValidators.js';

const router = Router();

router.use(authenticate, authorize(ROLES.DRIVER));

router.get('/dashboard', driverController.dashboard);
router.get('/dashboard/today', driverController.todayReport);
router.get('/passengers', driverController.listAllPassengers);
router.get('/payment-details', driverController.paymentDetails);
router.patch(
  '/payment-details',
  validate(driverPaymentDetailsSchema),
  driverController.updatePaymentDetails
);
router.get('/bookings', driverController.listBookings);
router.get('/refunds', driverController.listRefunds);
router.post('/bookings/:bookingId/refund', driverController.markRefund);
router.post('/vehicles/:vehicleId/images', driverController.addVehicleImage);
router.delete('/vehicles/:vehicleId/images/:imageId', driverController.removeVehicleImage);
router.post(
  '/bookings/:bookingId/review',
  validate(paymentReviewSchema),
  driverController.reviewPayment
);
router.get('/vehicles', driverController.listVehicles);
router.post('/vehicles', validate(driverVehicleSchema), driverController.createVehicle);
router.patch('/vehicles/:vehicleId', validate(driverUpdateVehicleSchema), driverController.updateVehicle);
router.delete('/vehicles/:vehicleId', driverController.deactivateVehicle);
router.get('/routes/available', driverController.listActiveRoutes);
router.get('/routes', driverController.listRoutes);
router.post('/routes', validate(driverRouteSchema), driverController.createRoute);
router.patch('/routes/:routeId', validate(driverUpdateRouteSchema), driverController.updateRoute);
router.delete('/routes/:routeId', driverController.deactivateRoute);
router.get('/rides', driverController.listRides);
router.post('/rides', validate(driverRideSchema), driverController.createRide);
router.patch('/rides/:rideId', validate(driverUpdateRideSchema), driverController.updateRide);
router.patch('/rides/:rideId/capacity', validate(driverCapacitySchema), driverController.updateCapacity);
router.get('/rides/:rideId', driverController.getRide);
router.get('/rides/:rideId/passengers', driverController.getPassengers);
router.post(
  '/rides/:rideId/passengers',
  validate(driverPassengerSchema),
  driverController.addPassenger
);
router.patch(
  '/passengers/:passengerId',
  validate(driverUpdatePassengerSchema),
  driverController.updatePassenger
);
router.patch(
  '/rides/:rideId/status',
  validate(driverStatusSchema),
  driverController.updateStatus
);
router.post(
  '/rides/:rideId/void',
  validate(driverVoidRideSchema),
  driverController.voidRide
);

export default router;
