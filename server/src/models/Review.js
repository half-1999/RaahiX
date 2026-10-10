import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema(
  {
    vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', default: null },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true, trim: true, maxlength: 500 },
  },
  { timestamps: true }
);

reviewSchema.index({ vehicleId: 1, createdAt: -1 });
reviewSchema.index({ vehicleId: 1, userId: 1 }, { unique: true });

export const Review = mongoose.model('Review', reviewSchema);
