import mongoose from 'mongoose';

const schema = new mongoose.Schema({ name: { type: String, required: true, trim: true }, mobile: { type: String, required: true, trim: true }, email: { type: String, trim: true, lowercase: true }, subject: { type: String, required: true, trim: true }, service: { type: mongoose.Schema.Types.ObjectId, ref: 'Service' }, message: { type: String, required: true, maxlength: 2000 }, preferredContactMethod: { type: String, enum: ['phone', 'email', 'whatsapp'], default: 'phone' }, consent: { type: Boolean, required: true }, status: { type: String, enum: ['new', 'contacted', 'resolved', 'closed'], default: 'new', index: true }, source: { type: String, default: 'website' }, assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' } }, { timestamps: true });
schema.index({ status: 1, createdAt: -1 });
export const ContactEnquiry = mongoose.model('ContactEnquiry', schema);
