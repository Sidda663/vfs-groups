import { createApp } from './app.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { env } from './config/env.js';

async function start() {
  await connectDatabase();
  const app = createApp();
  const server = app.listen(env.PORT, () => console.info(JSON.stringify({ level: 'info', message: 'VFS Groups API listening', port: env.PORT, environment: env.NODE_ENV })));
  server.on('error', (error) => {
    const message = error.code === 'EADDRINUSE' ? `Port ${env.PORT} is already in use. Stop the other server instance or configure a different PORT.` : error.message;
    console.error(JSON.stringify({ level: 'fatal', message, code: error.code }));
    process.exit(1);
  });
  const shutdown = (signal) => { console.info(JSON.stringify({ level: 'info', message: 'Shutting down', signal })); server.close(async () => { await disconnectDatabase(); process.exit(0); }); setTimeout(() => process.exit(1), 10000).unref(); };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

start().catch((error) => { console.error(JSON.stringify({ level: 'fatal', message: error.message })); process.exit(1); });
