import { randomUUID } from 'node:crypto';
import { env } from '../config/env.js';
import { ApiError } from '../utils/apiError.js';

const endpoint = 'https://api.razorpay.com/v1';
const useMock = () => env.NODE_ENV === 'test' || env.PAYMENT_PROVIDER === 'mock';

async function razorpayRequest(path, options = {}) {
  if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) throw new ApiError(503, 'PAYMENT_NOT_CONFIGURED', 'Razorpay credentials have not been configured.');
  let response;
  try {
    response = await fetch(`${endpoint}${path}`, {
      ...options,
      headers: { Authorization: `Basic ${Buffer.from(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`).toString('base64')}`, 'Content-Type': 'application/json', ...options.headers },
    });
  } catch {
    throw new ApiError(502, 'PAYMENT_PROVIDER_UNAVAILABLE', 'The payment service is temporarily unavailable. Please try again.');
  }
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(502, 'PAYMENT_PROVIDER_ERROR', body?.error?.description || 'Razorpay could not create the payment QR.');
  return body;
}

export async function createConnectorRegistrationQr({ registrationId, fullName, amountPaise, expiresAt }) {
  if (useMock()) {
    const label = encodeURIComponent('TEST QR - use the test payment button');
    return { provider: 'mock', qrId: `qr_mock_${randomUUID()}`, imageUrl: `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='320' height='320'%3E%3Crect width='100%25' height='100%25' fill='white'/%3E%3Crect x='18' y='18' width='284' height='284' fill='none' stroke='%23004658' stroke-width='12'/%3E%3Ctext x='160' y='145' text-anchor='middle' font-size='25' font-family='sans-serif' font-weight='700'%3ETEST QR%3C/text%3E%3Ctext x='160' y='185' text-anchor='middle' font-size='14' font-family='sans-serif'%3E${label}%3C/text%3E%3C/svg%3E`, mock: true };
  }
  const qr = await razorpayRequest('/payments/qr_codes', { method: 'POST', body: JSON.stringify({
    type: 'upi_qr', usage: 'single_use', fixed_amount: true, payment_amount: amountPaise,
    description: `VFS connector registration - ${fullName}`, close_by: Math.floor(expiresAt.getTime() / 1000),
    notes: { registration_id: registrationId, purpose: 'connector_registration' },
  }) });
  return { provider: 'razorpay', qrId: qr.id, imageUrl: qr.image_url, mock: false };
}

export const isMockPaymentProvider = useMock;
