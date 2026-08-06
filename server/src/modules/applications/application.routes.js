import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { unlink } from 'node:fs/promises';
import mongoose from 'mongoose';
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import { z } from 'zod';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { requireCsrf } from '../../middleware/csrf.js';
import { validate } from '../../middleware/validate.js';
import { Application, APPLICATION_STATUSES } from '../../models/Application.js';
import { ApplicationDocument, NRI_DOCUMENT_TYPES } from '../../models/ApplicationDocument.js';
import { ApplicationStatusHistory } from '../../models/ApplicationStatusHistory.js';
import { AuditLog } from '../../models/AuditLog.js';
import { Contractor } from '../../models/Contractor.js';
import { Customer } from '../../models/Customer.js';
import { Service } from '../../models/Service.js';
import { storageProvider } from '../../providers/storage.js';
import { ApiError } from '../../utils/apiError.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { sendData } from '../../utils/apiResponse.js';
import { nextPublicId } from '../../utils/identifiers.js';

export const applicationRouter = Router();
const documentUploadDirectory = '/tmp/vfs-groups-documents';
mkdirSync(documentUploadDirectory, { recursive: true });
const acceptedDocumentTypes = new Set(['application/pdf', 'image/jpeg', 'image/png']);
const documentUpload = multer({ dest: documentUploadDirectory, limits: { fileSize: 10 * 1024 * 1024 }, fileFilter(_request, file, callback) { callback(null, acceptedDocumentTypes.has(file.mimetype)); } });
const mobile = z.string().trim().regex(/^\+?[1-9]\d{9,14}$/);
const objectId = z.string().regex(/^[a-f\d]{24}$/i);
const submissionSchema = z.object({
  service: objectId,
  personal: z.object({ fullName: z.string().trim().min(2).max(100), mobile, email: z.string().trim().email().toLowerCase(), dateOfBirth: z.coerce.date().max(new Date()), country: z.literal('India').default('India'), city: z.string().trim().min(2).max(80), state: z.string().trim().min(2).max(80), pinCode: z.string().trim().regex(/^\d{6}$/) }),
  financial: z.object({ employmentType: z.enum(['salaried','self_employed','business','other']), employerOrBusinessName: z.string().trim().max(150).optional(), monthlyIncome: z.coerce.number().min(0).max(1_000_000_000).optional(), annualTurnover: z.coerce.number().min(0).max(100_000_000_000).optional(), existingEmi: z.coerce.number().min(0).max(1_000_000_000).default(0), requestedAmount: z.coerce.number().positive().max(100_000_000_000), itrStatus: z.enum(['available','not_available','not_sure']).optional(), creditProfile: z.enum(['low','fair','good','not_sure']).optional() }),
  serviceSpecific: z.record(z.string().max(1000)).default({}), referralCode: z.string().trim().toUpperCase().max(40).optional().or(z.literal('')),
  consents: z.object({ privacy: z.literal(true), communication: z.boolean(), accuracy: z.literal(true), terms: z.literal(true) }),
  draftId: objectId.optional(), website: z.string().max(0).optional(),
});
const draftSchema = z.object({
  service: objectId,
  personal: z.object({ fullName: z.string().trim().max(100).optional(), mobile: z.string().trim().max(20).optional(), email: z.string().trim().max(150).optional(), dateOfBirth: z.string().trim().max(30).optional(), country: z.literal('India').optional(), city: z.string().trim().max(80).optional(), state: z.string().trim().max(80).optional(), pinCode: z.string().trim().max(12).optional() }).default({}),
  financial: z.object({ employmentType: z.string().trim().max(40).optional(), employerOrBusinessName: z.string().trim().max(150).optional(), monthlyIncome: z.coerce.number().min(0).max(1_000_000_000).optional(), annualTurnover: z.coerce.number().min(0).max(100_000_000_000).optional(), existingEmi: z.coerce.number().min(0).max(1_000_000_000).optional(), requestedAmount: z.coerce.number().min(0).max(100_000_000_000).optional(), itrStatus: z.string().trim().max(40).optional(), creditProfile: z.string().trim().max(40).optional() }).default({}),
  serviceSpecific: z.record(z.string().max(1000)).default({}), referralCode: z.string().trim().toUpperCase().max(40).optional(), consents: z.record(z.boolean()).optional(),
});
const draftLimit = rateLimit({ windowMs: 60 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false });
const referralValidationSchema = z.object({ referralCode: z.string().trim().toUpperCase().min(1).max(40) });
const referralValidationLimit = rateLimit({ windowMs: 60 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false });

