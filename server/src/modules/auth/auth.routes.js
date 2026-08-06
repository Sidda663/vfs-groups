import { randomBytes } from 'node:crypto';
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { env } from '../../config/env.js';
import { requireAuth } from '../../middleware/auth.js';
import { requireCsrf } from '../../middleware/csrf.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { sendData } from '../../utils/apiResponse.js';
import { ApiError } from '../../utils/apiError.js';
import { loginSchema, registerContractorSchema, registerCustomerSchema } from './auth.schemas.js';
import * as authService from './auth.service.js';

export const authRouter = Router();
const authLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: env.NODE_ENV === 'production' ? 20 : 200, standardHeaders: true, legacyHeaders: false, message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many authentication attempts. Please try again later.' } } });

authRouter.get('/csrf', (request, response) => {
  const existing = request.cookies?.vfs_csrf;
  const token = typeof existing === 'string' && /^[a-f\d]{64}$/i.test(existing) ? existing : randomBytes(32).toString('hex');
  response.cookie('vfs_csrf', token, { httpOnly: false, secure: process.env.NODE_ENV === 'production', sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', path: '/' });
  sendData(response, { csrfToken: token });
});
authRouter.post('/customer/register', authLimit, validate(registerCustomerSchema), asyncHandler(async (request, response) => sendData(response, { user: await authService.registerCustomer(request.body, request, response) }, 201)));
authRouter.post('/contractor/register', authLimit, validate(registerContractorSchema), asyncHandler(async (_request, _response) => {
  throw new ApiError(402, 'CONNECTOR_PAYMENT_REQUIRED', 'Complete the connector registration payment before the account can be created.');
}));
authRouter.post('/customer/login', authLimit, validate(loginSchema), asyncHandler(async (request, response) => sendData(response, { user: await authService.login(request.body, request, response, 'customer') })));
authRouter.post('/contractor/login', authLimit, validate(loginSchema), asyncHandler(async (request, response) => sendData(response, { user: await authService.login(request.body, request, response, 'contractor') })));
authRouter.post('/admin/login', authLimit, validate(loginSchema), asyncHandler(async (request, response) => sendData(response, { user: await authService.login(request.body, request, response, 'admin') })));
authRouter.post('/login', authLimit, validate(loginSchema), asyncHandler(async (request, response) => sendData(response, { user: await authService.login(request.body, request, response) })));
authRouter.post('/refresh', authLimit, asyncHandler(async (request, response) => sendData(response, { user: await authService.refresh(request, response) })));
authRouter.post('/logout', requireCsrf, asyncHandler(async (request, response) => { await authService.logout(request, response); sendData(response, { loggedOut: true }); }));
authRouter.get('/me', requireAuth, asyncHandler(async (request, response) => sendData(response, { user: request.user })));
