import type { FastifyInstance } from 'fastify';
import { prisma } from '@inbox-pilot/db';
import { broadcast } from '../ws/broadcaster.js';
import { sendEmail } from '../email/sender.js';

export async function inquiryRoutes(app: FastifyInstance) {
  app.get('/inquiries', async (req) => {
    const query = req.query as { status?: string; limit?: string; offset?: string };
    const where = query.status ? { status: query.status as never } : {};

    const [items, total] = await Promise.all([
      prisma.inquiry.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: Number(query.limit ?? 50),
        skip: Number(query.offset ?? 0),
        include: { agentRun: { include: { steps: true } }, quote: true },
      }),
      prisma.inquiry.count({ where }),
    ]);

    return { items, total };
  });

  app.get<{ Params: { id: string } }>('/inquiries/:id', async (req, reply) => {
    const inquiry = await prisma.inquiry.findUnique({
      where: { id: req.params.id },
      include: { agentRun: { include: { steps: true } }, quote: true, followUps: true },
    });
    if (!inquiry) return reply.code(404).send({ error: 'Not found' });
    return inquiry;
  });

  // HITL approve
  app.patch<{ Params: { id: string }; Body: { action: 'approve' | 'reject'; editedQuote?: object } }>(
    '/inquiries/:id/action',
    async (req, reply) => {
      const { id } = req.params;
      const { action, editedQuote } = req.body;

      const inquiry = await prisma.inquiry.findUnique({ where: { id }, include: { quote: true } });
      if (!inquiry) return reply.code(404).send({ error: 'Not found' });

      if (action === 'approve') {
        await prisma.inquiry.update({ where: { id }, data: { status: 'SENT' } });

        if (inquiry.quote) {
          if (editedQuote) {
            await prisma.quote.update({ where: { id: inquiry.quote.id }, data: { ...(editedQuote as object), status: 'APPROVED' } });
          } else {
            await prisma.quote.update({
              where: { id: inquiry.quote.id },
              data: { status: 'APPROVED', approvedAt: new Date(), sentAt: new Date() },
            });
          }

          const coverEmail = inquiry.quote.coverEmail ?? 'Please find attached your requested quote.';
          await sendEmail({ to: inquiry.fromEmail, subject: `Re: ${inquiry.subject}`, body: coverEmail });
          await prisma.quote.update({ where: { id: inquiry.quote.id }, data: { status: 'SENT', sentAt: new Date() } });
        }

        await prisma.activityLog.create({ data: { inquiryId: id, eventType: 'HUMAN_APPROVED', payload: {} } });
        broadcast({ type: 'INQUIRY_APPROVED', payload: { id } });
      } else {
        await prisma.inquiry.update({ where: { id }, data: { status: 'FAILED' } });
        if (inquiry.quote) {
          await prisma.quote.update({ where: { id: inquiry.quote.id }, data: { status: 'REJECTED' } });
        }
        await prisma.activityLog.create({ data: { inquiryId: id, eventType: 'HUMAN_REJECTED', payload: {} } });
        broadcast({ type: 'INQUIRY_REJECTED', payload: { id } });
      }

      return { ok: true };
    },
  );
}
