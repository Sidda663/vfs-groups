import { describe, expect, it } from 'vitest';
import { services } from '../src/seeds/referenceData.js';

describe('approved VFS Group service catalogue', () => {
  it('publishes only the seventeen client-approved services', () => {
    expect(services).toHaveLength(17);
    expect(new Set(services.map((service) => service.slug)).size).toBe(17);
    expect(new Set(services.map((service) => service.category))).toEqual(new Set(['Loans', 'Insurance', 'Wealth & Investments', 'Legal Services']));
  });

  it('keeps inclusive loan-assistance guidance in every loan service', () => {
    const loans = services.filter((service) => service.category === 'Loans');
    expect(loans).toHaveLength(8);
    for (const service of loans) {
      expect(service.eligibility.join(' ')).toMatch(/without ITRs/i);
      expect(service.eligibility.join(' ')).toMatch(/low or limited CIBIL/i);
    }
  });

  it('does not republish retired sample services', () => {
    const slugs = services.map((service) => service.slug);
    expect(slugs).not.toContain('construction-loan');
    expect(slugs).not.toContain('project-loan');
    expect(slugs).not.toContain('industrial-mortgage-loan');
  });
});
