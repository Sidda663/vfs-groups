import { describe, expect, it } from 'vitest';
import { apiMessage, resolveApiBaseUrl, resolveRequestPortal } from './api.js';

describe('resolveApiBaseUrl', () => {
  it('uses the same-origin Netlify proxy in production', () => {
    expect(resolveApiBaseUrl({ isDevelopment: false, configuredUrl: 'https://different.example/api/v1' })).toBe('/api/v1');
  });

  it('allows a configured API URL during local development', () => {
    expect(resolveApiBaseUrl({ isDevelopment: true, configuredUrl: 'http://localhost:5050/api/v1' })).toBe('http://localhost:5050/api/v1');
  });
});

describe('apiMessage', () => {
  it('returns a safe backend error message', () => {
    expect(apiMessage({ response: { data: { error: { message: 'Please correct the fields.' } } } })).toBe('Please correct the fields.');
  });

  it('returns a safe fallback for network failures', () => {
    expect(apiMessage(new Error('socket details'))).toBe('We could not complete the request. Please try again.');
  });
});

describe('resolveRequestPortal', () => {
  it('keeps authentication requests in their matching portal session', () => {
    expect(resolveRequestPortal('/auth/admin/login', '/admin/sign-in')).toBe('admin');
    expect(resolveRequestPortal('/auth/me', '/customer/dashboard')).toBe('customer');
    expect(resolveRequestPortal('/dashboard/contractor/service-referrals', '/')).toBe('contractor');
  });
});
