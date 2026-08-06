import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  phone: { type: String, required: true, trim: true },
  email: { type: String, trim: true, lowercase: true },
  service: { type: mongoose.Schema.Types.ObjectId, ref: 'LegalService', required: true, index: true },
  serviceName: { type: String, required: true, trim: true },
  status: { type: String, enum: ['new', 'contacted', 'completed', 'cancelled'], default: 'new', index: true },
}, { timestamps: true });

export const LegalServiceRequest = mongoose.model('LegalServiceRequest', schema);
