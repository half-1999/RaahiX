import * as bookingService from '../services/bookingService.js';
import * as paymentProofService from '../services/paymentProofService.js';
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
  const data = await bookingService.listMine(req.user._id, req.query);
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

export const submitProof = asyncHandler(async (req, res) => {
  const booking = await paymentProofService.submitProof(req.user._id, req.params.bookingId, req.body);
  success(res, { message: 'Payment proof submitted', data: { booking } });
});

export const readProof = asyncHandler(async (req, res) => {
  const file = await paymentProofService.readProof(req.user, req.params.bookingId);
  res.set('Content-Type', file.mime);
  res.set('Cache-Control', 'private, no-store');
  res.send(file.buffer);
});
