import type { FastifyInstance } from 'fastify';
import { prisma } from '@inbox-pilot/db';
import { createReadStream, existsSync } from 'fs';

export async function quoteRoutes(app: FastifyInstance) {
  app.get<{ Params: { id: string } }>('/quotes/:id/pdf', async (req, reply) => {
    const quote = await prisma.quote.findUnique({ where: { id: req.params.id } });
    if (!quote) return reply.code(404).send({ error: 'Not found' });
    if (!quote.pdfPath || !existsSync(quote.pdfPath)) {
      return reply.code(404).send({ error: 'PDF not generated yet' });
    }
    reply.header('Content-Type', 'application/pdf');
    return reply.send(createReadStream(quote.pdfPath));
  });
}
