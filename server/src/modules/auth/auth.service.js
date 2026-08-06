import { createHash, randomUUID } from 'node:crypto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { env } from '../../config/env.js';
import { AuditLog } from '../../models/AuditLog.js';
import { Contractor } from '../../models/Contractor.js';
import { Customer } from '../../models/Customer.js';
import { LoginActivity } from '../../models/LoginActivity.js';
import { RefreshToken } from '../../models/RefreshToken.js';
import { Referral } from '../../models/Referral.js';
import { Role } from '../../models/Role.js';
import { User } from '../../models/User.js';
import { ADMIN_ROLES } from '../../middleware/auth.js';
import { ApiError } from '../../utils/apiError.js';
import { nextPublicId, nextReferralCode } from '../../utils/identifiers.js';

const hashToken = (token) => createHash('sha256').update(token).digest('hex');
const cookieBase = () => ({ httpOnly: true, secure: env.NODE_ENV === 'production', sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax', path: '/' });
const portalRoles = { customer: ['customer'], contractor: ['contractor'], admin: ADMIN_ROLES };

function signAccess(user) { return jwt.sign({ sub: user.id, type: 'access' }, env.JWT_ACCESS_SECRET, { expiresIn: env.JWT_ACCESS_EXPIRES_IN }); }
function signRefresh(user, family) { return jwt.sign({ sub: user.id, family, type: 'refresh' }, env.JWT_REFRESH_SECRET, { expiresIn: env.JWT_REFRESH_EXPIRES_IN }); }

const cookieNames = (portal) => portal && portalRoles[portal]
  ? { access: `vfs_${portal}_access`, refresh: `vfs_${portal}_refresh` }
  : { access: 'vfs_access', refresh: 'vfs_refresh' };

const requestPortal = (request) => {
  const portal = request.get('x-vfs-portal');
  return portalRoles[portal] ? portal : undefined;
};

async function issueSession(user, request, response, family = randomUUID(), portal) {
  const accessToken = signAccess(user);
  const refreshToken = signRefresh(user, family);
  const decoded = jwt.decode(refreshToken);
  const names = cookieNames(portal);
  await RefreshToken.create({ user: user._id, family, tokenHash: hashToken(refreshToken), expiresAt: new Date(decoded.exp * 1000), userAgent: request.get('user-agent'), ip: request.ip });
  response.cookie(names.access, accessToken, { ...cookieBase(), maxAge: 15 * 60 * 1000 });
  response.cookie(names.refresh, refreshToken, { ...cookieBase(), maxAge: Math.max(0, decoded.exp * 1000 - Date.now()) });
  // Keep the unscoped cookies during the transition for older clients. Current
  // clients always select the portal-specific cookie through x-vfs-portal.
  if (portal) {
    response.cookie('vfs_access', accessToken, { ...cookieBase(), maxAge: 15 * 60 * 1000 });
    response.cookie('vfs_refresh', refreshToken, { ...cookieBase(), maxAge: Math.max(0, decoded.exp * 1000 - Date.now()) });
  }
  return family;
}

async function resolveConnector(input, session) {
  if (!input.referralCode) return null;
  const connector = await Contractor.findOne({ referralCode: input.referralCode.toUpperCase() }).populate({ path: 'user', match: { status: 'active' }, select: 'mobile email fullName' }).session(session);
  if (!connector?.user) throw new ApiError(422, 'REFERRAL_CODE_INVALID', 'The connector referral code is not valid.');
  if (connector.user.mobile === input.mobile || (input.email && connector.user.email === input.email.toLowerCase())) throw new ApiError(422, 'SELF_REFERRAL_NOT_ALLOWED', 'You cannot refer your own account.');
  return connector;
}

async function registerAccount(input, accountType, request, _response, options = {}) {
  const session = await mongoose.startSession();
  let user;
  try {
    await session.withTransaction(async () => {
      const existing = await User.exists({ $or: [{ mobile: input.mobile }, ...(input.email ? [{ email: input.email }] : [])] }).session(session);
      if (existing) throw new ApiError(409, 'ACCOUNT_EXISTS', 'An account already exists for this mobile number or email.');
      const role = await Role.findOne({ slug: accountType }).session(session);
      if (!role) throw new ApiError(503, 'SETUP_REQUIRED', 'Application roles have not been initialized. Run the seed command.');
      const connector = accountType === 'customer' ? (options.connectorUserId ? await Contractor.findOne({ user: options.connectorUserId }).session(session) : await resolveConnector(input, session)) : null;
      if (options.connectorUserId && (!connector?.referralCode || connector.onboardingStatus === 'suspended')) throw new ApiError(409, 'CONNECTOR_REFERRAL_UNAVAILABLE', 'Your connector referral code is unavailable. Sign out and sign in again, or contact support.');
      const autoApproveReferral = Boolean(connector && options.connectorUserId);
      const [created] = await User.create([{
        fullName: input.fullName, mobile: input.mobile, email: input.email || undefined,
        passwordHash: options.passwordHash || await bcrypt.hash(input.password, 12), roles: [role._id], status: 'active',
        mobileVerifiedAt: env.NODE_ENV === 'development' ? new Date() : undefined,
        ...(autoApproveReferral ? { referredBy: connector.user, referredByCode: connector.referralCode } : {}),
      }], { session });
      user = created;
      if (accountType === 'customer') {
        const [customer] = await Customer.create([{ customerId: await nextPublicId('customer', session), user: user._id, country: input.country, city: input.city, state: input.state, customerType: input.customerType, referralCodeSubmitted: connector?.referralCode, referralApprovalStatus: connector ? (autoApproveReferral ? 'approved' : 'pending') : 'none', connector: autoApproveReferral ? connector._id : null }], { session });
        if (connector) await Referral.create([{ customer: customer._id, connector: connector._id, referralCode: connector.referralCode, status: autoApproveReferral ? 'approved' : 'pending', createdByConnector: autoApproveReferral, ...(autoApproveReferral ? { approvedAt: new Date(), approvedBy: options.connectorUserId } : {}) }], { session });
      } else {
        await Contractor.create([{ contractorId: await nextPublicId('contractor', session), user: user._id, businessName: input.businessName || undefined, country: input.country, city: input.city, state: input.state, onboardingStatus: 'registered' }], { session });
      }
      await AuditLog.create([{ actor: options.connectorUserId || user._id, actorRoles: options.connectorUserId ? ['contractor'] : [accountType], action: options.connectorUserId ? 'customer.created_by_connector' : `${accountType}.registered`, resourceType: 'User', resourceId: user._id, newValues: { consent: input.consent, referralCodeSubmitted: connector?.referralCode, referralStatus: connector ? (autoApproveReferral ? 'approved' : 'pending') : 'none', customerType: input.customerType }, ip: request.ip, userAgent: request.get('user-agent'), requestId: request.id }], { session });
    });
  } finally { await session.endSession(); }
  return User.findById(user._id).populate('roles', 'name slug');
}

export const registerCustomer = (input, request, response) => registerAccount(input, 'customer', request, response);
export const registerContractor = (input, request, response) => registerAccount(input, 'contractor', request, response);
export const registerPaidContractor = (input, passwordHash, request) => registerAccount(input, 'contractor', request, undefined, { passwordHash });
export const registerCustomerForConnector = (input, connectorUserId, request) => registerAccount({ ...input, referralCode: '' }, 'customer', request, undefined, { connectorUserId });

export async function login(input, request, response, portal) {
  const normalized = input.identifier.toLowerCase();
  const user = await User.findOne({ $or: [{ email: normalized }, { mobile: input.identifier }] }).select('+passwordHash +failedLoginAttempts +lockedUntil').populate('roles', 'name slug');
  const valid = user && await bcrypt.compare(input.password, user.passwordHash);
  if (!valid) {
    if (user) await User.updateOne({ _id: user._id }, { $inc: { failedLoginAttempts: 1 } });
    throw new ApiError(401, 'INVALID_CREDENTIALS', 'The sign-in details are incorrect.');
  }
  if (user.lockedUntil && user.lockedUntil > new Date()) throw new ApiError(423, 'ACCOUNT_LOCKED', 'This account is temporarily locked.');
  if (user.status !== 'active') throw new ApiError(403, 'ACCOUNT_INACTIVE', 'This account is not active.');
  const roleSlugs = user.roles.map((role) => role.slug);
  if (portal && !portalRoles[portal].some((role) => roleSlugs.includes(role))) throw new ApiError(403, 'WRONG_PORTAL', `This account cannot sign in to the ${portal} portal.`);

  const activityRole = portal || (roleSlugs.includes('customer') ? 'customer' : roleSlugs.includes('contractor') ? 'contractor' : roleSlugs[0]);
  const now = new Date();
  const family = randomUUID();
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      if (activityRole === 'contractor' && !user.referralCode) {
        const referralCode = await nextReferralCode('contractor', session);
        await User.updateOne({ _id: user._id, referralCode: { $exists: false } }, { $set: { referralCode } }, { session });
        await Contractor.updateOne({ user: user._id }, { $set: { referralCode } }, { session });
      }
      await User.updateOne({ _id: user._id }, { $set: { failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: now, firstLoginAt: user.firstLoginAt || now }, $inc: { successfulLoginCount: 1 } }, { session });
      await LoginActivity.create([{ user: user._id, role: activityRole, loginAt: now, sessionFamily: family, ip: request.ip, userAgent: request.get('user-agent') }], { session });
      await AuditLog.create([{ actor: user._id, actorRoles: roleSlugs, action: 'auth.login.succeeded', resourceType: 'User', resourceId: user._id, ip: request.ip, userAgent: request.get('user-agent'), requestId: request.id }], { session });
    });
  } finally { await session.endSession(); }
  await issueSession(user, request, response, family, portal || activityRole);
  return User.findById(user._id).populate('roles', 'name slug');
}

