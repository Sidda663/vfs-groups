import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { validate } from '../../middleware/validate.js';
import { Service } from '../../models/Service.js';
import { providers } from '../../providers/index.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { sendData } from '../../utils/apiResponse.js';

export const chatRouter = Router();
const schema = z.object({ message: z.string().trim().min(2).max(1000), history: z.array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().trim().min(1).max(1500) })).max(10).default([]) });
chatRouter.post('/messages', rateLimit({ windowMs: 60 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false }), validate(schema), asyncHandler(async (request, response) => {
  const services = await Service.find({ status: 'published' }).select('name shortDescription eligibility documents process').sort({ sortOrder: 1 }).lean();
  const knowledge = services.map((service) => `${service.name}: ${service.shortDescription}\nEligibility: ${service.eligibility.join('; ')}\nDocuments: ${service.documents.join('; ')}\nProcess: ${service.process.join('; ')}`).join('\n\n');
  const result = await providers.ai.respond({ message: request.body.message, history: request.body.history, knowledge });
  sendData(response, { message: result.message, provider: result.provider });
}));
