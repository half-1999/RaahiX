import mongoose from 'mongoose';
import { RIDE_STATUS, RIDE_STATUS_CHANGE_SOURCE, SEAT_STATUS } from '../constants/enums.js';

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

const statusHistorySchema = new mongoose.Schema(
  {
    fromStatus: { type: String, default: null },
    toStatus: { type: String, required: true },
    source: {
      type: String,
      enum: Object.values(RIDE_STATUS_CHANGE_SOURCE),
      default: RIDE_STATUS_CHANGE_SOURCE.MANUAL,
    },
    at: { type: Date, default: Date.now },
    note: { type: String, default: null },
  },
  { _id: false }
);

const rideSchema = new mongoose.Schema(
  {
    routeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Route', required: true },
    driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver', required: true },
    vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true },
    sourceLocationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Location', default: null },
    destinationLocationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Location', default: null },
    sourceName: { type: String, default: null, trim: true },
    destinationName: { type: String, default: null, trim: true },
    date: { type: Date, required: true },
    departureTime: { type: Date, required: true },
    arrivalTime: { type: Date, required: true },
    estimatedDurationMinutes: { type: Number, min: 1, default: null },
    estimatedCompletionAt: { type: Date, default: null },
    actualStartedAt: { type: Date, default: null },
    actualCompletedAt: { type: Date, default: null },
    statusChangedAt: { type: Date, default: null },
    statusChangeSource: {
      type: String,
      enum: [...Object.values(RIDE_STATUS_CHANGE_SOURCE), null],
      default: null,
    },
    statusHistory: { type: [statusHistorySchema], default: [] },
    voidedAt: { type: Date, default: null },
    voidedReason: { type: String, default: null },
    notes: { type: String, default: null, trim: true, maxlength: 500 },
    pickupPoint: { type: String, required: true, trim: true },
    dropPoint: { type: String, required: true, trim: true },
    rideStops: { type: [rideStopSchema], default: [] },
    legs: { type: [legSchema], default: [] },
    segmentHolds: { type: [segmentHoldSchema], default: [] },
    pricePerSeat: { type: Number, required: true, min: 1 },
    frontSeatPrice: { type: Number, min: 0, default: null },
    pickupPoints: { type: [String], default: [] },
    dropPoints: { type: [String], default: [] },
    totalSeats: { type: Number, required: true, min: 1 },
    availableSeats: { type: Number, required: true, min: 0 },
    seats: { type: [seatSchema], required: true },
    status: {
      type: String,
      enum: Object.values(RIDE_STATUS),
      default: RIDE_STATUS.SCHEDULED,
    },
    isSeed: { type: Boolean, default: false },
    /** Demonstration inventory — not live marketplace inventory. */
    isDemo: { type: Boolean, default: false },
  },
  { timestamps: true }
);

rideSchema.index({ isDemo: 1, status: 1, departureTime: 1 });

rideSchema.index({ date: 1, status: 1 });
rideSchema.index({ routeId: 1, date: 1, status: 1 });
rideSchema.index({ driverId: 1, date: 1 });
rideSchema.index({ status: 1, departureTime: 1 });
rideSchema.index({ status: 1, estimatedCompletionAt: 1 });
rideSchema.index({ voidedAt: 1, status: 1, departureTime: 1 });
rideSchema.index({ driverId: 1, voidedAt: 1, departureTime: 1 });

export const Ride = mongoose.model('Ride', rideSchema);
