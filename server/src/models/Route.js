import mongoose from 'mongoose';
import { ROUTE_STATUS } from '../constants/enums.js';

const placeSchema = new mongoose.Schema(
  {
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const stopSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    sequence: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const routeSchema = new mongoose.Schema(
  {
    origin: { type: placeSchema, required: true },
    destination: { type: placeSchema, required: true },
    stops: { type: [stopSchema], default: [] },
    estimatedDuration: { type: Number, required: true, min: 1 },
    status: { type: String, enum: Object.values(ROUTE_STATUS), default: ROUTE_STATUS.ACTIVE },
  },
  { timestamps: true }
);

routeSchema.index({ 'origin.city': 1, 'destination.city': 1, status: 1 });
routeSchema.index({ status: 1 });

export const Route = mongoose.model('Route', routeSchema);
