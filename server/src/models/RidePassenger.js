import mongoose from 'mongoose';
import { GUEST_PAYMENT_STATUS } from '../constants/enums.js';

/**
 * Manually added (guest) passengers assigned to a ride by the driver.
 * Does not create a User account.
 */
const ridePassengerSchema = new mongoose.Schema(
  {
    rideId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ride', required: true, index: true },
    driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    phone: { type: String, default: null, trim: true },
    email: { type: String, default: null, trim: true, lowercase: true },
    pickupLocationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Location', default: null },
    dropLocationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Location', default: null },
    pickupName: { type: String, default: null, trim: true },
    dropName: { type: String, default: null, trim: true },
    seatNumbers: { type: [String], default: [] },
    seatCount: { type: Number, required: true, min: 1, max: 6 },
    fareAmount: { type: Number, required: true, min: 0 },
    amountCollected: { type: Number, default: 0, min: 0 },
    paymentStatus: {
      type: String,
      enum: Object.values(GUEST_PAYMENT_STATUS),
      default: GUEST_PAYMENT_STATUS.PENDING,
    },
    paymentMethod: { type: String, default: null, trim: true },
    paymentReference: { type: String, default: null, trim: true },
    paymentAt: { type: Date, default: null },
    notes: { type: String, default: null, trim: true, maxlength: 500 },
  },
  { timestamps: true }
);

ridePassengerSchema.index({ rideId: 1, phone: 1 });
ridePassengerSchema.index({ driverId: 1, createdAt: -1 });

export const RidePassenger = mongoose.model('RidePassenger', ridePassengerSchema);
