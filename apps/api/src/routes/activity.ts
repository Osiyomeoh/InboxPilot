import type { FastifyInstance } from 'fastify';
import { prisma } from '@inbox-pilot/db';

export async function activityRoutes(app: FastifyInstance) {
  // GET /activity/stats — aggregate metrics for the activity page stat cards
  app.get('/activity/stats', async () => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [totalToday, sentToday, failedToday, escalatedToday, avgMs] = await Promise.all([
      prisma.inquiry.count({ where: { createdAt: { gte: todayStart } } }),
      prisma.inquiry.count({ where: { createdAt: { gte: todayStart }, status: 'SENT' } }),
      prisma.inquiry.count({ where: { createdAt: { gte: todayStart }, status: 'FAILED' } }),
      prisma.inquiry.count({
        where: { createdAt: { gte: todayStart }, status: { in: ['AWAITING_APPROVAL', 'ESCALATED'] } },
      }),
      // Average time from inquiry received → quote sent (only for auto-sent ones)
      prisma.$queryRaw<{ avg_ms: number | null }[]>`
        SELECT AVG(EXTRACT(EPOCH FROM (q."sentAt" - i."receivedAt")) * 1000)::float AS avg_ms
        FROM "Inquiry" i
        JOIN "Quote" q ON q."inquiryId" = i.id
        WHERE q."sentAt" IS NOT NULL
          AND i."createdAt" >= ${todayStart}
      `,
    ]);

    const resolved = totalToday - (failedToday + escalatedToday);
    const successRate = resolved > 0 ? Math.round((sentToday / resolved) * 100) : null;
    const avgResponseMs = avgMs[0]?.avg_ms ?? null;
    const avgResponseSec = avgResponseMs != null ? Math.round(avgResponseMs / 1000) : null;

    return {
      totalToday,
      sentToday,
      escalatedToday,
      successRate,
      avgResponseSec,
    };
  });

  app.get('/activity', async (req, reply) => {
    const query = req.query as { limit?: string; offset?: string; format?: string };
    const limit = Number(query.limit ?? 100);
    const offset = Number(query.offset ?? 0);

    const logs = await prisma.activityLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    if (query.format === 'csv') {
      const rows = [
        'id,inquiryId,eventType,createdAt,payload',
        ...logs.map((l: { id: string; inquiryId: string | null; eventType: string; createdAt: Date; payload: unknown }) =>
          [l.id, l.inquiryId ?? '', l.eventType, l.createdAt.toISOString(), JSON.stringify(l.payload ?? {})].join(','),
        ),
      ].join('\n');
      reply.header('Content-Type', 'text/csv');
      reply.header('Content-Disposition', 'attachment; filename="activity.csv"');
      return reply.send(rows);
    }

    return { logs, total: await prisma.activityLog.count() };
  });
}
