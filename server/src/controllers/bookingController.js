import * as bookingService from '../services/bookingService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { success } from '../utils/response.js';

export const hold = asyncHandler(async (req, res) => {
  const data = await bookingService.hold(req.user._id, req.body);
  success(res, { message: 'Seats held successfully', data, statusCode: 201 });
});

export const create = asyncHandler(async (req, res) => {
  const booking = await bookingService.createFromHold(req.user._id, req.body);
  success(res, { message: 'Booking created successfully', data: { booking }, statusCode: 201 });
});

export const listMine = asyncHandler(async (req, res) => {
  const data = await bookingService.listMine(req.user._id);
  success(res, { message: 'Bookings fetched successfully', data });
});

export const getById = asyncHandler(async (req, res) => {
  const booking = await bookingService.getById(req.params.bookingId, req.user);
  success(res, { message: 'Booking fetched successfully', data: { booking } });
});

export const cancel = asyncHandler(async (req, res) => {
  const booking = await bookingService.cancel(req.params.bookingId, req.user, req.body);
  success(res, { message: 'Booking cancelled successfully', data: { booking } });
});
