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

const rideStopSchema = new mongoose.Schema(
  {
    locationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Location' },
    name: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    sequence: { type: Number, required: true, min: 1 },
    pickupAllowed: { type: Boolean, default: true },
    dropAllowed: { type: Boolean, default: true },
    estimatedTime: { type: Date, default: null },
  },
  { _id: false }
);

const legSchema = new mongoose.Schema(
  {
    fromSequence: { type: Number, required: true },
    toSequence: { type: Number, required: true },
    fromLocationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Location' },
    toLocationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Location' },
    capacity: { type: Number, required: true, min: 1 },
    committed: { type: Number, required: true, min: 0, default: 0 },
  },
  { _id: false }
);

const segmentHoldSchema = new mongoose.Schema(
  {
    holdId: { type: String, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    seatCount: { type: Number, required: true, min: 1 },
    pickupLocationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Location', required: true },
    dropLocationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Location', required: true },
    pickupSequence: { type: Number, required: true },
    dropSequence: { type: Number, required: true },
    holdExpiresAt: { type: Date, required: true },
    status: { type: String, enum: ['ACTIVE', 'CONFIRMED', 'RELEASED'], default: 'ACTIVE' },
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
    rideStops: { type: [rideStopSchema], default: [] },
    legs: { type: [legSchema], default: [] },
    segmentHolds: { type: [segmentHoldSchema], default: [] },
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