applicationRouter.get('/customer/draft', requireAuth, requireRole('customer'), asyncHandler(async (request, response) => {
  const customer = await customerFor(request.user._id);
  const draft = await Application.findOne({ customer: customer._id, status: 'draft', draftExpiresAt: { $gt: new Date() } }).sort({ updatedAt: -1 });
  sendData(response, {
    account: { fullName: request.user.fullName, mobile: request.user.mobile, email: request.user.email || '', country: customer.country || 'India', state: customer.state || '', city: customer.city || '' },
    draft: draft ? draftSnapshot(draft) : null,
  });
}));

applicationRouter.get('/customer/tracking', requireAuth, requireRole('customer'), asyncHandler(async (request, response) => {
  const customer = await customerFor(request.user._id);
  const applications = await Application.find({ customer: customer._id, status: { $ne: 'draft' } })
    .populate('service', 'name slug category')
    .sort({ submittedAt: -1, createdAt: -1 })
    .lean();
  const ids = applications.map((application) => application._id);
  const history = ids.length
    ? await ApplicationStatusHistory.find({ application: { $in: ids } }).select('application oldStatus newStatus publicNote createdAt').sort({ createdAt: 1 }).lean()
    : [];
  const documents = ids.length
    ? await ApplicationDocument.find({ application: { $in: ids } }).select('application documentKey originalName mimeType size storage status rejectionReason createdAt verifiedAt').sort({ createdAt: -1 }).lean()
    : [];
  const historyByApplication = new Map();
  for (const item of history) {
    const key = String(item.application);
    historyByApplication.set(key, [...(historyByApplication.get(key) || []), item]);
  }
  const documentsByApplication = new Map();
  for (const item of documents) {
    const key = String(item.application);
    const current = documentsByApplication.get(key) || new Map();
    if (!current.has(item.documentKey)) current.set(item.documentKey, item);
    documentsByApplication.set(key, current);
  }
  sendData(response, applications.map((application) => ({
    _id: application._id,
    applicationId: application.applicationId,
    leadId: application.leadId,
    service: application.service,
    status: application.status,
    requestedAmount: application.financial?.requestedAmount,
    submittedAt: application.submittedAt,
    history: historyByApplication.get(String(application._id)) || [],
    nriDocumentUploadEnabled: customer.customerType === 'nri',
    documents: customer.customerType === 'nri' ? documentRequirements(documentsByApplication.get(String(application._id))) : [],
  })));
}));

