import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  eventId: { type: String, required: true, unique: true },
  eventType: { type: String, required: true },
  status: { type: String, enum: ['processing', 'processed', 'ignored', 'failed'], default: 'processing' },
  payment: { type: mongoose.Schema.Types.ObjectId, ref: 'ConnectorRegistrationPayment' },
  error: String,
}, { timestamps: true });

export const PaymentWebhookEvent = mongoose.model('PaymentWebhookEvent', schema);
