import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  registrationId: { type: String, required: true, unique: true, index: true },
  fullName: { type: String, required: true, trim: true },
  mobile: { type: String, required: true, trim: true, index: true },
  email: { type: String, trim: true, lowercase: true },
  businessName: { type: String, trim: true },
  country: { type: String, required: true, trim: true },
  city: { type: String, required: true, trim: true },
  state: { type: String, required: true, trim: true },
  consent: { type: Boolean, required: true },
  passwordHash: { type: String, required: true, select: false },
  amountPaise: { type: Number, required: true, min: 100 },
  currency: { type: String, default: 'INR', enum: ['INR'] },
  provider: { type: String, required: true, enum: ['mock', 'razorpay'] },
  providerQrId: { type: String, index: true, sparse: true },
  providerPaymentId: { type: String, index: true, sparse: true },
  qrImageUrl: String,
  status: { type: String, enum: ['payment_pending', 'paid', 'account_created', 'failed', 'expired'], default: 'payment_pending', index: true },
  expiresAt: { type: Date, required: true, index: true },
  paidAt: Date,
  accountCreatedAt: Date,
  connectorUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  failureReason: String,
}, { timestamps: true, toJSON: { transform: (_document, value) => { delete value.passwordHash; delete value.__v; return value; } } });

schema.index({ createdAt: -1 });
export const ConnectorRegistrationPayment = mongoose.model('ConnectorRegistrationPayment', schema);
