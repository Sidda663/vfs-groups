import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import mongoose from 'mongoose';
import morgan from 'morgan';
import { env, isAllowedOrigin } from './config/env.js';
import { ApiError } from './utils/apiError.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import { requestContext } from './middleware/requestContext.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { applicationRouter } from './modules/applications/application.routes.js';
import { contactRouter } from './modules/contact/contact.routes.js';
import { chatRouter } from './modules/chat/chat.routes.js';
import { dashboardRouter } from './modules/dashboard/dashboard.routes.js';
import { loanReferralRouter } from './modules/loanReferrals/loanReferral.routes.js';
import { serviceRouter } from './modules/services/service.routes.js';
import { toolRouter } from './modules/services/tool.routes.js';
import { contentRouter } from './modules/content/content.routes.js';
import { analyticsRouter } from './modules/analytics/analytics.routes.js';
import { legalServiceRouter } from './modules/legalServices/legalService.routes.js';
import { paymentRouter } from './modules/payments/payment.routes.js';

export function createApp() {
  const app = express();
  app.set('trust proxy', 1);
  app.use(requestContext);
  app.use(helmet({ contentSecurityPolicy: env.NODE_ENV === 'production' }));
  app.use(cors({ origin(origin, callback) { if (isAllowedOrigin(origin)) callback(null, true); else callback(new ApiError(403, 'ORIGIN_NOT_ALLOWED', 'This website is not allowed to access the API.')); }, credentials: true }));
  app.use(express.json({ limit: '1mb', verify(request, _response, buffer) {
    if (request.originalUrl === '/api/v1/payments/razorpay/webhook') request.rawBody = Buffer.from(buffer);
  } }));
  app.use(express.urlencoded({ extended: false, limit: '1mb' }));
  app.use(cookieParser(env.COOKIE_SECRET));
  app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
  app.use('/api/v1', rateLimit({ windowMs: 15 * 60 * 1000, limit: 500, standardHeaders: true, legacyHeaders: false }));

  app.get('/api/v1/health', (_request, response) => sendHealth(response, false));
  app.get('/api/v1/ready', (_request, response) => sendHealth(response, true));
  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/applications', applicationRouter);
  app.use('/api/v1/services', serviceRouter);
  app.use('/api/v1/tools', toolRouter);
  app.use('/api/v1/contact', contactRouter);
  app.use('/api/v1/chat', chatRouter);
  app.use('/api/v1/dashboard', dashboardRouter);
  app.use('/api/v1/loan-referrals', loanReferralRouter);
  app.use('/api/v1/content', contentRouter);
  app.use('/api/v1/analytics', analyticsRouter);
  app.use('/api/v1/legal-services', legalServiceRouter);
  app.use('/api/v1/payments', paymentRouter);
  app.use(notFound);
  app.use(errorHandler);
  return app;
}

function sendHealth(response, requireDatabase) {
  const database = ['disconnected', 'connected', 'connecting', 'disconnecting'][mongoose.connection.readyState] || 'unknown';
  const ready = database === 'connected';
  response.status(requireDatabase && !ready ? 503 : 200).json({ success: true, data: { service: 'vfs-groups-api', status: requireDatabase ? (ready ? 'ready' : 'not_ready') : 'ok', database, timestamp: new Date().toISOString() } });
}