export async function refresh(request, response) {
  const portal = requestPortal(request);
  const names = cookieNames(portal);
  const token = request.cookies?.[names.refresh];
  if (!token) throw new ApiError(401, 'REFRESH_REQUIRED', 'Please sign in again.');
  let payload;
  try { payload = jwt.verify(token, env.JWT_REFRESH_SECRET); } catch { throw new ApiError(401, 'REFRESH_INVALID', 'Please sign in again.'); }
  const tokenHash = hashToken(token);
  const stored = await RefreshToken.findOne({ tokenHash });
  if (!stored || stored.revokedAt) {
    if (payload.family) await RefreshToken.updateMany({ family: payload.family, revokedAt: null }, { revokedAt: new Date() });
    throw new ApiError(401, 'SESSION_REVOKED', 'This session is no longer valid.');
  }
  const user = await User.findById(payload.sub);
  if (!user || user.status !== 'active') throw new ApiError(401, 'ACCOUNT_UNAVAILABLE', 'Please sign in again.');
  stored.revokedAt = new Date();
  await stored.save();
  await issueSession(user, request, response, payload.family, portal);
  return User.findById(user._id).populate('roles', 'name slug');
}

export async function logout(request, response) {
  const portal = requestPortal(request);
  const names = cookieNames(portal);
  const token = request.cookies?.[names.refresh];
  if (token) await RefreshToken.updateOne({ tokenHash: hashToken(token), revokedAt: null }, { revokedAt: new Date() });
  response.clearCookie(names.access, cookieBase());
  response.clearCookie(names.refresh, cookieBase());
  if (!portal) {
    response.clearCookie('vfs_access', cookieBase());
    response.clearCookie('vfs_refresh', cookieBase());
  }
}
