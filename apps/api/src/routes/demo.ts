import type { FastifyInstance } from 'fastify';
import { prisma } from '@inbox-pilot/db';
import { inquiryQueue } from '../workers/queue.js';
import { broadcast } from '../ws/broadcaster.js';

const DEMO_EMAILS = [
  {
    id: 'demo-auto',
    label: 'High-confidence (auto-send)',
    fromEmail: 'alice@acmecorp.com',
    fromName: 'Alice Johnson',
    subject: 'Urgent quote needed — WIDGET-A bulk order',
    bodyText: `Hi,

We need to place an urgent order for 50 units of WIDGET-A and 10 units of SERVICE-PRO for our Q3 rollout.

Our project deadline is in 3 weeks. Can you confirm pricing and delivery timeline?

Thanks,
Alice Johnson
Procurement Manager, Acme Corp`,
  },
  {
    id: 'demo-hitl',
    label: 'Low-confidence (human review)',
    fromEmail: 'bob@startup.io',
    fromName: 'Bob Smith',
    subject: 'Need some stuff — maybe bulk?',
    bodyText: `Hey,

Not sure exactly what we need yet but looking at maybe getting some of your widgets or services.
Could be 5 units could be 500 depending on pricing. Also need to understand your enterprise pricing.

What can you do for us? We're a startup so budget is tight but we could scale quickly.

Bob`,
  },
];

export async function demoRoutes(app: FastifyInstance) {
  // GET /demo/emails — list available demo scenarios
  app.get('/demo/emails', async () => DEMO_EMAILS.map(({ id, label, subject }) => ({ id, label, subject })));

  // POST /demo/inject/:id — inject a demo email into the pipeline
  app.post<{ Params: { id: string } }>('/demo/inject/:id', async (req, reply) => {
    const scenario = DEMO_EMAILS.find((e) => e.id === req.params.id);
    if (!scenario) return reply.code(404).send({ error: 'Unknown demo scenario' });

    const messageId = `demo-${scenario.id}-${Date.now()}@inboxpilot`;

    const inquiry = await prisma.inquiry.create({
      data: {
        messageId,
        fromEmail: scenario.fromEmail,
        fromName: scenario.fromName,
        subject: scenario.subject,
        bodyText: scenario.bodyText,
        receivedAt: new Date(),
        status: 'PENDING',
      },
    });

    await prisma.activityLog.create({
      data: { inquiryId: inquiry.id, eventType: 'EMAIL_RECEIVED', payload: { fromEmail: scenario.fromEmail, demo: true } },
    });

    await inquiryQueue.add('process', { inquiryId: inquiry.id });

    broadcast({
      type: 'EMAIL_RECEIVED',
      payload: { id: inquiry.id, fromEmail: scenario.fromEmail, subject: scenario.subject, demo: true },
    });

    return { ok: true, inquiryId: inquiry.id, scenario: scenario.label };
  });

  // GET /demo/status/:inquiryId — poll status (for non-WS clients)
  app.get<{ Params: { inquiryId: string } }>('/demo/status/:inquiryId', async (req, reply) => {
    const inquiry = await prisma.inquiry.findUnique({
      where: { id: req.params.inquiryId },
      include: { agentRun: { include: { steps: { orderBy: { stepNumber: 'asc' } } } }, quote: true },
    });
    if (!inquiry) return reply.code(404).send({ error: 'Not found' });
    return inquiry;
  });
}
