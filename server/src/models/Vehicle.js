import mongoose from 'mongoose';
import { VEHICLE_STATUS } from '../constants/enums.js';

const seatConfigSchema = new mongoose.Schema(
  {
    seatNumber: { type: String, required: true },
    row: { type: Number, required: true },
    position: { type: String, required: true },
  },
  { _id: false }
);

const vehicleSchema = new mongoose.Schema(
  {
    driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver', required: true },
    registrationNumber: { type: String, required: true, unique: true, trim: true, uppercase: true },
    make: { type: String, required: true, trim: true },
    model: { type: String, required: true, trim: true },
    vehicleType: { type: String, required: true, trim: true },
    capacity: { type: Number, required: true, min: 1 },
    seatConfiguration: { type: [seatConfigSchema], required: true },
    features: [{ type: String }],
    color: { type: String, default: '', trim: true },
    images: {
      type: [
        {
          file: { type: String, required: true },
          mime: { type: String, required: true },
          primary: { type: Boolean, default: false },
        },
      ],
      default: [],
    },
    status: { type: String, enum: Object.values(VEHICLE_STATUS), default: VEHICLE_STATUS.ACTIVE },
  },
  { timestamps: true }
);

vehicleSchema.index({ driverId: 1 });
vehicleSchema.index({ status: 1 });

vehicleSchema.pre('validate', function validateCapacity(next) {
  if (this.seatConfiguration?.length && this.capacity !== this.seatConfiguration.length) {
    this.invalidate('capacity', 'Vehicle capacity must match seatConfiguration length');
  }
  next();
});

export const Vehicle = mongoose.model('Vehicle', vehicleSchema);
