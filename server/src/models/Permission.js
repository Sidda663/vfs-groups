import mongoose from 'mongoose';

const schema = new mongoose.Schema({ key: { type: String, required: true, unique: true, lowercase: true, trim: true }, description: { type: String, required: true, trim: true } }, { timestamps: true });
export const Permission = mongoose.model('Permission', schema);
