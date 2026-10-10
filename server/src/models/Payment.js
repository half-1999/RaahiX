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
    gatewayPaymentId: { type: String, default: undefined },
    gatewaySignature: { type: String, default: undefined },
    status: { type: String, enum: Object.values(PAYMENT_STATUS), default: PAYMENT_STATUS.CREATED },
    paidAt: { type: Date, default: undefined },
    refundAmount: { type: Number, default: undefined },
    refundedAt: { type: Date, default: undefined },
    rawResponse: { type: mongoose.Schema.Types.Mixed, default: undefined },
  },
  { timestamps: true }
);

paymentSchema.index({ bookingId: 1 });
paymentSchema.index({ gatewayOrderId: 1 }, { unique: true });
// Sparse unique: only index documents that have a real gatewayPaymentId string.
paymentSchema.index(
  { gatewayPaymentId: 1 },
  { unique: true, sparse: true, partialFilterExpression: { gatewayPaymentId: { $type: 'string' } } }
);

export const Payment = mongoose.model('Payment', paymentSchema);
