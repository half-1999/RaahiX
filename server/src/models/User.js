import mongoose from 'mongoose';
import { ROLES, USER_STATUS } from '../constants/enums.js';

const GENDERS = ['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT'];

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    username: { type: String, required: true, unique: true, lowercase: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, required: true, unique: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: Object.values(ROLES), default: ROLES.CUSTOMER },
    status: { type: String, enum: Object.values(USER_STATUS), default: USER_STATUS.ACTIVE },
    emailVerified: { type: Boolean, default: false },
    phoneVerified: { type: Boolean, default: false },
    payoutUpi: { type: String, default: '', trim: true },
    age: { type: Number, min: 1, max: 120, default: null },
    gender: { type: String, enum: GENDERS },
    city: { type: String, default: '', trim: true },
    state: { type: String, default: '', trim: true },
    address: { type: String, default: '', trim: true },
    bio: { type: String, default: '', trim: true, maxlength: 300 },
    dateOfBirth: { type: Date, default: null },
    refreshTokenHash: { type: String, select: false, default: null },
  },
  { timestamps: true }
);

userSchema.index({ role: 1, status: 1 });

userSchema.methods.toSafeObject = function toSafeObject() {
  return {
    id: this._id.toString(),
    name: this.name,
    username: this.username,
    email: this.email,
    phone: this.phone,
    role: this.role,
    status: this.status,
    emailVerified: this.emailVerified,
    phoneVerified: this.phoneVerified,
    payoutUpi: this.payoutUpi || '',
    age: this.age ?? null,
    gender: this.gender || null,
    city: this.city || '',
    state: this.state || '',
    address: this.address || '',
    bio: this.bio || '',
    dateOfBirth: this.dateOfBirth ? this.dateOfBirth.toISOString().slice(0, 10) : null,
  };
};

export const User = mongoose.model('User', userSchema);
export { GENDERS };
