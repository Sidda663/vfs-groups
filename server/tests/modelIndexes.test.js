import { describe, expect, it } from 'vitest';
import { LoanReferral } from '../src/models/LoanReferral.js';
import { LoginActivity } from '../src/models/LoginActivity.js';
import { User } from '../src/models/User.js';

const indexesFor = (model) => model.schema.indexes().map(([fields, options]) => ({ fields, options }));

describe('referral and activity indexes', () => {
  it('enforces permanent unique referral codes at the database layer', () => {
    const index = indexesFor(User).find((item) => item.fields.referralCode === 1);
    expect(index.options.unique).toBe(true);
    expect(index.options.sparse).toBe(true);
  });

  it('indexes recent successful login activity by user', () => {
    expect(indexesFor(LoginActivity).some((item) => item.fields.user === 1 && item.fields.loginAt === -1)).toBe(true);
  });

  it('indexes each submitter’s loan referrals chronologically', () => {
    expect(indexesFor(LoanReferral).some((item) => item.fields.submittedBy === 1 && item.fields.createdAt === -1)).toBe(true);
  });
});
