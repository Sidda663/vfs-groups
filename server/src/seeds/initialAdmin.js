import bcrypt from 'bcrypt';
import { User } from '../models/User.js';

const requiredKeys = ['INITIAL_ADMIN_NAME', 'INITIAL_ADMIN_EMAIL', 'INITIAL_ADMIN_MOBILE', 'INITIAL_ADMIN_PASSWORD'];

export async function syncInitialAdmin(config, superAdminRole) {
  const providedKeys = requiredKeys.filter((key) => Boolean(config[key]?.trim()));
  if (!providedKeys.length) return { status: 'not_configured' };
  if (providedKeys.length !== requiredKeys.length) {
    const missing = requiredKeys.filter((key) => !config[key]?.trim());
    throw new Error(`Initial administrator configuration is incomplete. Missing: ${missing.join(', ')}`);
  }
  if (!superAdminRole?._id) throw new Error('The super-admin role must be initialized before the administrator account.');

  const email = config.INITIAL_ADMIN_EMAIL.trim().toLowerCase();
  const existing = await User.findOne({ email }).select('+passwordHash');
  const passwordMatches = existing && await bcrypt.compare(config.INITIAL_ADMIN_PASSWORD, existing.passwordHash);
  const passwordHash = passwordMatches ? existing.passwordHash : await bcrypt.hash(config.INITIAL_ADMIN_PASSWORD, 12);
  const values = {
    fullName: config.INITIAL_ADMIN_NAME.trim(),
    email,
    mobile: config.INITIAL_ADMIN_MOBILE.trim(),
    passwordHash,
    roles: [superAdminRole._id],
    status: 'active',
    emailVerifiedAt: existing?.emailVerifiedAt || new Date(),
    mobileVerifiedAt: existing?.mobileVerifiedAt || new Date(),
  };

  if (existing) {
    Object.assign(existing, values);
    await existing.save();
    return { status: passwordMatches ? 'verified' : 'password_synchronized', userId: existing._id };
  }

  const created = await User.create(values);
  return { status: 'created', userId: created._id };
}
