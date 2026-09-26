import mongoose from 'mongoose';
import { PAYMENT_STATUS } from '../constants/enums.js';

const paymentSchema = new mongoose.Schema(
  {
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'INR' },
    gateway: { type: String, required: true },
    gatewayOrderId: { type: String, required: true },
    gatewayPaymentId: { type: String, default: null },
    gatewaySignature: { type: String, default: null },
    status: { type: String, enum: Object.values(PAYMENT_STATUS), default: PAYMENT_STATUS.CREATED },
    paidAt: { type: Date, default: null },
    refundAmount: { type: Number, default: null },
    refundedAt: { type: Date, default: null },
    rawResponse: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
);

paymentSchema.index({ bookingId: 1 });
paymentSchema.index({ gatewayOrderId: 1 }, { unique: true });
paymentSchema.index({ gatewayPaymentId: 1 }, { unique: true, sparse: true });
paymentSchema.index({ status: 1, createdAt: -1 });

export const Payment = mongoose.model('Payment', paymentSchema);
