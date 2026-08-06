import mongoose from 'mongoose';
import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { requireCsrf } from '../../middleware/csrf.js';
import { validate } from '../../middleware/validate.js';
import { AuditLog } from '../../models/AuditLog.js';
import { LoanReferral } from '../../models/LoanReferral.js';
import { Service } from '../../models/Service.js';
import { ApiError } from '../../utils/apiError.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { sendData } from '../../utils/apiResponse.js';
import { nextPublicId } from '../../utils/identifiers.js';

export const loanReferralRouter = Router();
const createSchema = z.object({
  service: z.string().regex(/^[a-f\d]{24}$/i),
  applicant: z.object({
    fullName: z.string().trim().min(2).max(100), mobile: z.string().trim().regex(/^\+?[1-9]\d{9,14}$/),
    email: z.string().trim().email().toLowerCase().optional().or(z.literal('')), country: z.literal('India').default('India'), state: z.string().trim().min(2).max(80), city: z.string().trim().min(2).max(80),
    requestedAmount: z.coerce.number().min(0).max(100_000_000_000).optional(), notes: z.string().trim().max(1500).optional().or(z.literal('')),
  }),
});

loanReferralRouter.use(requireAuth, requireRole('customer', 'contractor'));
loanReferralRouter.get('/mine', asyncHandler(async (request, response) => {
  const items = await LoanReferral.find({ submittedBy: request.user._id }).populate('service', 'name slug').sort({ createdAt: -1 }).limit(100).lean();
  sendData(response, items, 200, { total: await LoanReferral.countDocuments({ submittedBy: request.user._id }) });
}));
loanReferralRouter.post('/', requireCsrf, validate(createSchema), asyncHandler(async (request, response) => {
  const service = await Service.findOne({ _id: request.body.service, status: 'published' }).select('_id');
  if (!service) throw new ApiError(422, 'SERVICE_UNAVAILABLE', 'Choose an available service.');
  const role = request.user.roles.some((item) => item.slug === 'contractor') ? 'contractor' : 'customer';
  const session = await mongoose.startSession(); let item;
  try {
    await session.withTransaction(async () => {
      const [created] = await LoanReferral.create([{ referralId: await nextPublicId('loanReferral', session), submittedBy: request.user._id, submitterRole: role, submitterReferralCode: role === 'contractor' ? request.user.referralCode : undefined, service: service._id, applicant: { ...request.body.applicant, email: request.body.applicant.email || undefined, notes: request.body.applicant.notes || undefined } }], { session });
      item = created;
      await AuditLog.create([{ actor: request.user._id, actorRoles: [role], action: 'loan_referral.created', resourceType: 'LoanReferral', resourceId: item._id, newValues: { referralId: item.referralId, status: item.status }, ip: request.ip, userAgent: request.get('user-agent'), requestId: request.id }], { session });
    });
  } finally { await session.endSession(); }
  sendData(response, await LoanReferral.findById(item._id).populate('service', 'name slug'), 201);
}));
