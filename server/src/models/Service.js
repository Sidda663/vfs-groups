import mongoose from 'mongoose';

const faqSchema = new mongoose.Schema({ question: { type: String, required: true }, answer: { type: String, required: true } }, { _id: false });
const schema = new mongoose.Schema({
  name: { type: String, required: true, trim: true }, slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
  category: { type: String, required: true, index: true }, shortDescription: { type: String, required: true }, overview: { type: String, required: true },
  features: [String], suitableFor: [String], useCases: [String], eligibility: [String], documents: [String], process: [String], considerations: [String], faqs: [faqSchema], relatedSlugs: [String],
  status: { type: String, enum: ['draft', 'published', 'archived'], default: 'draft', index: true }, sortOrder: { type: Number, default: 0 }, seo: { title: String, description: String },
}, { timestamps: true });
schema.index({ status: 1, category: 1, sortOrder: 1 });
export const Service = mongoose.model('Service', schema);
