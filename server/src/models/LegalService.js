import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, unique: true, maxlength: 120 },
  active: { type: Boolean, default: true, index: true },
}, { timestamps: true });

export const LegalService = mongoose.model('LegalService', schema);
