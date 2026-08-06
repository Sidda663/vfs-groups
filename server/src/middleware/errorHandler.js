import mongoose from 'mongoose';
import { env } from '../config/env.js';

export function notFound(request, response) {
  response.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'The requested resource was not found.', requestId: request.id } });
}

export function errorHandler(error, request, response, _next) {
  let status = error.status || 500;
  let code = error.code || 'INTERNAL_ERROR';
  let message = error.message || 'An unexpected error occurred.';
  let fields = error.fields;

  if (error instanceof mongoose.Error.CastError) { status = 404; code = 'RESOURCE_NOT_FOUND'; message = 'The requested resource was not found.'; }
  if (error?.code === 11000) { status = 409; code = 'DUPLICATE_VALUE'; message = 'A record with this value already exists.'; fields = error.keyValue; }

  if (status >= 500) {
    console.error(JSON.stringify({ level: 'error', requestId: request.id, method: request.method, path: request.path, message: error.message, stack: env.NODE_ENV === 'development' ? error.stack : undefined }));
    message = 'The service could not complete this request.';
  }

  response.status(status).json({ success: false, error: { code, message, ...(fields ? { fields } : {}), requestId: request.id } });
}
