import mongoose from 'mongoose';
import { env } from './env.js';

export async function connectDatabase(uri = env.MONGODB_URI) {
  if (!uri) throw new Error('MONGODB_URI is required. Add an Atlas or local MongoDB connection string to server/.env.');
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri, { autoIndex: env.NODE_ENV !== 'production' });
  return mongoose.connection;
}

export async function disconnectDatabase() {
  await mongoose.disconnect();
}
