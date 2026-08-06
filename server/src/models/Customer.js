import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  customerId: { type: String, required: true, unique: true, index: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  country: { type: String, trim: true, default: 'India' }, city: { type: String, trim: true }, state: { type: String, trim: true },
  customerType: { type: String, enum: ['indian', 'nri'], default: 'indian', index: true },
  connector: { type: mongoose.Schema.Types.ObjectId, ref: 'Contractor', default: null, index: true },
  referralCodeSubmitted: { type: String, trim: true, uppercase: true },
  referralApprovalStatus: { type: String, enum: ['none', 'pending', 'approved', 'rejected'], default: 'none', index: true },
  referralAttribution: { type: mongoose.Schema.Types.ObjectId, ref: 'ReferralAttribution' },
  communicationPreferences: { email: { type: Boolean, default: true }, whatsapp: { type: Boolean, default: false } },
}, { timestamps: true });
export const Customer = mongoose.model('Customer', schema);
