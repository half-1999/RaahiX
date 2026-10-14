import { Review } from '../models/Review.js';
import { User } from '../models/User.js';
import { Ride } from '../models/Ride.js';
import { Booking } from '../models/Booking.js';
import { Vehicle } from '../models/Vehicle.js';
import { BOOKING_STATUS, RIDE_STATUS } from '../constants/enums.js';
import { AppError } from '../utils/AppError.js';
import { ErrorCodes } from '../constants/errorCodes.js';

async function priorRide(userId, vehicleId) {
  const rides = await Ride.find({
    vehicleId,
    status: { $nin: [RIDE_STATUS.CANCELLED, RIDE_STATUS.DRAFT] },
    departureTime: { $lt: new Date() },
  }).select('_id');
  if (!rides.length) return null;
  return Booking.findOne({
    userId,
    rideId: { $in: rides.map((ride) => ride._id) },
    bookingStatus: BOOKING_STATUS.CONFIRMED,
  });
}

export async function listReviews(vehicleId) {
  const vehicle = await Vehicle.findById(vehicleId).select('_id');
  if (!vehicle) {
    throw new AppError('Vehicle not found', { code: ErrorCodes.VEHICLE_NOT_FOUND, statusCode: 404 });
  }
  void User;
  const reviews = await Review.find({ vehicleId }).populate('userId', 'name').sort({ createdAt: -1 }).limit(40);
  const average = reviews.length
    ? Math.round((reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length) * 10) / 10
    : 0;
  return {
    average,
    count: reviews.length,
    reviews: reviews.map((review) => ({
      id: review._id,
      rating: review.rating,
      comment: review.comment,
      author: review.userId?.name || 'Passenger',
      createdAt: review.createdAt,
    })),
  };
}

export async function createReview(userId, vehicleId, { rating, comment }) {
  const score = Number(rating);
  const text = String(comment || '').trim();
  if (!Number.isInteger(score) || score < 1 || score > 5) {
    throw new AppError('Rating must be a whole number from 1 to 5', {
      code: ErrorCodes.VALIDATION_ERROR,
      statusCode: 400,
    });
  }
  if (text.length < 3) {
    throw new AppError('Write a short review', {
      code: ErrorCodes.VALIDATION_ERROR,
      statusCode: 400,
    });
  }
  const booking = await priorRide(userId, vehicleId);
  if (!booking) {
    throw new AppError('You can review a car only after you have ridden in it', {
      code: ErrorCodes.AUTH_FORBIDDEN,
      statusCode: 403,
    });
  }
  const existing = await Review.findOne({ vehicleId, userId });
  if (existing) {
    throw new AppError('You have already reviewed this ride', {
      code: ErrorCodes.CONFLICT,
      statusCode: 409,
    });
  }
  const review = await Review.create({
    vehicleId,
    userId,
    rating: score,
    comment: text,
    bookingId: booking._id,
  });
  return review;
}

export async function canReview(userId, vehicleId) {
  if (!userId) return false;
  const booking = await priorRide(userId, vehicleId);
  return Boolean(booking);
}
