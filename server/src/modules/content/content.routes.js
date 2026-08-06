import { mkdirSync } from 'node:fs';
import { unlink } from 'node:fs/promises';
import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { ADMIN_ROLES, requireAuth, requireRole } from '../../middleware/auth.js';
import { requireCsrf } from '../../middleware/csrf.js';
import { validate } from '../../middleware/validate.js';
import { AnalyticsEvent } from '../../models/AnalyticsEvent.js';
import { ContentPage } from '../../models/ContentPage.js';
import { Faq } from '../../models/Faq.js';
import { GalleryItem } from '../../models/GalleryItem.js';
import { SiteSettings } from '../../models/SiteSettings.js';
import { Testimonial } from '../../models/Testimonial.js';
import { storageProvider } from '../../providers/storage.js';
import { ApiError } from '../../utils/apiError.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { sendData } from '../../utils/apiResponse.js';

export const contentRouter = Router();
const uploadDirectory = '/tmp/vfs-groups-uploads';
mkdirSync(uploadDirectory, { recursive: true });
const imageMediaTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
const videoMediaTypes = new Set(['video/mp4', 'video/webm', 'video/quicktime']);
const upload = multer({ dest: uploadDirectory, limits: { fileSize: 60 * 1024 * 1024 }, fileFilter(_request, file, callback) { callback(null, imageMediaTypes.has(file.mimetype) || videoMediaTypes.has(file.mimetype)); } });
const status = z.enum(['draft', 'published', 'archived']);

contentRouter.get('/settings', asyncHandler(async (_request, response) => {
  const settings = await SiteSettings.findOneAndUpdate({ key: 'public' }, { $setOnInsert: { key: 'public' } }, { new: true, upsert: true, setDefaultsOnInsert: true }).lean();
  sendData(response, settings);
}));
contentRouter.get('/faqs', asyncHandler(async (request, response) => {
  const filter = { status: 'published' }; if (request.query.category) filter.category = request.query.category;
  sendData(response, await Faq.find(filter).sort({ category: 1, sortOrder: 1, createdAt: 1 }).lean());
}));
contentRouter.get('/gallery', asyncHandler(async (_request, response) => sendData(response, await GalleryItem.find({ status: 'published', consentConfirmed: true, websiteVisible: true }).sort({ sortOrder: 1, createdAt: -1 }).lean())));
contentRouter.get('/testimonials', asyncHandler(async (_request, response) => sendData(response, await Testimonial.find({ status: 'published', consentConfirmed: true, verifiedAt: { $exists: true } }).sort({ sortOrder: 1, createdAt: -1 }).lean())));
contentRouter.get('/pages/:slug', asyncHandler(async (request, response) => {
  const page = await ContentPage.findOne({ slug: request.params.slug, status: 'published' }).lean();
  if (!page) throw new ApiError(404, 'CONTENT_PAGE_NOT_FOUND', 'This page has not been published.');
  sendData(response, page);
}));

contentRouter.use('/admin', requireAuth, requireRole(...ADMIN_ROLES));
contentRouter.get('/admin/overview', asyncHandler(async (_request, response) => {
  const [settings, faqs, gallery, testimonials, pages] = await Promise.all([
    SiteSettings.findOne({ key: 'public' }).lean(), Faq.find().sort({ category: 1, sortOrder: 1 }).lean(),
    GalleryItem.find().sort({ sortOrder: 1, createdAt: -1 }).lean(), Testimonial.find().sort({ createdAt: -1 }).lean(), ContentPage.find().sort({ slug: 1 }).lean(),
  ]);
  sendData(response, { settings, faqs, gallery, testimonials, pages, storageProvider: storageProvider.name });
}));

const settingsSchema = z.object({
  contact: z.object({ phone: z.string().trim().max(30), phones: z.array(z.string().trim().max(30)).min(1).max(5).optional(), whatsapp: z.string().trim().max(30), email: z.string().trim().email().or(z.literal('')), addressLines: z.array(z.string().trim().max(150)).max(4), city: z.string().trim().max(80), state: z.string().trim().max(80), pinCode: z.string().trim().max(12), locationNote: z.string().trim().max(150).optional(), mapLatitude: z.string().trim().regex(/^-?\d{1,2}(\.\d+)?$/).optional(), mapLongitude: z.string().trim().regex(/^-?\d{1,3}(\.\d+)?$/).optional(), officeHours: z.string().trim().max(150) }),
  legal: z.object({ legalName: z.string().trim().min(2).max(150), registrationNumber: z.string().trim().max(100), gstNumber: z.string().trim().max(100), regulatoryDisclosure: z.string().trim().max(2000), providerRelationship: z.string().trim().min(20).max(2000) }),
  cashback: z.object({ enabled: z.boolean(), terms: z.string().trim().max(2000) }),
  social: z.object({ facebook: z.string().trim().url().or(z.literal('')), instagram: z.string().trim().url().or(z.literal('')), linkedin: z.string().trim().url().or(z.literal('')), youtube: z.string().trim().url().or(z.literal('')) }),
});
contentRouter.patch('/admin/settings', requireCsrf, validate(settingsSchema), asyncHandler(async (request, response) => sendData(response, await SiteSettings.findOneAndUpdate({ key: 'public' }, { $set: { ...request.body, updatedBy: request.user._id } }, { new: true, upsert: true, runValidators: true }))));

