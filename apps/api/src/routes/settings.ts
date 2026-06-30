import type { FastifyInstance } from 'fastify';
import { prisma } from '@inbox-pilot/db';
import { config } from '../config.js';

// Keys that can be updated via the API
const MUTABLE_KEYS = ['confidenceThreshold', 'followupDelayDays', 'followupMaxCount'] as const;
type MutableKey = (typeof MUTABLE_KEYS)[number];

const DEFAULTS: Record<MutableKey, number> = {
  confidenceThreshold: config.CONFIDENCE_THRESHOLD,
  followupDelayDays: config.FOLLOWUP_DELAY_DAYS,
  followupMaxCount: config.FOLLOWUP_MAX_COUNT,
};

const BOUNDS: Record<MutableKey, { min: number; max: number }> = {
  confidenceThreshold: { min: 0, max: 1 },
  followupDelayDays:   { min: 1, max: 30 },
  followupMaxCount:    { min: 0, max: 5 },
};

async function readMutableSettings(): Promise<Record<MutableKey, number>> {
  const rows = await prisma.setting.findMany({ where: { key: { in: [...MUTABLE_KEYS] } } });
  const stored = Object.fromEntries(rows.map((r: { key: string; value: string }) => [r.key, Number(r.value)])) as Partial<Record<MutableKey, number>>;
  return {
    confidenceThreshold: stored.confidenceThreshold ?? DEFAULTS.confidenceThreshold,
    followupDelayDays:   stored.followupDelayDays   ?? DEFAULTS.followupDelayDays,
    followupMaxCount:    stored.followupMaxCount     ?? DEFAULTS.followupMaxCount,
  };
}

/** Called by the inquiry worker so it always uses the live DB value. */
export async function getConfidenceThreshold(): Promise<number> {
  const row = await prisma.setting.findUnique({ where: { key: 'confidenceThreshold' } });
  return row ? Number(row.value) : config.CONFIDENCE_THRESHOLD;
}

export async function settingsRoutes(app: FastifyInstance) {
  app.get('/settings', async () => {
    const mutable = await readMutableSettings();
    return {
      ...mutable,
      // read-only display values
      imapConfigured: Boolean(config.IMAP_HOST && config.IMAP_USER),
      imapHost:       config.IMAP_HOST  ?? null,
      imapUser:       config.IMAP_USER  ?? null,
      fromEmail:      config.FROM_EMAIL,
      mcpServerUrl:   config.MCP_SERVER_URL,
      qwenBaseUrl:    config.QWEN_BASE_URL,
    };
  });

  app.patch<{ Body: Partial<Record<MutableKey, number>> }>('/settings', async (req, reply) => {
    const updates: Array<{ key: string; value: string; updatedAt: Date }> = [];

    for (const key of MUTABLE_KEYS) {
      const raw = req.body[key];
      if (raw == null) continue;

      const { min, max } = BOUNDS[key];
      if (raw < min || raw > max) {
        return reply.code(400).send({ error: `${key} must be between ${min} and ${max}` });
      }
      updates.push({ key, value: String(raw), updatedAt: new Date() });
    }

    if (updates.length === 0) return reply.code(400).send({ error: 'No valid fields provided' });

    await prisma.$transaction(
      updates.map((u) =>
        prisma.setting.upsert({
          where:  { key: u.key },
          update: { value: u.value, updatedAt: u.updatedAt },
          create: { key: u.key, value: u.value, updatedAt: u.updatedAt },
        }),
      ),
    );

    return { ok: true, settings: await readMutableSettings() };
  });
}
