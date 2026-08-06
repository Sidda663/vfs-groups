import { Router } from 'express';
import { Service } from '../../models/Service.js';
import { ApiError } from '../../utils/apiError.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { sendData } from '../../utils/apiResponse.js';

export const serviceRouter = Router();
serviceRouter.get('/', asyncHandler(async (_request, response) => sendData(response, await Service.find({ status: 'published' }).sort({ sortOrder: 1, name: 1 }).lean())));
serviceRouter.get('/:slug', asyncHandler(async (request, response) => { const service = await Service.findOne({ slug: request.params.slug, status: 'published' }).lean(); if (!service) throw new ApiError(404, 'SERVICE_NOT_FOUND', 'This service is not available.'); sendData(response, service); }));