applicationRouter.post('/customer/applications/:id/documents', requireAuth, requireRole('customer'), requireCsrf, documentUpload.single('document'), asyncHandler(async (request, response) => {
  if (!request.file) throw new ApiError(422, 'DOCUMENT_REQUIRED', 'Choose a PDF, JPG, or PNG document up to 10 MB.');
  const customer = await customerFor(request.user._id);
  try {
    if (customer.customerType !== 'nri') throw new ApiError(403, 'NRI_DOCUMENT_UPLOAD_ONLY', 'Online document upload is available only for NRI Customer accounts.');
    const type = NRI_DOCUMENT_TYPES.find((item) => item.key === request.body.documentKey);
    if (!type) throw new ApiError(422, 'DOCUMENT_TYPE_INVALID', 'Choose a valid document type.');
    const application = await Application.findOne({ _id: request.params.id, customer: customer._id, status: { $ne: 'draft' } }).select('_id applicationId');
    if (!application) throw new ApiError(404, 'APPLICATION_NOT_FOUND', 'Application not found.');
    const uploaded = await storageProvider.upload(request.file.path, { folder: `vfs-groups/nri-documents/${application.applicationId}`, sensitive: true });
    const document = await ApplicationDocument.create({ application: application._id, documentKey: type.key, category: type.category, originalName: request.file.originalname.slice(0, 200), mimeType: request.file.mimetype, size: request.file.size, storage: uploaded, status: 'uploaded', uploadedByRole: 'nri_customer' });
    await AuditLog.create({ actor: request.user._id, actorRoles: ['customer'], action: 'application.document.uploaded', resourceType: 'ApplicationDocument', resourceId: document._id, newValues: { applicationId: application.applicationId, documentKey: type.key }, ip: request.ip, userAgent: request.get('user-agent'), requestId: request.id });
    sendData(response, publicDocument(document, type), 201);
  } finally { await unlink(request.file.path).catch(() => {}); }
}));

applicationRouter.get('/customer/applications/:id/documents/:documentId/view', requireAuth, requireRole('customer'), asyncHandler(async (request, response) => {
  const customer = await customerFor(request.user._id);
  if (customer.customerType !== 'nri') throw new ApiError(403, 'NRI_DOCUMENT_UPLOAD_ONLY', 'Online document access is available only for NRI Customer accounts.');
  const application = await Application.findOne({ _id: request.params.id, customer: customer._id }).select('_id');
  if (!application) throw new ApiError(404, 'APPLICATION_NOT_FOUND', 'Application not found.');
  const document = await ApplicationDocument.findOne({ _id: request.params.documentId, application: application._id }).select('+storage');
  if (!document?.storage?.publicId) throw new ApiError(404, 'DOCUMENT_NOT_FOUND', 'Document not found.');
  sendData(response, { url: storageProvider.signedUrl(document.storage.publicId, { resourceType: document.storage.resourceType, expiresInSeconds: 300 }), expiresInSeconds: 300 });
}));

applicationRouter.put('/customer/draft', requireAuth, requireRole('customer'), requireCsrf, draftLimit, validate(draftSchema), asyncHandler(async (request, response) => {
  const customer = await customerFor(request.user._id);
  await ensurePublishedService(request.body.service);
  const values = { ...cleanObject(request.body), customer: customer._id, updatedBy: request.user._id, draftExpiresAt: draftExpiry() };
  let draft = await Application.findOne({ customer: customer._id, status: 'draft', draftExpiresAt: { $gt: new Date() } }).sort({ updatedAt: -1 });
  if (draft) {
    Object.assign(draft, values);
    await draft.save();
  } else {
    draft = await Application.create({ ...values, status: 'draft', createdBy: request.user._id });
  }
  sendData(response, { ...draftSnapshot(draft), message: 'Draft saved to your customer account for 30 days.' }, 201);
}));

applicationRouter.delete('/customer/draft', requireAuth, requireRole('customer'), requireCsrf, asyncHandler(async (request, response) => {
  const customer = await customerFor(request.user._id);
  const result = await Application.deleteMany({ customer: customer._id, status: 'draft' });
  sendData(response, { deleted: result.deletedCount > 0 });
}));

applicationRouter.post('/public/drafts', draftLimit, validate(draftSchema), asyncHandler(async (request, response) => {
  await ensurePublishedService(request.body.service);
  const resumeToken = randomBytes(32).toString('hex');
  const application = await Application.create({ ...cleanObject(request.body), status: 'draft', resumeTokenHash: hash(resumeToken), draftExpiresAt: draftExpiry() });
  sendData(response, { draftId: application.id, resumeToken, expiresAt: application.draftExpiresAt, message: 'Your draft was saved securely for 30 days on this device.' }, 201);
}));

