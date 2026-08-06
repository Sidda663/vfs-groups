import { describe, expect, it } from 'vitest';
import { createWhatsAppUrl, officialPhoneNumbers, officialWhatsApp } from './contact.js';

describe('official VFS contact details', () => {
  it('uses the confirmed India WhatsApp number', () => {
    expect(officialPhoneNumbers).toEqual(['919008503115', '919008156084', '919880077987']);
    expect(officialWhatsApp.number).toBe('919008156084');
    expect(createWhatsAppUrl('Need assistance')).toBe('https://wa.me/919008156084?text=Need%20assistance');
  });
});
