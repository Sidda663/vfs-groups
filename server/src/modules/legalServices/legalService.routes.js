import { Router } from 'express';
import { z } from 'zod';
import { ADMIN_ROLES, requireAuth, requireRole } from '../../middleware/auth.js';
import { requireCsrf } from '../../middleware/csrf.js';
import { validate } from '../../middleware/validate.js';
import { LegalService } from '../../models/LegalService.js';
import { LegalServiceRequest } from '../../models/LegalServiceRequest.js';
import { ApiError } from '../../utils/apiError.js';
import { sendData } from '../../utils/apiResponse.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

export const legalServiceRouter = Router();
const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Choose a valid service');
const serviceSchema = z.object({ name: z.string().trim().min(2).max(120), active: z.boolean().optional().default(true) }).strict();
const requestSchema = z.object({ name: z.string().trim().min(2).max(100), phone: z.string().trim().regex(/^\+?[1-9]\d{9,14}$/, 'Enter a valid phone number'), email: z.string().trim().toLowerCase().refine((value) => !value || z.string().email().safeParse(value).success, 'Enter a valid email address').optional().default(''), service: objectId }).strict();

legalServiceRouter.get('/', asyncHandler(async (_request, response) => sendData(response, await LegalService.find({ active: true }).sort({ name: 1 }).lean())));
legalServiceRouter.post('/requests', requireCsrf, validate(requestSchema), asyncHandler(async (request, response) => {
  const service = await LegalService.findOne({ _id: request.body.service, active: true });
  if (!service) throw new ApiError(422, 'LEGAL_SERVICE_UNAVAILABLE', 'Choose an available legal service.');
  const item = await LegalServiceRequest.create({ ...request.body, email: request.body.email || undefined, serviceName: service.name });
  sendData(response, item, 201);
}));

legalServiceRouter.use('/admin', requireAuth, requireRole(...ADMIN_ROLES));
legalServiceRouter.get('/admin/services', asyncHandler(async (_request, response) => sendData(response, await LegalService.find().sort({ createdAt: 1 }).lean())));
legalServiceRouter.post('/admin/services', requireCsrf, validate(serviceSchema), asyncHandler(async (request, response) => {
  try { sendData(response, await LegalService.create(request.body), 201); } catch (error) { if (error?.code === 11000) throw new ApiError(409, 'LEGAL_SERVICE_EXISTS', 'A legal service with this name already exists.'); throw error; }
}));
legalServiceRouter.patch('/admin/services/:id', requireCsrf, validate(serviceSchema), asyncHandler(async (request, response) => {
  try {
    const item = await LegalService.findByIdAndUpdate(request.params.id, { $set: request.body }, { new: true, runValidators: true });
    if (!item) throw new ApiError(404, 'LEGAL_SERVICE_NOT_FOUND', 'Legal service not found.');
    sendData(response, item);
  } catch (error) { if (error?.code === 11000) throw new ApiError(409, 'LEGAL_SERVICE_EXISTS', 'A legal service with this name already exists.'); throw error; }
}));
legalServiceRouter.delete('/admin/services/:id', requireCsrf, asyncHandler(async (request, response) => {
  const item = await LegalService.findByIdAndDelete(request.params.id);
  if (!item) throw new ApiError(404, 'LEGAL_SERVICE_NOT_FOUND', 'Legal service not found.');
  sendData(response, { id: item.id, deleted: true });
}));
legalServiceRouter.get('/admin/requests', asyncHandler(async (_request, response) => sendData(response, await LegalServiceRequest.find().populate('service', 'name active').sort({ createdAt: -1 }).lean())));