applicationRouter.get('/public/drafts/:id', draftLimit, asyncHandler(async (request, response) => {
  const draft = await authenticatedDraft(request.params.id, request.get('x-resume-token'));
  sendData(response, { draftId: draft.id, service: draft.service, personal: draft.personal, financial: draft.financial, serviceSpecific: draft.serviceSpecific, referralCode: draft.referralCode, consents: draft.consents, expiresAt: draft.draftExpiresAt });
}));

applicationRouter.patch('/public/drafts/:id', draftLimit, validate(draftSchema), asyncHandler(async (request, response) => {
  const draft = await authenticatedDraft(request.params.id, request.get('x-resume-token'));
  await ensurePublishedService(request.body.service);
  Object.assign(draft, cleanObject(request.body), { draftExpiresAt: draftExpiry() });
  await draft.save();
  sendData(response, { draftId: draft.id, expiresAt: draft.draftExpiresAt, message: 'Draft updated.' });
}));

applicationRouter.post('/public/referrals/validate', referralValidationLimit, validate(referralValidationSchema), asyncHandler(async (request, response) => {
  const contractor = await Contractor.findOne({ referralCode: request.body.referralCode, onboardingStatus: 'approved' }).select('referralCode').lean();
  if (!contractor) throw new ApiError(422, 'REFERRAL_INVALID', 'This referral code is not valid or active. Check it or remove it to continue.');
  sendData(response, { valid: true, referralCode: contractor.referralCode });
}));

const submissionLimit = rateLimit({ windowMs: 60 * 60 * 1000, limit: 8, standardHeaders: true, legacyHeaders: false });
applicationRouter.post('/public/submit', submissionLimit, validate(submissionSchema), asyncHandler(async (request, response) => submitApplication(request, response)));
applicationRouter.post('/customer/submit', requireAuth, requireRole('customer'), requireCsrf, submissionLimit, validate(submissionSchema), asyncHandler(async (request, response) => submitApplication(request, response, true)));

async function submitApplication(request, response, isCustomerSubmission = false) {
  const input = { ...request.body }; delete input.website; const draftId = input.draftId; delete input.draftId;
  const service = await ensurePublishedService(input.service);
  const contractor = input.referralCode ? await Contractor.findOne({ referralCode: input.referralCode, onboardingStatus: 'approved' }).select('_id referralCode') : null;
  if (input.referralCode && !contractor) throw new ApiError(422, 'REFERRAL_INVALID', 'The referral code is not valid or active.');
  const customer = isCustomerSubmission ? await customerFor(request.user._id) : null;
  const existingDraft = draftId
    ? isCustomerSubmission
      ? await Application.findOne({ _id: draftId, customer: customer._id, status: 'draft', draftExpiresAt: { $gt: new Date() } })
      : await authenticatedDraft(draftId, request.get('x-resume-token'))
    : null;
  if (draftId && isCustomerSubmission && !existingDraft) throw new ApiError(404, 'CUSTOMER_DRAFT_NOT_FOUND', 'This account draft is unavailable or expired. Save it again before submitting.');

  const session = await mongoose.startSession(); let application;
  try {
    await session.withTransaction(async () => {
      const now = new Date(); const identifiers = { applicationId: await nextPublicId('application', session), leadId: await nextPublicId('lead', session) };
      const values = { ...input, ...identifiers, service: service._id, contractor: contractor?._id, referralCode: contractor?.referralCode, referralLockedAt: contractor ? now : undefined, consents: { ...input.consents, capturedAt: now, ip: request.ip, userAgent: request.get('user-agent') }, status: 'submitted', submittedAt: now, ...(customer ? { customer: customer._id, createdBy: request.user._id, updatedBy: request.user._id } : {}) };
      if (existingDraft) application = await Application.findOneAndUpdate({ _id: existingDraft._id, status: 'draft' }, { $set: values, $unset: { resumeTokenHash: 1, draftExpiresAt: 1, ...(!contractor ? { contractor: 1, referralCode: 1, referralLockedAt: 1 } : {}) } }, { new: true, session, runValidators: true });
      else [application] = await Application.create([values], { session });
      if (!application) throw new ApiError(409, 'DRAFT_ALREADY_SUBMITTED', 'This draft has already been submitted.');
      const actorRole = customer ? 'customer' : 'public_applicant';
      await ApplicationStatusHistory.create([{ application: application._id, changedBy: request.user?._id, newStatus: 'submitted', changedByRole: actorRole, publicNote: 'Your application was submitted to VFS Groups for an initial completeness review.', reason: customer ? 'Customer account application submission' : 'Public application submission' }], { session });
      await AuditLog.create([{ actor: request.user?._id, actorRoles: customer ? ['customer'] : [], action: customer ? 'application.customer.submitted' : 'application.public.submitted', resourceType: 'Application', resourceId: application._id, newValues: { status: 'submitted', referralCode: contractor?.referralCode }, ip: request.ip, userAgent: request.get('user-agent'), requestId: request.id }], { session });
    });
  } finally { await session.endSession(); }
  sendData(response, { applicationId: application.applicationId, leadId: application.leadId, status: application.status, submittedAt: application.submittedAt, acknowledgement: 'Your application has been received for an initial completeness review. This is not an approval or offer.' }, 201);
}

