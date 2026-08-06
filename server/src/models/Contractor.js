import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  contractorId: { type: String, required: true, unique: true, index: true },
  referralCode: { type: String, unique: true, sparse: true, uppercase: true, trim: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  businessName: { type: String, trim: true }, country: { type: String, trim: true, default: 'India' }, city: { type: String, trim: true }, state: { type: String, trim: true },
  onboardingStatus: { type: String, enum: ['registered', 'mobile_verified', 'email_verified', 'documents_submitted', 'under_admin_review', 'approved', 'rejected', 'suspended'], default: 'registered', index: true },
  referredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Contractor' },
}, { timestamps: true });
export const Contractor = mongoose.model('Contractor', schema);
