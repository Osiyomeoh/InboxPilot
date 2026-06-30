import type { FastifyInstance } from 'fastify';
import { config } from '../config.js';

// Runtime-mutable settings (stored in memory; restart resets to env defaults).
// For production, persist these to a DB settings table. For the hackathon demo
// this in-memory store is sufficient and zero-dependency.
const runtimeSettings = {
  confidenceThreshold: config.CONFIDENCE_THRESHOLD,
  followupDelayDays: config.FOLLOWUP_DELAY_DAYS,
  followupMaxCount: config.FOLLOWUP_MAX_COUNT,
};

export function getRuntimeSettings() {
  return runtimeSettings;
}

export async function settingsRoutes(app: FastifyInstance) {
  app.get('/settings', async () => ({
    confidenceThreshold: runtimeSettings.confidenceThreshold,
    followupDelayDays: runtimeSettings.followupDelayDays,
    followupMaxCount: runtimeSettings.followupMaxCount,
    // read-only config (display only)
    imapConfigured: Boolean(config.IMAP_HOST && config.IMAP_USER),
    imapHost: config.IMAP_HOST ?? null,
    imapUser: config.IMAP_USER ?? null,
    fromEmail: config.FROM_EMAIL,
    mcpServerUrl: config.MCP_SERVER_URL,
    qwenBaseUrl: config.QWEN_BASE_URL,
  }));

  app.patch<{ Body: { confidenceThreshold?: number; followupDelayDays?: number; followupMaxCount?: number } }>(
    '/settings',
    async (req, reply) => {
      const { confidenceThreshold, followupDelayDays, followupMaxCount } = req.body;

      if (confidenceThreshold != null) {
        if (confidenceThreshold < 0 || confidenceThreshold > 1) {
          return reply.code(400).send({ error: 'confidenceThreshold must be between 0 and 1' });
        }
        runtimeSettings.confidenceThreshold = confidenceThreshold;
        process.env.CONFIDENCE_THRESHOLD = String(confidenceThreshold);
      }
      if (followupDelayDays != null) {
        if (followupDelayDays < 1 || followupDelayDays > 30) {
          return reply.code(400).send({ error: 'followupDelayDays must be 1–30' });
        }
        runtimeSettings.followupDelayDays = followupDelayDays;
      }
      if (followupMaxCount != null) {
        if (followupMaxCount < 0 || followupMaxCount > 5) {
          return reply.code(400).send({ error: 'followupMaxCount must be 0–5' });
        }
        runtimeSettings.followupMaxCount = followupMaxCount;
      }

      return { ok: true, settings: runtimeSettings };
    },
  );
}
