import mongoose from 'mongoose';

const schema = new mongoose.Schema({ name: { type: String, required: true, unique: true, trim: true }, slug: { type: String, required: true, unique: true, lowercase: true, trim: true }, permissions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Permission' }], isSystem: { type: Boolean, default: false } }, { timestamps: true });
export const Role = mongoose.model('Role', schema);
