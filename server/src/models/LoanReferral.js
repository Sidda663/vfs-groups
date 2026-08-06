import mongoose from 'mongoose';

export const LOAN_REFERRAL_STATUSES = ['new', 'contacted', 'documents_pending', 'under_review', 'submitted_to_provider', 'approved', 'rejected', 'closed'];

const schema = new mongoose.Schema({
  referralId: { type: String, required: true, unique: true, index: true },
  submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  submitterRole: { type: String, enum: ['customer', 'contractor'], required: true, index: true },
  submitterReferralCode: { type: String, uppercase: true, trim: true, index: true },
  applicant: {
    fullName: { type: String, required: true, trim: true, maxlength: 100 },
    mobile: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    country: { type: String, trim: true, default: 'India' },
    state: { type: String, required: true, trim: true, maxlength: 80 },
    city: { type: String, required: true, trim: true, maxlength: 80 },
    requestedAmount: { type: Number, min: 0 },
    notes: { type: String, trim: true, maxlength: 1500 },
  },
  service: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: true, index: true },
  status: { type: String, enum: LOAN_REFERRAL_STATUSES, default: 'new', index: true },
  statusUpdatedAt: { type: Date, default: Date.now },
}, { timestamps: true });

schema.index({ submittedBy: 1, createdAt: -1 });
schema.index({ submitterRole: 1, status: 1, createdAt: -1 });
schema.index({ status: 1, createdAt: -1 });
schema.index({ 'applicant.fullName': 1 });
export const LoanReferral = mongoose.model('LoanReferral', schema);
