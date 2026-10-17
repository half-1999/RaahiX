import mongoose from 'mongoose';

const locationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    normalizedName: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    country: { type: String, default: 'India', trim: true },
    normalizedCity: { type: String, required: true, trim: true },
    normalizedState: { type: String, required: true, trim: true },
    aliases: { type: [String], default: [] },
    latitude: { type: Number, default: null },
    longitude: { type: Number, default: null },
    createdByUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

locationSchema.index({ normalizedName: 1, normalizedCity: 1, normalizedState: 1 }, { unique: true });
locationSchema.index({ aliases: 1, normalizedCity: 1, normalizedState: 1 });
locationSchema.index({ isActive: 1, normalizedCity: 1, name: 1 });
locationSchema.index({ name: 'text', city: 'text', state: 'text', aliases: 'text' });

export const Location = mongoose.model('Location', locationSchema);
