import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { env } from '../../config/env.js';
import { ADMIN_ROLES, requireAuth, requireRole } from '../../middleware/auth.js';
import { requireCsrf } from '../../middleware/csrf.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { sendData } from '../../utils/apiResponse.js';
import { registerContractorSchema } from '../auth/auth.schemas.js';
import * as paymentService from './payment.service.js';

export const paymentRouter = Router();
const registrationLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: env.NODE_ENV === 'production' ? 10 : 100, standardHeaders: true, legacyHeaders: false });
const idSchema = z.object({ registrationId: z.string().uuid() });

paymentRouter.post('/connector-registration/start', registrationLimit, validate(registerContractorSchema), asyncHandler(async (request, response) => {
  sendData(response, await paymentService.startConnectorRegistration(request.body), 201);
}));
paymentRouter.get('/connector-registration/:registrationId/status', validate(idSchema, 'params'), asyncHandler(async (request, response) => {
  sendData(response, await paymentService.getRegistrationStatus(request.params.registrationId));
}));
paymentRouter.post('/connector-registration/:registrationId/mock-success', registrationLimit, requireCsrf, validate(idSchema, 'params'), asyncHandler(async (request, response) => {
  sendData(response, await paymentService.completeMockPayment(request.params.registrationId, request));
}));
paymentRouter.post('/razorpay/webhook', asyncHandler(async (request, response) => {
  await paymentService.processRazorpayWebhook(request);
  response.status(200).json({ status: 'ok' });
}));
paymentRouter.get('/admin/connector-registrations', requireAuth, requireRole(...ADMIN_ROLES), asyncHandler(async (request, response) => {
  const result = await paymentService.listAdminPayments(request.query);
  sendData(response, result.items, 200, result.meta);
}));
