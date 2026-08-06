import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  category: { type: String, required: true, trim: true, index: true },
  question: { type: String, required: true, trim: true },
  answer: { type: String, required: true, trim: true },
  status: { type: String, enum: ['draft', 'published', 'archived'], default: 'draft', index: true },
  sortOrder: { type: Number, default: 0 },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });
schema.index({ status: 1, category: 1, sortOrder: 1 });
export const Faq = mongoose.model('Faq', schema);
