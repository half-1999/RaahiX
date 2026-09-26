import mongoose from 'mongoose';
import { BOOKING_PAYMENT_STATUS, BOOKING_STATUS } from '../constants/enums.js';

const passengerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    age: { type: Number, required: true, min: 1, max: 120 },
    seatNumber: { type: String, required: true },
  },
  { _id: false }
);

const bookingSchema = new mongoose.Schema(
  {
    bookingNumber: { type: String, required: true, unique: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    rideId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ride', required: true },
    passengers: { type: [passengerSchema], required: true },
    selectedSeats: { type: [String], required: true },
    passengerCount: { type: Number, required: true, min: 1 },
    amountPerSeat: { type: Number, required: true, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'INR' },
    paymentStatus: {
      type: String,
      enum: Object.values(BOOKING_PAYMENT_STATUS),
      default: BOOKING_PAYMENT_STATUS.PENDING,
    },
    bookingStatus: {
      type: String,
      enum: Object.values(BOOKING_STATUS),
      default: BOOKING_STATUS.PENDING,
    },
    holdId: { type: String, required: true },
    holdExpiresAt: { type: Date, required: true },
    cancellationReason: { type: String, default: null },
    cancelledAt: { type: Date, default: null },
  },
  { timestamps: true }
);

bookingSchema.index({ userId: 1, createdAt: -1 });
bookingSchema.index({ rideId: 1 });
bookingSchema.index({ bookingStatus: 1, paymentStatus: 1 });
bookingSchema.index({ holdExpiresAt: 1 }, { sparse: true });

export const Booking = mongoose.model('Booking', bookingSchema);
