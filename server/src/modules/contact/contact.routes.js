import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { CallbackRequest } from '../../models/CallbackRequest.js';
import { ContactEnquiry } from '../../models/ContactEnquiry.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { sendData } from '../../utils/apiResponse.js';

const router = Router();
const publicFormLimit = rateLimit({ windowMs: 60 * 60 * 1000, limit: 12, standardHeaders: true, legacyHeaders: false });
const mobile = z.string().trim().regex(/^\+?[1-9]\d{9,14}$/);
const enquiry = z.object({ name: z.string().trim().min(2).max(100), mobile, email: z.string().trim().email().optional().or(z.literal('')), subject: z.string().trim().min(3).max(150), service: z.string().regex(/^[a-f\d]{24}$/i).optional().or(z.literal('')), message: z.string().trim().min(10).max(2000), preferredContactMethod: z.enum(['phone', 'email', 'whatsapp']), consent: z.literal(true), website: z.string().max(0).optional() });
const callback = z.object({ name: z.string().trim().min(2).max(100), mobile, service: z.string().regex(/^[a-f\d]{24}$/i).optional().or(z.literal('')), preferredTime: z.string().trim().max(80).optional(), consent: z.literal(true), website: z.string().max(0).optional() });

router.post('/enquiries', publicFormLimit, validate(enquiry), asyncHandler(async (request, response) => { const input = { ...request.body }; delete input.website; const item = await ContactEnquiry.create({ ...input, email: input.email || undefined, service: input.service || undefined }); sendData(response, { id: item.id, message: 'Your enquiry has been received. Our team will contact you using your selected method.' }, 201); }));
router.post('/callbacks', publicFormLimit, validate(callback), asyncHandler(async (request, response) => { const input = { ...request.body }; delete input.website; const item = await CallbackRequest.create({ ...input, service: input.service || undefined }); sendData(response, { id: item.id, message: 'Your callback request has been received.' }, 201); }));
export { router as contactRouter };
