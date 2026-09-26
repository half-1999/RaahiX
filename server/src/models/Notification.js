import mongoose from 'mongoose';
import { NOTIFICATION_CHANNEL, NOTIFICATION_STATUS } from '../constants/enums.js';

const notificationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', default: null },
    channel: { type: String, enum: Object.values(NOTIFICATION_CHANNEL), required: true },
    type: { type: String, required: true },
    status: {
      type: String,
      enum: Object.values(NOTIFICATION_STATUS),
      default: NOTIFICATION_STATUS.PENDING,
    },
    recipient: { type: String, required: true },
    message: { type: String, required: true },
    sentAt: { type: Date, default: null },
    error: { type: String, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ bookingId: 1 });
notificationSchema.index({ status: 1 });

export const Notification = mongoose.model('Notification', notificationSchema);
