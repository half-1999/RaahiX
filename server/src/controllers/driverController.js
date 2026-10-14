import * as driverOpsService from '../services/driverOpsService.js';
import * as vehicleService from '../services/vehicleService.js';
import * as routeService from '../services/routeService.js';
import * as paymentProofService from '../services/paymentProofService.js';
import * as vehicleImageService from '../services/vehicleImageService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { success } from '../utils/response.js';

export const listVehicles = asyncHandler(async (req, res) => {
  const data = await vehicleService.listOwnVehicles(req.user._id);
  success(res, { message: 'Vehicles fetched', data });
});

export const createVehicle = asyncHandler(async (req, res) => {
  const vehicle = await vehicleService.createOwnVehicle(req.user._id, req.body, req.user);
  success(res, { message: 'Vehicle created', data: { vehicle }, statusCode: 201 });
});

export const updateVehicle = asyncHandler(async (req, res) => {
  const vehicle = await vehicleService.updateOwnVehicle(
    req.user._id,
    req.params.vehicleId,
    req.body,
    req.user
  );
  success(res, { message: 'Vehicle updated', data: { vehicle } });
});

export const deactivateVehicle = asyncHandler(async (req, res) => {
  const vehicle = await vehicleService.deactivateOwnVehicle(
    req.user._id,
    req.params.vehicleId,
    req.user
  );
  success(res, { message: 'Vehicle deactivated', data: { vehicle } });
});

export const listActiveRoutes = asyncHandler(async (req, res) => {
  const data = await routeService.listActiveRoutes();
  success(res, { message: 'Active routes fetched', data });
});

export const listRoutes = asyncHandler(async (req, res) => {
  const data = await routeService.listOwnRoutes(req.user._id);
  success(res, { message: 'Routes fetched', data });
});

export const createRoute = asyncHandler(async (req, res) => {
  const route = await routeService.createOwnRoute(req.user._id, req.body, req.user);
  success(res, { message: 'Route created', data: { route }, statusCode: 201 });
});

export const dashboard = asyncHandler(async (req, res) => {
  const data = await driverOpsService.dashboard(req.user._id);
  success(res, { message: 'Driver dashboard fetched', data });
});

export const listRides = asyncHandler(async (req, res) => {
  const data = await driverOpsService.listRides(req.user._id, req.query);
  success(res, { message: 'Driver rides fetched', data });
});

export const getRide = asyncHandler(async (req, res) => {
  const ride = await driverOpsService.getRide(req.user._id, req.params.rideId);
  success(res, { message: 'Ride fetched', data: { ride } });
});

export const getPassengers = asyncHandler(async (req, res) => {
  const data = await driverOpsService.getPassengers(req.user._id, req.params.rideId);
  success(res, { message: 'Passengers fetched', data });
});

export const updateRide = asyncHandler(async (req, res) => {
  const ride = await driverOpsService.updateRide(req.user._id, req.params.rideId, req.body);
  success(res, { message: 'Ride updated', data: { ride } });
});

export const createRide = asyncHandler(async (req, res) => {
  const ride = await driverOpsService.createRide(req.user._id, req.body);
  success(res, { message: 'Ride draft created', data: { ride }, statusCode: 201 });
});

export const updateCapacity = asyncHandler(async (req, res) => {
  const ride = await driverOpsService.updateCapacity(req.user._id, req.params.rideId, req.body.capacity);
  success(res, { message: 'Ride capacity updated', data: { ride } });
});

export const paymentDetails = asyncHandler(async (req, res) => {
  const data = await paymentProofService.getPaymentDetails(req.user._id);
  success(res, { message: 'Payment details fetched', data });
});

export const updatePaymentDetails = asyncHandler(async (req, res) => {
  const data = await paymentProofService.updatePaymentDetails(req.user._id, req.body);
  success(res, { message: 'Payment details updated', data });
});

export const listBookings = asyncHandler(async (req, res) => {
  const data = await paymentProofService.listForDriver(req.user._id, req.query);
  success(res, { message: 'Bookings fetched', data });
});

export const listRefunds = asyncHandler(async (req, res) => {
  const data = await paymentProofService.listRefundsForDriver(req.user._id, req.query);
  success(res, { message: 'Refunds fetched', data });
});

export const markRefund = asyncHandler(async (req, res) => {
  const booking = await paymentProofService.markRefundProcessed(req.user._id, req.params.bookingId, req.body);
  success(res, { message: 'Refund marked processed', data: { booking } });
});

export const addVehicleImage = asyncHandler(async (req, res) => {
  const vehicle = await vehicleImageService.addImage(req.user._id, req.params.vehicleId, req.body.image);
  success(res, { message: 'Car photo saved', data: { vehicle } });
});

export const removeVehicleImage = asyncHandler(async (req, res) => {
  const vehicle = await vehicleImageService.removeImage(
    req.user._id,
    req.params.vehicleId,
    req.params.imageId
  );
  success(res, { message: 'Car photo removed', data: { vehicle } });
});

export const reviewPayment = asyncHandler(async (req, res) => {
  const booking = await paymentProofService.reviewProof(req.user._id, req.params.bookingId, req.body);
  success(res, { message: 'Payment reviewed', data: { booking } });
});

export const updateStatus = asyncHandler(async (req, res) => {
  const ride = await driverOpsService.updateStatus(
    req.user._id,
    req.params.rideId,
    req.body.status
  );
  success(res, { message: 'Ride status updated', data: { ride } });
});
