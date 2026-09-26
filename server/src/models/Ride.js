import mongoose from 'mongoose';
import { RIDE_STATUS, SEAT_STATUS } from '../constants/enums.js';

const seatSchema = new mongoose.Schema(
  {
    seatNumber: { type: String, required: true },
    row: { type: Number },
    position: { type: String },
    status: { type: String, enum: Object.values(SEAT_STATUS), default: SEAT_STATUS.AVAILABLE },
    holdId: { type: String, default: null },
    holdExpiresAt: { type: Date, default: null },
    holdUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', default: null },
  },
  { _id: false }
);

const rideSchema = new mongoose.Schema(
  {
    routeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Route', required: true },
    driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver', required: true },
    vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true },
    date: { type: Date, required: true },
    departureTime: { type: Date, required: true },
    arrivalTime: { type: Date, required: true },
    pickupPoint: { type: String, required: true, trim: true },
    dropPoint: { type: String, required: true, trim: true },
    pricePerSeat: { type: Number, required: true, min: 1 },
    totalSeats: { type: Number, required: true, min: 1 },
    availableSeats: { type: Number, required: true, min: 0 },
    seats: { type: [seatSchema], required: true },
    status: { type: String, enum: Object.values(RIDE_STATUS), default: RIDE_STATUS.SCHEDULED },
  },
  { timestamps: true }
);

rideSchema.index({ date: 1, status: 1 });
rideSchema.index({ routeId: 1, date: 1, status: 1 });
rideSchema.index({ driverId: 1, date: 1 });
rideSchema.index({ status: 1, departureTime: 1 });

export const Ride = mongoose.model('Ride', rideSchema);
