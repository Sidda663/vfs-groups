import { describe, expect, it } from 'vitest';
import { buildFallbackResponse } from '../src/providers/index.js';

const knowledge = [
  'Home Loans: Assistance for purchasing or constructing a home.\nEligibility: Salaried and self-employed applicants may enquire\nDocuments: Identity; address; available income records\nProcess: Apply; review; provider assessment',
  'Loan Against Property (LAP): Property-backed loan assistance for personal or business requirements.\nEligibility: Applicants with eligible property may enquire\nDocuments: Identity; address; property records\nProcess: Apply; property review; provider assessment',
  'Business Loans: Funding assistance for business needs.\nEligibility: Business owners and self-employed applicants may enquire\nDocuments: Identity; available business and bank records\nProcess: Apply; review; provider assessment',
].join('\n\n');

describe('AI fallback responses', () => {
  it('answers greetings without the generic catch-all response', () => {
    expect(buildFallbackResponse({ message: 'hi', knowledge })).toContain('Hello!');
  });

  it('compares two matched services using published knowledge', () => {
    const answer = buildFallbackResponse({ message: 'What is the difference between a home loan and loan against property?', knowledge });
    expect(answer).toContain('Home Loans');
    expect(answer).toContain('Loan Against Property');
    expect(answer).not.toContain('Business Loans');
  });

  it('returns service-specific information for a focused question', () => {
    const answer = buildFallbackResponse({ message: 'Explain business loan funding', knowledge });
    expect(answer).toContain('Business Loans');
    expect(answer).toContain('business needs');
  });

  it('understands simple shorthand and common spelling mistakes', () => {
    const answer = buildFallbackResponse({ message: 'pls tel abt bussiness lon', knowledge });
    expect(answer).toContain('Business Loans');
    expect(answer).toContain('business needs');
  });

  it('prompts for a concrete goal when no published topic matches', () => {
    const answer = buildFallbackResponse({ message: 'Can you help me?', knowledge });
    expect(answer).toContain('Please mention the service or goal');
  });
});
