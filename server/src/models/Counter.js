import mongoose from 'mongoose';

const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});

export const Counter = mongoose.model('Counter', counterSchema);

/**
 * Atomically allocate the next public payment reference: RAAHIX000001 …
 */
export async function nextPaymentReference() {
  const doc = await Counter.findByIdAndUpdate(
    'paymentReference',
    { $inc: { seq: 1 } },
    { upsert: true, new: true }
  );
  return `RAAHIX${String(doc.seq).padStart(6, '0')}`;
}
