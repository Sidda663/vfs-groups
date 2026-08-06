import { describe, expect, it } from 'vitest';
import { registerCustomerSchema } from '../src/modules/auth/auth.schemas.js';

const validRegistration = {
  fullName: 'VFS Customer',
  mobile: '919100000001',
  email: 'vfs.customer@gmail.com',
  password: 'SecurePass123',
  country: 'India',
  state: 'Telangana',
  city: 'Hyderabad',
  referralCode: '',
  customerType: 'indian',
  consent: true,
};

describe('account enrollment validation', () => {
  it('accepts an optional valid email address and Indian location', () => {
    expect(registerCustomerSchema.safeParse(validRegistration).success).toBe(true);
  });

  it('accepts non-Gmail and missing email enrollment', () => {
    expect(registerCustomerSchema.safeParse({ ...validRegistration, email: 'customer@example.com' }).success).toBe(true);
    expect(registerCustomerSchema.safeParse({ ...validRegistration, email: '' }).success).toBe(true);
  });

  it('requires the supported country value', () => {
    expect(registerCustomerSchema.safeParse({ ...validRegistration, country: 'Other' }).success).toBe(false);
  });
});