const faqSchema = z.object({ category: z.string().trim().min(2).max(80), question: z.string().trim().min(5).max(300), answer: z.string().trim().min(10).max(3000), status, sortOrder: z.coerce.number().int().min(0).max(10_000).default(0) });
contentRouter.post('/admin/faqs', requireCsrf, validate(faqSchema), asyncHandler(async (request, response) => sendData(response, await Faq.create({ ...request.body, updatedBy: request.user._id }), 201)));
contentRouter.patch('/admin/faqs/:id', requireCsrf, validate(faqSchema.partial()), asyncHandler(async (request, response) => { const item = await Faq.findByIdAndUpdate(request.params.id, { $set: { ...request.body, updatedBy: request.user._id } }, { new: true, runValidators: true }); if (!item) throw new ApiError(404, 'FAQ_NOT_FOUND', 'FAQ not found.'); sendData(response, item); }));

const galleryUpdateSchema = z.object({ title: z.string().trim().min(2).max(150), caption: z.string().trim().max(1000), altText: z.string().trim().min(3).max(300), category: z.string().trim().min(2).max(80), capturedAt: z.coerce.date().nullable(), status, consentConfirmed: z.boolean(), websiteVisible: z.boolean() }).partial();
const objectId = z.string().regex(/^[a-f\d]{24}$/i);
const galleryReorderSchema = z.object({ ids: z.array(objectId).min(1).max(500).refine((ids) => new Set(ids).size === ids.length, 'Gallery item IDs must be unique.') });
function galleryInternalTitle(file, isVideo) {
  const name = file.originalname.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 150);
  return name.length >= 2 ? name : isVideo ? 'Gallery video' : 'Gallery picture';
}
contentRouter.post('/admin/gallery', requireCsrf, upload.single('media'), asyncHandler(async (request, response) => {
  if (!request.file) throw new ApiError(422, 'MEDIA_REQUIRED', 'Choose a JPG, PNG, WebP, MP4, WebM, or MOV file. Images can be up to 8 MB and videos up to 60 MB.');
  const isVideo = videoMediaTypes.has(request.file.mimetype);
  if (!isVideo && request.file.size > 8 * 1024 * 1024) { await unlink(request.file.path).catch(() => {}); throw new ApiError(422, 'IMAGE_TOO_LARGE', 'Gallery images must be 8 MB or smaller.'); }
  let media;
  try { media = await storageProvider.upload(request.file.path, { folder: 'vfs-groups/gallery', sensitive: false }); }
  finally { await unlink(request.file.path).catch(() => {}); }
  media = { ...media, resourceType: isVideo ? 'video' : 'image' };
  let item;
  try {
    const lastItem = await GalleryItem.findOne().sort({ sortOrder: -1 }).select('sortOrder').lean();
    item = await GalleryItem.create({
      title: galleryInternalTitle(request.file, isVideo),
      caption: '',
      altText: isVideo ? 'VFS Groups gallery video' : 'VFS Groups gallery picture',
      category: 'Gallery',
      status: 'published',
      consentConfirmed: true,
      websiteVisible: true,
      media,
      sortOrder: (lastItem?.sortOrder ?? -1) + 1,
      updatedBy: request.user._id,
    });
  } catch (error) {
    if (media.publicId) await storageProvider.remove(media.publicId, media.resourceType, media.deliveryType || 'upload').catch(() => {});
    throw error;
  }
  sendData(response, item, 201);
}));
contentRouter.patch('/admin/gallery/reorder', requireCsrf, validate(galleryReorderSchema), asyncHandler(async (request, response) => {
  const [matching, total] = await Promise.all([GalleryItem.countDocuments({ _id: { $in: request.body.ids } }), GalleryItem.countDocuments()]);
  if (matching !== request.body.ids.length || total !== request.body.ids.length) throw new ApiError(422, 'GALLERY_ORDER_INVALID', 'The gallery changed since this page loaded. Refresh and try again.');
  await GalleryItem.bulkWrite(request.body.ids.map((id, sortOrder) => ({ updateOne: { filter: { _id: id }, update: { $set: { sortOrder, updatedBy: request.user._id } } } })));
  sendData(response, await GalleryItem.find().sort({ sortOrder: 1, createdAt: -1 }).lean());
}));
contentRouter.patch('/admin/gallery/:id', requireCsrf, validate(galleryUpdateSchema), asyncHandler(async (request, response) => {
  const existing = await GalleryItem.findById(request.params.id);
  if (!existing) throw new ApiError(404, 'GALLERY_ITEM_NOT_FOUND', 'Gallery item not found.');
  const nextStatus = request.body.status ?? existing.status;
  const nextConsent = request.body.consentConfirmed ?? existing.consentConfirmed;
  if (nextStatus === 'published' && !nextConsent) throw new ApiError(422, 'GALLERY_CONSENT_REQUIRED', 'Confirm publication permission before publishing this media.');
  existing.set({ ...request.body, updatedBy: request.user._id });
  await existing.save();
  sendData(response, existing);
}));
contentRouter.delete('/admin/gallery/:id', requireCsrf, asyncHandler(async (request, response) => {
  const item = await GalleryItem.findById(request.params.id);
  if (!item) throw new ApiError(404, 'GALLERY_ITEM_NOT_FOUND', 'Gallery item not found.');
  if (item.media?.publicId) await storageProvider.remove(item.media.publicId, item.media.resourceType || 'image', item.media.deliveryType || 'upload');
  await item.deleteOne();
  sendData(response, { id: request.params.id, deleted: true });
}));

