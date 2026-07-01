import type { FastifyInstance } from 'fastify';
import { parseMime } from '../email/mime-parser.js';
import { isDedup } from '../email/dedup.js';
import { inquiryQueue } from '../workers/queue.js';
import { prisma } from '@inbox-pilot/db';
import { broadcast } from '../ws/broadcaster.js';

export async function webhookRoutes(app: FastifyInstance) {
  // Resend inbound webhook — POST /webhooks/email
  app.post('/webhooks/email', async (req, reply) => {
    const body = req.body as Record<string, unknown>;

    // Support both Resend inbound format and direct JSON (for testing)
    let email;
    if (body.raw) {
      email = await parseMime(Buffer.from(body.raw as string, 'base64'));
    } else {
      email = {
        messageId: `webhook-${Date.now()}@inboxpilot`,
        fromEmail: (body.from as string) ?? 'unknown@test.com',
        fromName: (body.fromName as string) ?? undefined,
        subject: (body.subject as string) ?? '(no subject)',
        bodyText: (body.text as string) ?? '',
        bodyHtml: (body.html as string) ?? undefined,
        receivedAt: new Date(),
      };
    }

    if (await isDedup(email.messageId)) {
      return reply.code(200).send({ ok: true, dedup: true });
    }

    const inquiry = await prisma.inquiry.create({ data: email });
    await inquiryQueue.add('process', { inquiryId: inquiry.id }, { jobId: inquiry.id, removeOnComplete: true, removeOnFail: true });
    await prisma.activityLog.create({
      data: { inquiryId: inquiry.id, eventType: 'EMAIL_RECEIVED', payload: { fromEmail: email.fromEmail } },
    });
    broadcast({ type: 'EMAIL_RECEIVED', payload: { id: inquiry.id, fromEmail: email.fromEmail, subject: email.subject } });

    return { ok: true, inquiryId: inquiry.id };
  });
}
