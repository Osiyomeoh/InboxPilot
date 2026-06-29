import type { FastifyInstance } from 'fastify';
import { prisma } from '@inbox-pilot/db';

export async function activityRoutes(app: FastifyInstance) {
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
        ...logs.map((l) =>
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
