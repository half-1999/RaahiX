import mongoose from 'mongoose';

const locationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    normalizedName: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    normalizedCity: { type: String, required: true, trim: true },
    normalizedState: { type: String, required: true, trim: true },
    aliases: { type: [String], default: [] },
  },
  { timestamps: true }
);

locationSchema.index({ normalizedName: 1, normalizedCity: 1, normalizedState: 1 }, { unique: true });
locationSchema.index({ aliases: 1, normalizedCity: 1, normalizedState: 1 });

export const Location = mongoose.model('Location', locationSchema);
