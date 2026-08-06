import { describe, expect, it } from 'vitest';
import { mobileErrorMessage, mobilePattern, sanitizeMobile } from './validation.js';

describe('mobile validation', () => {
  it('keeps supported phone characters and removes accidental separators', () => {
    expect(sanitizeMobile('+91 98765-43210')).toBe('+919876543210');
    expect(mobilePattern.test(sanitizeMobile('98765 43210'))).toBe(true);
  });

  it('rejects incomplete phone numbers with the friendly example', () => {
    expect(mobilePattern.test('12345')).toBe(false);
    expect(mobileErrorMessage).toContain('9876543210');
  });
});
