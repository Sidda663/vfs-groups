import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  customerName: { type: String, required: true, trim: true },
  customerLabel: { type: String, trim: true, default: '' },
  serviceName: { type: String, trim: true, default: '' },
  quote: { type: String, required: true, trim: true },
  status: { type: String, enum: ['draft', 'published', 'archived'], default: 'draft', index: true },
  consentConfirmed: { type: Boolean, required: true, default: false },
  verifiedAt: Date,
  sortOrder: { type: Number, default: 0 },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });
schema.index({ status: 1, sortOrder: 1 });
export const Testimonial = mongoose.model('Testimonial', schema);
