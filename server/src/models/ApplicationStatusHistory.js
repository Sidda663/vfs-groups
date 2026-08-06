import mongoose from 'mongoose';
import { APPLICATION_STATUSES } from './Application.js';

const schema = new mongoose.Schema({ application: { type: mongoose.Schema.Types.ObjectId, ref: 'Application', required: true, index: true }, oldStatus: { type: String, enum: APPLICATION_STATUSES }, newStatus: { type: String, enum: APPLICATION_STATUSES, required: true }, changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, changedByRole: String, publicNote: String, internalNote: { type: String, select: false }, reason: String }, { timestamps: { createdAt: true, updatedAt: false } });
schema.index({ application: 1, createdAt: 1 });
export const ApplicationStatusHistory = mongoose.model('ApplicationStatusHistory', schema);
