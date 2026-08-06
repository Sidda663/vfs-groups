import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  eventType: { type: String, enum: ['page_view', 'cta_click', 'application_started', 'application_submitted', 'enquiry_submitted', 'tracking_verified'], required: true, index: true },
  path: { type: String, required: true, trim: true, maxlength: 300, index: true },
  sessionId: { type: String, trim: true, maxlength: 80 },
  referrerHost: { type: String, trim: true, maxlength: 150 },
  metadata: { type: Map, of: String, default: {} },
}, { timestamps: true });
schema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 180 });
export const AnalyticsEvent = mongoose.model('AnalyticsEvent', schema);