const testimonialSchema = z.object({ customerName: z.string().trim().min(2).max(100), customerLabel: z.string().trim().max(100).default(''), serviceName: z.string().trim().max(150).default(''), quote: z.string().trim().min(20).max(1500), consentConfirmed: z.literal(true), status, sortOrder: z.coerce.number().int().min(0).max(10_000).default(0) });
contentRouter.post('/admin/testimonials', requireCsrf, validate(testimonialSchema), asyncHandler(async (request, response) => sendData(response, await Testimonial.create({ ...request.body, verifiedAt: new Date(), updatedBy: request.user._id }), 201)));
contentRouter.patch('/admin/testimonials/:id', requireCsrf, validate(testimonialSchema.partial()), asyncHandler(async (request, response) => { const values = { ...request.body, updatedBy: request.user._id }; if (request.body.consentConfirmed) values.verifiedAt = new Date(); const item = await Testimonial.findByIdAndUpdate(request.params.id, { $set: values }, { new: true, runValidators: true }); if (!item) throw new ApiError(404, 'TESTIMONIAL_NOT_FOUND', 'Testimonial not found.'); sendData(response, item); }));

const sectionSchema = z.object({ heading: z.string().trim().min(2).max(200), body: z.string().trim().max(5000).default(''), bullets: z.array(z.string().trim().min(2).max(500)).max(20).default([]) });
const pageSchema = z.object({ eyebrow: z.string().trim().min(2).max(100), title: z.string().trim().min(3).max(250), summary: z.string().trim().min(10).max(2000), sections: z.array(sectionSchema).max(30), status, seo: z.object({ title: z.string().trim().min(3).max(180), description: z.string().trim().min(10).max(300) }) });
contentRouter.put('/admin/pages/:slug', requireCsrf, validate(pageSchema), asyncHandler(async (request, response) => sendData(response, await ContentPage.findOneAndUpdate({ slug: request.params.slug }, { $set: { ...request.body, reviewedAt: new Date(), updatedBy: request.user._id } }, { new: true, upsert: true, runValidators: true }))));

contentRouter.get('/admin/analytics/summary', asyncHandler(async (_request, response) => {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [totalEvents, byType, topPaths] = await Promise.all([
    AnalyticsEvent.countDocuments({ createdAt: { $gte: since } }),
    AnalyticsEvent.aggregate([{ $match: { createdAt: { $gte: since } } }, { $group: { _id: '$eventType', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
    AnalyticsEvent.aggregate([{ $match: { createdAt: { $gte: since }, eventType: 'page_view' } }, { $group: { _id: '$path', views: { $sum: 1 } } }, { $sort: { views: -1 } }, { $limit: 10 }]),
  ]);
  sendData(response, { periodDays: 30, totalEvents, byType, topPaths });
}));
