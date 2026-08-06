import { env } from '../config/env.js';

function mockSmsProvider() {
  return {
    name: 'mock-sms',
    async sendVerificationCode() { return { accepted: true, provider: 'mock-sms' }; },
  };
}

// Additional providers can implement the same interface without changing tracking routes.
export const smsProvider = mockSmsProvider();
export const mayDisplayMockOtp = env.SMS_PROVIDER === 'mock' && (env.MOCK_OTP_DISPLAY || env.NODE_ENV !== 'production');
