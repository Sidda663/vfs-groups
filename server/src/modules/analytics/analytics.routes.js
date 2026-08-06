import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { validate } from '../../middleware/validate.js';
import { AnalyticsEvent } from '../../models/AnalyticsEvent.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { sendData } from '../../utils/apiResponse.js';

export const analyticsRouter = Router();
const schema = z.object({
  eventType: z.enum(['page_view', 'cta_click', 'application_started', 'application_submitted', 'enquiry_submitted', 'tracking_verified']),
  path: z.string().trim().min(1).max(300), sessionId: z.string().trim().max(80).optional(),
  referrerHost: z.string().trim().max(150).optional(), metadata: z.record(z.string().max(200)).optional(),
});
analyticsRouter.post('/events', rateLimit({ windowMs: 60 * 1000, limit: 60, standardHeaders: true, legacyHeaders: false }), validate(schema), asyncHandler(async (request, response) => {
  const event = await AnalyticsEvent.create(request.body);
  sendData(response, { id: event.id }, 201);
}));
