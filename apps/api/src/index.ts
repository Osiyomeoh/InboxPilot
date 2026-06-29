import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import { config } from './config.js';
import { webhookRoutes } from './routes/webhooks.js';
import { inquiryRoutes } from './routes/inquiries.js';
import { quoteRoutes } from './routes/quotes.js';
import { activityRoutes } from './routes/activity.js';
import { registerClient } from './ws/broadcaster.js';
import { startInquiryWorker } from './workers/inquiry.worker.js';
import { startFollowupWorker } from './workers/followup.worker.js';
import { startImapPolling } from './email/imap.js';

const app = Fastify({ logger: { level: 'info' } });

await app.register(cors, {
  origin: process.env.NEXTAUTH_URL ?? 'http://localhost:3000',
  credentials: true,
});

await app.register(websocket);

// WebSocket endpoint for live dashboard feed
app.get('/ws', { websocket: true }, (socket) => {
  registerClient(socket);
  socket.send(JSON.stringify({ type: 'CONNECTED', payload: { ts: Date.now() } }));
});

// REST routes
await app.register(webhookRoutes);
await app.register(inquiryRoutes);
await app.register(quoteRoutes);
await app.register(activityRoutes);

app.get('/health', async () => ({ ok: true, ts: Date.now() }));

// Start background workers
startInquiryWorker();
startFollowupWorker();
startImapPolling();

await app.listen({ port: config.PORT, host: '0.0.0.0' });
console.log(`API server listening on port ${config.PORT}`);
