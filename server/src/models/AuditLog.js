import mongoose from 'mongoose';

const schema = new mongoose.Schema({ actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true }, actorRoles: [String], action: { type: String, required: true, index: true }, resourceType: { type: String, required: true }, resourceId: { type: mongoose.Schema.Types.ObjectId }, oldValues: mongoose.Schema.Types.Mixed, newValues: mongoose.Schema.Types.Mixed, reason: String, ip: String, userAgent: String, requestId: String }, { timestamps: { createdAt: true, updatedAt: false } });
schema.index({ resourceType: 1, resourceId: 1, createdAt: -1 });
schema.pre(['updateOne', 'updateMany', 'findOneAndUpdate', 'deleteOne', 'deleteMany'], function preventMutation() { throw new Error('Audit logs are immutable'); });
export const AuditLog = mongoose.model('AuditLog', schema);
