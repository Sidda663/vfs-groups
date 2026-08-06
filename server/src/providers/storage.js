import { randomUUID } from 'node:crypto';
import { v2 as cloudinary } from 'cloudinary';
import { env } from '../config/env.js';

function mockStorage() {
  return {
    name: 'mock-storage',
    async upload(_path, options = {}) { return { provider: 'mock-storage', publicId: `mock/${randomUUID()}`, version: 1, resourceType: 'raw', deliveryType: options.sensitive === false ? 'upload' : 'authenticated', bytes: 0, url: '', mock: true }; },
    async remove() { return { removed: true, mock: true }; },
    signedUrl(publicId) { return `mock-storage://${encodeURIComponent(publicId)}`; },
  };
}

function cloudinaryStorage() {
  cloudinary.config({ cloud_name: env.CLOUDINARY_CLOUD_NAME, api_key: env.CLOUDINARY_API_KEY, api_secret: env.CLOUDINARY_API_SECRET, secure: true });
  return {
    name: 'cloudinary',
    async upload(path, options = {}) {
      const result = await cloudinary.uploader.upload(path, { resource_type: 'auto', type: options.sensitive === false ? 'upload' : 'authenticated', folder: options.folder || 'vfs-groups', use_filename: false, unique_filename: true, overwrite: false });
      return { provider: 'cloudinary', publicId: result.public_id, version: result.version, resourceType: result.resource_type, deliveryType: result.type, format: result.format, bytes: result.bytes, width: result.width, height: result.height, url: result.secure_url };
    },
    async remove(publicId, resourceType = 'image', deliveryType = 'upload') { return cloudinary.uploader.destroy(publicId, { resource_type: resourceType, invalidate: true, type: deliveryType }); },
    signedUrl(publicId, options = {}) { return cloudinary.url(publicId, { type: 'authenticated', sign_url: true, secure: true, resource_type: options.resourceType || 'image', expires_at: Math.floor(Date.now() / 1000) + Math.min(options.expiresInSeconds || 300, 900) }); },
  };
}

const cloudinaryReady = env.NODE_ENV !== 'test' && env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET;
export const storageProvider = cloudinaryReady ? cloudinaryStorage() : mockStorage();
