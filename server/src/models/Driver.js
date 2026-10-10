import mongoose from 'mongoose';
import { DRIVER_STATUS, DRIVER_VERIFICATION } from '../constants/enums.js';

const driverSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    licenseNumber: { type: String, required: true, unique: true, trim: true },
    verificationStatus: {
      type: String,
      enum: Object.values(DRIVER_VERIFICATION),
      default: DRIVER_VERIFICATION.PENDING,
    },
    status: { type: String, enum: Object.values(DRIVER_STATUS), default: DRIVER_STATUS.ACTIVE },
    upiId: { type: String, default: '', trim: true },
    qrCode: { type: String, default: '' },
    paymentInstructions: { type: String, default: '', trim: true },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    totalTrips: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

driverSchema.index({ status: 1, verificationStatus: 1 });

export const Driver = mongoose.model('Driver', driverSchema);
