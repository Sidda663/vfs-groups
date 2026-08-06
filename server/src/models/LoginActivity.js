import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  role: { type: String, required: true, index: true },
  loginAt: { type: Date, required: true, default: Date.now, index: true },
  sessionFamily: { type: String, required: true, index: true },
  ip: String,
  userAgent: String,
}, { timestamps: false });

schema.index({ user: 1, loginAt: -1 });
schema.index({ role: 1, loginAt: -1 });
export const LoginActivity = mongoose.model('LoginActivity', schema);
