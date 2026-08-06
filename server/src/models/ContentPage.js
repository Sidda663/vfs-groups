import mongoose from 'mongoose';

const sectionSchema = new mongoose.Schema({ heading: String, body: String, bullets: [String] }, { _id: false });
const schema = new mongoose.Schema({
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
  eyebrow: { type: String, required: true, trim: true },
  title: { type: String, required: true, trim: true },
  summary: { type: String, required: true, trim: true },
  sections: { type: [sectionSchema], default: [] },
  status: { type: String, enum: ['draft', 'published', 'archived'], default: 'draft', index: true },
  seo: { title: String, description: String },
  reviewedAt: Date,
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });
export const ContentPage = mongoose.model('ContentPage', schema);
