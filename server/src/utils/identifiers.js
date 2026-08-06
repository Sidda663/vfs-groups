import { Counter } from '../models/Counter.js';

const PREFIXES = { customer: 'VFSCU', contractor: 'VFSC', lead: 'VFS-LEAD', application: 'VFS-APP', subscription: 'VFS-SUB', commission: 'VFS-COM', loanReferral: 'VFS-REF' };

export async function nextPublicId(kind, session) {
  if (!PREFIXES[kind]) throw new Error(`Unknown identifier kind: ${kind}`);
  const year = new Date().getUTCFullYear();
  const counter = await Counter.findOneAndUpdate({ key: `${kind}:${year}` }, { $inc: { value: 1 } }, { new: true, upsert: true, setDefaultsOnInsert: true, session });
  return `${PREFIXES[kind]}-${year}-${String(counter.value).padStart(6, '0')}`;
}

export async function nextReferralCode(role, session) {
  if (role !== 'contractor') throw new Error('Referral codes are available only for connectors.');
  const counter = await Counter.findOneAndUpdate({ key: 'referral:connector' }, { $inc: { value: 1 } }, { new: true, upsert: true, setDefaultsOnInsert: true, session });
  return `CONN-${Number(counter.value).toString(36).toUpperCase().padStart(6, '0')}`;
}
