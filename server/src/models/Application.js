import mongoose from 'mongoose';

export const APPLICATION_STATUSES = ['draft', 'submitted', 'new', 'contacted', 'documents_pending', 'documents_received', 'under_internal_review', 'additional_information_required', 'submitted_to_provider', 'under_provider_review', 'approved', 'rejected', 'disbursed_or_policy_issued', 'closed', 'cancelled'];
const schema = new mongoose.Schema({
  applicationId: { type: String, unique: true, sparse: true, index: true }, leadId: { type: String, unique: true, sparse: true, index: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', index: true }, contractor: { type: mongoose.Schema.Types.ObjectId, ref: 'Contractor', index: true },
  service: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: true, index: true }, status: { type: String, enum: APPLICATION_STATUSES, default: 'draft', index: true },
  personal: { fullName: String, mobile: String, email: String, dateOfBirth: Date, country: { type: String, default: 'India' }, city: String, state: String, pinCode: String },
  financial: { employmentType: String, employerOrBusinessName: String, monthlyIncome: Number, annualTurnover: Number, existingEmi: Number, requestedAmount: Number, itrStatus: String, creditProfile: String },
  serviceSpecific: mongoose.Schema.Types.Mixed,
  resumeTokenHash: { type: String, select: false }, draftExpiresAt: Date,
  referralCode: { type: String, uppercase: true, trim: true }, referralLockedAt: Date,
  consents: { privacy: Boolean, communication: Boolean, accuracy: Boolean, terms: Boolean, capturedAt: Date, ip: String, userAgent: String },
  submittedAt: Date, createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });
schema.index({ customer: 1, createdAt: -1 });
schema.index({ contractor: 1, status: 1, createdAt: -1 });
schema.index({ service: 1, status: 1, createdAt: -1 });
export const Application = mongoose.model('Application', schema);
