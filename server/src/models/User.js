import mongoose from 'mongoose';
import { ROLES, USER_STATUS } from '../constants/enums.js';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, required: true, unique: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: Object.values(ROLES), default: ROLES.CUSTOMER },
    status: { type: String, enum: Object.values(USER_STATUS), default: USER_STATUS.ACTIVE },
    emailVerified: { type: Boolean, default: false },
    phoneVerified: { type: Boolean, default: false },
    payoutUpi: { type: String, default: '', trim: true },
    age: { type: Number, min: 1, max: 120, default: null },
    refreshTokenHash: { type: String, select: false, default: null },
  },
  { timestamps: true }
);

userSchema.index({ role: 1, status: 1 });

userSchema.methods.toSafeObject = function toSafeObject() {
  return {
    id: this._id.toString(),
    name: this.name,
    email: this.email,
    phone: this.phone,
    role: this.role,
    status: this.status,
    emailVerified: this.emailVerified,
    phoneVerified: this.phoneVerified,
    payoutUpi: this.payoutUpi || '',
    age: this.age ?? null,
  };
};

export const User = mongoose.model('User', userSchema);
