import mongoose from 'mongoose';

const schema = new mongoose.Schema({ name: { type: String, required: true, trim: true }, mobile: { type: String, required: true, trim: true }, service: { type: mongoose.Schema.Types.ObjectId, ref: 'Service' }, preferredTime: String, consent: { type: Boolean, required: true }, status: { type: String, enum: ['new', 'scheduled', 'completed', 'cancelled'], default: 'new', index: true }, source: { type: String, default: 'website' } }, { timestamps: true });
schema.index({ status: 1, createdAt: -1 });
export const CallbackRequest = mongoose.model('CallbackRequest', schema);