async function ensurePublishedService(id) { const service = await Service.findOne({ _id: id, status: 'published' }).select('_id'); if (!service) throw new ApiError(422, 'SERVICE_UNAVAILABLE', 'Choose an available service.'); return service; }
async function customerFor(userId) { const customer = await Customer.findOne({ user: userId }); if (!customer) throw new ApiError(409, 'CUSTOMER_PROFILE_MISSING', 'Your customer profile is unavailable. Please contact support.'); return customer; }
function draftExpiry() { return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); }
function draftSnapshot(draft) { return { draftId: draft.id, service: draft.service, personal: draft.personal, financial: draft.financial, serviceSpecific: draft.serviceSpecific, referralCode: draft.referralCode, consents: draft.consents, expiresAt: draft.draftExpiresAt }; }
function publicDocument(document, type) { return { _id: document._id, documentKey: type.key, label: type.label, originalName: document.originalName, mimeType: document.mimeType, size: document.size, status: document.status, rejectionReason: document.rejectionReason, createdAt: document.createdAt, verifiedAt: document.verifiedAt, ...(document.storage?.publicId ? { viewUrl: storageProvider.signedUrl(document.storage.publicId, { resourceType: document.storage.resourceType, expiresInSeconds: 300 }) } : {}) }; }
function documentRequirements(latestDocuments = new Map()) { return NRI_DOCUMENT_TYPES.map((type) => ({ key: type.key, label: type.label, category: type.category, document: latestDocuments.has(type.key) ? publicDocument(latestDocuments.get(type.key), type) : null })); }
function hash(value) { return createHash('sha256').update(String(value)).digest('hex'); }
function safeEqual(left, right) { const a = Buffer.from(left); const b = Buffer.from(right); return a.length === b.length && timingSafeEqual(a, b); }
function cleanObject(value) { if (Array.isArray(value)) return value.map(cleanObject); if (!value || typeof value !== 'object') return value; return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== '' && item !== null && item !== undefined && !(typeof item === 'number' && Number.isNaN(item))).map(([key, item]) => [key, cleanObject(item)])); }
async function authenticatedDraft(id, token) { if (!token) throw new ApiError(401, 'DRAFT_TOKEN_REQUIRED', 'The draft resume token is missing.'); const draft = await Application.findOne({ _id: id, status: 'draft', draftExpiresAt: { $gt: new Date() } }).select('+resumeTokenHash'); if (!draft || !safeEqual(draft.resumeTokenHash || '', hash(token))) throw new ApiError(404, 'DRAFT_NOT_FOUND', 'This saved draft is unavailable or expired.'); return draft; }
export { APPLICATION_STATUSES };
