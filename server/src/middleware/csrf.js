import { timingSafeEqual } from 'node:crypto';
import { ApiError } from '../utils/apiError.js';

export function requireCsrf(request, _response, next) {
  const cookie = request.cookies?.vfs_csrf;
  const header = request.get('x-csrf-token');
  if (!cookie || !header) return next(new ApiError(403, 'CSRF_FAILED', 'The security token is missing or invalid.'));
  const left = Buffer.from(cookie); const right = Buffer.from(header);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return next(new ApiError(403, 'CSRF_FAILED', 'The security token is missing or invalid.'));
  next();
}
