import * as driverOpsService from '../services/driverOpsService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { success } from '../utils/response.js';

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

export const updateStatus = asyncHandler(async (req, res) => {
  const ride = await driverOpsService.updateStatus(
    req.user._id,
    req.params.rideId,
    req.body.status
  );
  success(res, { message: 'Ride status updated', data: { ride } });
});
