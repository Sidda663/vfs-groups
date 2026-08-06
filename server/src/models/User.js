import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  fullName: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
  email: { type: String, trim: true, lowercase: true },
  mobile: { type: String, required: true, trim: true },
  passwordHash: { type: String, required: true, select: false },
  roles: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Role' }],
  referralCode: { type: String, trim: true, uppercase: true },
  referredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  referredByCode: { type: String, trim: true, uppercase: true, index: true },
  status: { type: String, enum: ['pending_verification', 'active', 'suspended', 'locked', 'deleted'], default: 'pending_verification', index: true },
  emailVerifiedAt: Date,
  mobileVerifiedAt: Date,
  failedLoginAttempts: { type: Number, default: 0, select: false },
  lockedUntil: { type: Date, select: false },
  lastLoginAt: Date,
  firstLoginAt: Date,
  successfulLoginCount: { type: Number, default: 0, min: 0 },
  tokenVersion: { type: Number, default: 0, select: false },
  deletedAt: Date,
}, { timestamps: true, toJSON: { transform: (_document, value) => { delete value.passwordHash; delete value.__v; return value; } } });

schema.index({ email: 1 }, { unique: true, sparse: true });
schema.index({ mobile: 1 }, { unique: true });
schema.index({ referralCode: 1 }, { unique: true, sparse: true });
schema.index({ createdAt: -1 });
export const User = mongoose.model('User', schema);
