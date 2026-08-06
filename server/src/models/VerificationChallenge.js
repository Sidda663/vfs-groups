import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  purpose: { type: String, enum: ['application_tracking'], required: true },
  application: { type: mongoose.Schema.Types.ObjectId, ref: 'Application', index: true },
  codeHash: { type: String, required: true, select: false },
  attempts: { type: Number, default: 0 },
  expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
  verifiedAt: Date,
}, { timestamps: true });
export const VerificationChallenge = mongoose.model('VerificationChallenge', schema);
