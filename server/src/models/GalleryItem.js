import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  caption: { type: String, trim: true, default: '' },
  altText: { type: String, required: true, trim: true },
  category: { type: String, trim: true, default: 'Company' },
  media: {
    provider: String, publicId: String, version: Number, resourceType: String, deliveryType: String,
    format: String, bytes: Number, width: Number, height: Number, url: String,
  },
  status: { type: String, enum: ['draft', 'published', 'archived'], default: 'draft', index: true },
  sortOrder: { type: Number, default: 0 },
  capturedAt: Date,
  consentConfirmed: { type: Boolean, default: false },
  websiteVisible: { type: Boolean, default: false, index: true },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });
schema.index({ status: 1, sortOrder: 1, createdAt: -1 });
export const GalleryItem = mongoose.model('GalleryItem', schema);
