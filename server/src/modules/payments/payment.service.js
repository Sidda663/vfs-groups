import { createHash, createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import bcrypt from 'bcrypt';
import { env } from '../../config/env.js';
import { ConnectorRegistrationPayment } from '../../models/ConnectorRegistrationPayment.js';
import { Contractor } from '../../models/Contractor.js';
import { PaymentWebhookEvent } from '../../models/PaymentWebhookEvent.js';
import { User } from '../../models/User.js';
import { createConnectorRegistrationQr, isMockPaymentProvider } from '../../providers/razorpay.js';
import { ApiError } from '../../utils/apiError.js';
import { registerPaidContractor } from '../auth/auth.service.js';

const publicPayment = (payment) => ({
  registrationId: payment.registrationId,
  fullName: payment.fullName,
  amountPaise: payment.amountPaise,
  currency: payment.currency,
  qrImageUrl: payment.qrImageUrl,
  status: payment.status,
  expiresAt: payment.expiresAt,
  paidAt: payment.paidAt,
  accountCreatedAt: payment.accountCreatedAt,
  mock: payment.provider === 'mock',
});

export async function startConnectorRegistration(input) {
  const duplicate = await User.exists({ $or: [{ mobile: input.mobile }, ...(input.email ? [{ email: input.email.toLowerCase() }] : [])], status: { $ne: 'deleted' } });
  if (duplicate) throw new ApiError(409, 'ACCOUNT_EXISTS', 'An account already exists for this mobile number or email.');
  await ConnectorRegistrationPayment.updateMany(
    { mobile: input.mobile, status: 'payment_pending' },
    { $set: { status: 'expired', failureReason: 'A newer registration payment was started.' }, $unset: { passwordHash: '' } },
  );
  const registrationId = randomUUID();
  const amountPaise = Math.round(env.CONNECTOR_REGISTRATION_FEE_INR * 100);
  const expiresAt = new Date(Date.now() + env.CONNECTOR_PAYMENT_EXPIRY_MINUTES * 60_000);
  const payment = await ConnectorRegistrationPayment.create({
    registrationId, fullName: input.fullName, mobile: input.mobile, email: input.email || undefined,
    businessName: input.businessName || undefined, country: input.country, city: input.city, state: input.state,
    consent: input.consent, passwordHash: await bcrypt.hash(input.password, 12), amountPaise, expiresAt,
    provider: isMockPaymentProvider() ? 'mock' : 'razorpay',
  });
  try {
    const qr = await createConnectorRegistrationQr({ registrationId, fullName: input.fullName, amountPaise, expiresAt });
    payment.provider = qr.provider; payment.providerQrId = qr.qrId; payment.qrImageUrl = qr.imageUrl;
    await payment.save();
  } catch (error) {
    await ConnectorRegistrationPayment.updateOne({ _id: payment._id }, { $set: { status: 'failed', failureReason: error.message }, $unset: { passwordHash: '' } });
    throw error;
  }
  return publicPayment(payment);
}

export async function getRegistrationStatus(registrationId) {
  const payment = await ConnectorRegistrationPayment.findOne({ registrationId });
  if (!payment) throw new ApiError(404, 'PAYMENT_REGISTRATION_NOT_FOUND', 'This payment registration was not found.');
  if (payment.status === 'payment_pending' && payment.expiresAt <= new Date()) {
    payment.status = 'expired'; payment.failureReason = 'The payment QR expired.';
    await ConnectorRegistrationPayment.updateOne({ _id: payment._id }, { $set: { status: payment.status, failureReason: payment.failureReason }, $unset: { passwordHash: '' } });
  }
  return publicPayment(payment);
}

async function createAccountForPaidPayment(paymentId, request) {
  let payment = await ConnectorRegistrationPayment.findById(paymentId).select('+passwordHash');
  if (!payment) throw new ApiError(404, 'PAYMENT_REGISTRATION_NOT_FOUND', 'This payment registration was not found.');
  if (payment.status === 'account_created') return payment;
  if (payment.status !== 'paid') throw new ApiError(409, 'PAYMENT_NOT_COMPLETED', 'The connector registration payment has not been completed.');
  try {
    const user = await registerPaidContractor({
      fullName: payment.fullName, mobile: payment.mobile, email: payment.email || '', businessName: payment.businessName || '',
      country: payment.country, city: payment.city, state: payment.state, consent: payment.consent,
    }, payment.passwordHash, request);
    payment = await ConnectorRegistrationPayment.findOneAndUpdate(
      { _id: payment._id, status: 'paid' },
      { $set: { status: 'account_created', connectorUser: user._id, accountCreatedAt: new Date() }, $unset: { passwordHash: '', failureReason: '' } },
      { new: true },
    );
    return payment;
  } catch (error) {
    const existingUser = await User.findOne({ mobile: payment.mobile });
    const existingConnector = existingUser && await Contractor.exists({ user: existingUser._id });
    if (existingUser && existingConnector) {
      return ConnectorRegistrationPayment.findByIdAndUpdate(payment._id, { $set: { status: 'account_created', connectorUser: existingUser._id, accountCreatedAt: new Date() }, $unset: { passwordHash: '', failureReason: '' } }, { new: true });
    }
    await ConnectorRegistrationPayment.updateOne({ _id: payment._id }, { $set: { failureReason: `Payment received, but account creation needs attention: ${error.message}` } });
    throw error;
  }
}

export async function completeMockPayment(registrationId, request) {
  if (env.NODE_ENV === 'production' || !isMockPaymentProvider()) throw new ApiError(404, 'NOT_FOUND', 'Route not found.');
  const payment = await ConnectorRegistrationPayment.findOne({ registrationId });
  if (!payment) throw new ApiError(404, 'PAYMENT_REGISTRATION_NOT_FOUND', 'This payment registration was not found.');
  if (payment.status === 'payment_pending' && payment.expiresAt <= new Date()) throw new ApiError(410, 'PAYMENT_EXPIRED', 'This payment QR has expired. Start again.');
  if (payment.status === 'payment_pending') {
    payment.status = 'paid'; payment.paidAt = new Date(); payment.providerPaymentId = `pay_mock_${randomUUID()}`;
    await payment.save();
  }
  return publicPayment(await createAccountForPaidPayment(payment._id, request));
}

export function verifyWebhookSignature(rawBody, signature) {
  if (!env.RAZORPAY_WEBHOOK_SECRET) throw new ApiError(503, 'WEBHOOK_NOT_CONFIGURED', 'The Razorpay webhook secret is not configured.');
  if (!rawBody || !signature) return false;
  const expected = createHmac('sha256', env.RAZORPAY_WEBHOOK_SECRET).update(rawBody).digest('hex');
  const supplied = Buffer.from(signature); const calculated = Buffer.from(expected);
  return supplied.length === calculated.length && timingSafeEqual(supplied, calculated);
}

export async function processRazorpayWebhook(request) {
  const signature = request.get('x-razorpay-signature');
  if (!verifyWebhookSignature(request.rawBody, signature)) throw new ApiError(400, 'WEBHOOK_SIGNATURE_INVALID', 'The Razorpay webhook signature is invalid.');
  const eventType = request.body?.event || 'unknown';
  const eventId = request.get('x-razorpay-event-id') || createHash('sha256').update(request.rawBody).digest('hex');
  let event;
  try { event = await PaymentWebhookEvent.create({ eventId, eventType }); }
  catch (error) { if (error?.code === 11000) return { duplicate: true }; throw error; }

  const paymentEntity = request.body?.payload?.payment?.entity;
  const qrEntity = request.body?.payload?.qr_code?.entity;
  if (!['qr_code.credited', 'payment.captured'].includes(eventType) || !paymentEntity) {
    event.status = 'ignored'; await event.save(); return { ignored: true };
  }
  const registrationId = qrEntity?.notes?.registration_id || paymentEntity?.notes?.registration_id;
  const query = qrEntity?.id ? { providerQrId: qrEntity.id } : registrationId ? { registrationId } : null;
  const registration = query && await ConnectorRegistrationPayment.findOne(query);
  if (!registration) { event.status = 'ignored'; await event.save(); return { ignored: true }; }
  event.payment = registration._id;
  if (paymentEntity.status !== 'captured' || Number(paymentEntity.amount) !== registration.amountPaise || registration.provider !== 'razorpay') {
    event.status = 'failed'; event.error = 'Payment status, amount, or provider did not match the registration.'; await event.save();
    throw new ApiError(409, 'PAYMENT_VERIFICATION_FAILED', 'The payment did not match this connector registration.');
  }
  if (registration.status === 'payment_pending' || registration.status === 'paid') {
    registration.status = 'paid'; registration.paidAt ||= new Date((paymentEntity.created_at || Math.floor(Date.now() / 1000)) * 1000); registration.providerPaymentId = paymentEntity.id;
    await registration.save();
    await createAccountForPaidPayment(registration._id, request);
  }
  event.status = 'processed'; await event.save();
  return { processed: true };
}

export async function listAdminPayments(query) {
  const page = Math.max(1, Number(query.page) || 1); const limit = Math.min(100, Math.max(1, Number(query.limit) || 25));
  const filter = {}; if (query.status) filter.status = query.status;
  const [items, total] = await Promise.all([
    ConnectorRegistrationPayment.find(filter).select('-passwordHash').populate('connectorUser', 'fullName email mobile').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    ConnectorRegistrationPayment.countDocuments(filter),
  ]);
  return { items, meta: { page, limit, total, pages: Math.ceil(total / limit) } };
}
