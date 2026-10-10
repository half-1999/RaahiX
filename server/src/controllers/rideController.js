import * as rideService from '../services/rideService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { success } from '../utils/response.js';

export const catalog = asyncHandler(async (req, res) => {
  const data = await rideService.catalog();
  success(res, { message: 'Ride catalog fetched', data });
});

export const search = asyncHandler(async (req, res) => {
  const data = await rideService.search(req.query);
  success(res, { message: 'Rides fetched successfully', data });
});

export const getById = asyncHandler(async (req, res) => {
  const data = await rideService.getRide(req.params.rideId);
  success(res, { message: 'Ride fetched successfully', data });
});

export const getSeats = asyncHandler(async (req, res) => {
  const data = await rideService.getSeats(req.params.rideId);
  success(res, { message: 'Seats fetched successfully', data });
});
