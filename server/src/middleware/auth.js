import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import '../models/Permission.js';
import { User } from '../models/User.js';
import { ApiError } from '../utils/apiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const requireAuth = asyncHandler(async (request, _response, next) => {
  const portal = request.get('x-vfs-portal');
  const supportedPortal = ['admin', 'customer', 'contractor'].includes(portal) ? portal : null;
  // Each portal has its own cookie so signing in to one workspace cannot replace
  // another open workspace. Requests without a portal header retain legacy
  // compatibility, while current portal requests never consume another slot.
  const token = supportedPortal
    ? request.cookies?.[`vfs_${supportedPortal}_access`]
    : request.cookies?.vfs_access;
  if (!token) throw new ApiError(401, 'AUTHENTICATION_REQUIRED', 'Please sign in to continue.');
  let payload;
  try { payload = jwt.verify(token, env.JWT_ACCESS_SECRET); } catch { throw new ApiError(401, 'SESSION_EXPIRED', 'Your session has expired. Please sign in again.'); }
  const user = await User.findById(payload.sub).populate({ path: 'roles', populate: { path: 'permissions' } });
  if (!user || user.status !== 'active') throw new ApiError(401, 'ACCOUNT_UNAVAILABLE', 'This account is not available.');
  request.user = user;
  request.permissions = new Set(user.roles.flatMap((role) => role.permissions.map((permission) => permission.key)));
  next();
});

export const requirePermission = (...permissions) => (request, _response, next) => {
  const allowed = permissions.every((permission) => request.permissions?.has(permission));
  if (!allowed) return next(new ApiError(403, 'FORBIDDEN', 'You do not have permission to perform this action.'));
  next();
};

export const requireRole = (...roles) => (request, _response, next) => {
  const userRoles = request.user?.roles?.map((role) => role.slug) || [];
  if (!roles.some((role) => userRoles.includes(role))) return next(new ApiError(403, 'ROLE_FORBIDDEN', 'This portal is not available for your account.'));
  next();
};

export const ADMIN_ROLES = ['super-admin', 'admin', 'operations-manager', 'application-manager', 'finance-manager', 'support-agent', 'content-manager'];
